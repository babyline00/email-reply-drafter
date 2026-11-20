import { test, expect, describe } from 'bun:test'
import {
  generateDraftVariations,
  rewriteDraft,
  __setChatProviderForTest,
  type ChatProvider,
} from '../ai'
import type { ToneProfileInput } from '../tone-builder'
import type { EmailInput } from '../draft-builder'

const tone: ToneProfileInput = {
  name: 'Default',
  styleDescription: 'friendly-professional',
  sentenceLength: 'medium',
  useEmoji: false,
  signOff: 'Best, [my name]',
}

const email: EmailInput = {
  subject: 'Re: Q3 roadmap review',
  body: 'Can we move the review to Thursday?',
  senderName: 'Sam Lee',
  threadContext: '',
}

/**
 * Deterministic mock provider: echoes the last user message so each length
 * variation (distinct user prompt) produces a distinct draft.
 */
class MockChatProvider implements ChatProvider {
  calls = 0
  async complete(args: { systemPrompt: string; messages: { role: string; content: string }[] }) {
    this.calls += 1
    const lastUser = [...args.messages].reverse().find((m) => m.role === 'user')
    const text = lastUser?.content ?? ''
    // Return the full user prompt so the rewrite echo test can observe the
    // feedback string (which sits later in the prompt than the first 60 chars).
    return `[mock draft #${this.calls}] ${text}`
  }
}

describe('MockChatProvider (ai layer)', () => {
  test('complete returns deterministic content', async () => {
    const provider = new MockChatProvider()
    const out = await provider.complete({
      systemPrompt: 'sys',
      messages: [{ role: 'user', content: 'hello world' }],
    })
    expect(out).toBe('[mock draft #1] hello world')
  })
})

describe('generateDraftVariations', () => {
  test('returns exactly three variations', async () => {
    const provider = new MockChatProvider()
    const variations = await generateDraftVariations(email, tone, provider)
    expect(variations).toHaveLength(3)
  })

  test('returns variations in short / medium / detailed order', async () => {
    const provider = new MockChatProvider()
    const variations = await generateDraftVariations(email, tone, provider)
    expect(variations.map((v) => v.length)).toEqual(['short', 'medium', 'detailed'])
  })

  test('each variation has non-empty content', async () => {
    const provider = new MockChatProvider()
    const variations = await generateDraftVariations(email, tone, provider)
    for (const v of variations) {
      expect(v.content.length).toBeGreaterThan(0)
    }
  })

  test('the three variation contents are distinct (different length instructions)', async () => {
    const provider = new MockChatProvider()
    const variations = await generateDraftVariations(email, tone, provider)
    const set = new Set(variations.map((v) => v.content))
    expect(set.size).toBe(3)
  })

  test('calls the provider once per variation (3 total)', async () => {
    const provider = new MockChatProvider()
    await generateDraftVariations(email, tone, provider)
    expect(provider.calls).toBe(3)
  })
})

describe('rewriteDraft', () => {
  test('returns a non-empty string', async () => {
    const provider = new MockChatProvider()
    const out = await rewriteDraft(
      'Thanks Sam, Thursday works.',
      'make it more casual',
      email,
      tone,
      provider,
    )
    expect(typeof out).toBe('string')
    expect(out.length).toBeGreaterThan(0)
  })

  test('incorporates the feedback in the prompt (visible in mock echo)', async () => {
    const provider = new MockChatProvider()
    const out = await rewriteDraft(
      'prev draft text',
      'be more concise',
      email,
      tone,
      provider,
    )
    expect(out).toContain('be more concise')
  })

  test('works without a tone profile', async () => {
    const provider = new MockChatProvider()
    const out = await rewriteDraft('prev', 'tighten', email, undefined, provider)
    expect(out).toContain('tighten')
  })
})

describe('getChatProvider / __setChatProviderForTest', () => {
  test('injected provider is returned by generateDraftVariations when no explicit provider given', async () => {
    const provider = new MockChatProvider()
    __setChatProviderForTest(provider)
    try {
      const variations = await generateDraftVariations(email, tone)
      expect(variations).toHaveLength(3)
      expect(provider.calls).toBe(3)
    } finally {
      __setChatProviderForTest(null)
    }
  })
})
