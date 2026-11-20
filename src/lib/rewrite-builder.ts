/**
 * Rewrite prompt builder.
 *
 * The rewrite loop lets the user click "Rewrite" on any variation with an
 * optional free-text feedback ("make it more casual", "be more concise", ...).
 * The LLM receives the PREVIOUS draft, the FEEDBACK, and the ORIGINAL email
 * context so it can stay grounded while applying the requested change.
 *
 * This is intentionally a separate prompt from the initial draft prompt so the
 * model treats the previous draft as a starting point to revise, not a blank
 * slate to re-derive from scratch.
 */

import type { EmailInput } from './draft-builder'

export interface RewritePromptInput {
  prevDraft: string
  feedback: string
  originalEmail: EmailInput
  toneAddon?: string
}

export interface BuiltPrompt {
  system: string
  user: string
}

export function buildRewritePrompt(args: RewritePromptInput): BuiltPrompt {
  const { prevDraft, feedback, originalEmail, toneAddon } = args

  const systemLines: string[] = [
    'You are an email reply rewriting assistant.',
    'Rewrite the previous draft so that it applies the user\'s feedback, while staying consistent with the original inbound email context.',
    'Do not introduce facts that are not supported by the original email or the previous draft.',
    'Preserve the overall length class of the previous draft unless the feedback explicitly asks to change length.',
    'Output only the rewritten reply body — no preamble, no meta commentary.',
  ]
  if (toneAddon && toneAddon.trim().length > 0) {
    systemLines.push(toneAddon)
  }
  const system = systemLines.join('\n')

  const userParts: string[] = []
  userParts.push('Original inbound email:')
  userParts.push(`Subject: ${originalEmail.subject}`)
  if (originalEmail.senderName && originalEmail.senderName.trim().length > 0) {
    userParts.push(`Sender: ${originalEmail.senderName}`)
  }
  userParts.push(`Body: ${originalEmail.body}`)
  userParts.push('')
  userParts.push('Previous draft:')
  userParts.push(prevDraft)
  userParts.push('')
  userParts.push('Feedback:')
  userParts.push(feedback || '(no specific feedback — improve clarity and tone)')
  userParts.push('')
  userParts.push('Write the rewritten reply now.')
  const user = userParts.join('\n')

  return { system, user }
}
