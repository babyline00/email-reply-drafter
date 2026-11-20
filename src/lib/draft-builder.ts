/**
 * Draft prompt builder.
 *
 * Given the inbound email, the user's tone profile, and a target length spec,
 * produces a `{ system, user }` prompt pair asking the LLM to draft a single
 * reply at that length. Called once per variation (short / medium / detailed),
 * each as an independent LLM completion.
 */

import type { LengthSpec } from './length-variations'
import type { ToneProfileInput } from './tone-builder'
import { buildTonePromptAddon } from './tone-builder'

export interface EmailInput {
  subject: string
  body: string
  senderName?: string | null
  threadContext?: string | null
}

export interface BuiltPrompt {
  system: string
  user: string
}

export function buildDraftPrompt(
  email: EmailInput,
  tone: ToneProfileInput,
  length: LengthSpec,
): BuiltPrompt {
  const toneAddon = buildTonePromptAddon(tone)

  const system = [
    'You are an email reply drafting assistant.',
    'Write a reply to the inbound email below that is accurate, professional, and directly addresses every point the sender raised.',
    'Do not invent facts. If the email asks a question you cannot answer from the provided context, acknowledge it and propose a concrete next step instead of guessing.',
    'Do not include a subject line — output only the reply body.',
    toneAddon,
  ].join('\n')

  const userParts: string[] = []
  userParts.push(`Length requirement: ${length.instruction}`)
  userParts.push(`Inbound email subject: ${email.subject}`)
  if (email.senderName && email.senderName.trim().length > 0) {
    userParts.push(`Sender name: ${email.senderName}`)
  }
  if (email.threadContext && email.threadContext.trim().length > 0) {
    userParts.push(`Prior thread context (for your reference only):\n${email.threadContext}`)
  }
  userParts.push(`Inbound email body:\n${email.body}`)
  userParts.push('Write the reply now. Output only the reply body — no preamble, no meta commentary.')
  const user = userParts.join('\n\n')

  return { system, user }
}
