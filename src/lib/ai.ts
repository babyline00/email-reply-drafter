/**
 * Pluggable AI provider + high-level draft/rewrite orchestration.
 *
 * The MVP uses a NON-streaming `complete()` call for each variation — we want
 * the full draft text back in one shot so we can persist it atomically and so
 * the UI can render all three cards at once. (Streaming across three parallel
 * cards is a nice-to-have stretch goal.)
 *
 * `ChatProvider` is intentionally minimal so the AI layer is pluggable:
 * `ZaiProvider` uses the z-ai-web-dev-sdk; `MockProvider` returns a
 * deterministic echo so the app (and the test suite) works fully offline.
 */

import type { LengthSpec } from './length-variations'
import { getLengthSpecs } from './length-variations'
import type { ToneProfileInput } from './tone-builder'
import { buildTonePromptAddon } from './tone-builder'
import { buildDraftPrompt, type EmailInput } from './draft-builder'
import { buildRewritePrompt } from './rewrite-builder'

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface ChatProvider {
  /** Returns the full completion text (non-streaming). */
  complete(args: { systemPrompt: string; messages: ChatMessage[] }): Promise<string>
}

export interface DraftVariation {
  length: 'short' | 'medium' | 'detailed'
  content: string
}

let cachedProvider: ChatProvider | null = null

class ZaiProvider implements ChatProvider {
  async complete(args: {
    systemPrompt: string
    messages: ChatMessage[]
  }): Promise<string> {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    const messages: ChatMessage[] = [
      { role: 'system', content: args.systemPrompt },
      ...args.messages,
    ]
    const completion = await zai.chat.completions.create({
      messages,
      thinking: { type: 'disabled' },
    } as any)

    if (typeof completion === 'string') return completion
    const content = (completion as any)?.choices?.[0]?.message?.content
    if (typeof content === 'string') return content
    // Some SDK shapes wrap text in a ReadableStream even without stream:true —
    // read it fully as a fallback.
    const body = (completion as any)?.body ?? (completion as any)?._body
    if (body && typeof body.getReader === 'function') {
      const reader = body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        acc += decoder.decode(value, { stream: true })
      }
      return acc
    }
    return ''
  }
}

class MockProvider implements ChatProvider {
  async complete(args: {
    systemPrompt: string
    messages: ChatMessage[]
  }): Promise<string> {
    // Deterministic mock that echoes the last user message so each length
    // variation (which has a distinct user prompt) produces a distinct draft.
    const lastUser = [...args.messages].reverse().find((m) => m.role === 'user')
    const text = lastUser?.content ?? ''
    return `[mock draft] ${text.slice(0, 140)}`
  }
}

export function getChatProvider(): ChatProvider {
  if (cachedProvider) return cachedProvider
  if (process.env.PKC_DISABLE_LLM === '1') {
    cachedProvider = new MockProvider()
    return cachedProvider
  }
  try {
    cachedProvider = new ZaiProvider()
  } catch (e) {
    console.warn('[ai] ZaiProvider unavailable, using MockProvider:', (e as Error).message)
    cachedProvider = new MockProvider()
  }
  return cachedProvider
}

/** Test-only: inject (or clear) a provider. */
export function __setChatProviderForTest(p: ChatProvider | null) {
  cachedProvider = p
}

/**
 * Generate the three length variations for an inbound email, each via an
 * independent non-streaming LLM call. Returns them in canonical order
 * (short, medium, detailed).
 */
export async function generateDraftVariations(
  email: EmailInput,
  tone: ToneProfileInput,
  provider?: ChatProvider,
): Promise<DraftVariation[]> {
  const p = provider ?? getChatProvider()
  const specs: LengthSpec[] = getLengthSpecs()
  const out: DraftVariation[] = []
  for (const spec of specs) {
    const { system, user } = buildDraftPrompt(email, tone, spec)
    const content = await p.complete({
      systemPrompt: system,
      messages: [{ role: 'user', content: user }],
    })
    out.push({ length: spec.length, content: content.trim() })
  }
  return out
}

/**
 * Rewrite a single variation given optional free-text feedback. The LLM gets
 * the previous draft + feedback + the original email context (and, if
 * provided, the tone addon so the rewrite stays on-voice).
 */
export async function rewriteDraft(
  prevDraft: string,
  feedback: string,
  originalEmail: EmailInput,
  tone?: ToneProfileInput,
  provider?: ChatProvider,
): Promise<string> {
  const p = provider ?? getChatProvider()
  const toneAddon = tone ? buildTonePromptAddon(tone) : undefined
  const { system, user } = buildRewritePrompt({
    prevDraft,
    feedback,
    originalEmail,
    toneAddon,
  })
  const content = await p.complete({
    systemPrompt: system,
    messages: [{ role: 'user', content: user }],
  })
  return content.trim()
}
