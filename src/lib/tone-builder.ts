/**
 * Tone profile prompt builder.
 *
 * A ToneProfile describes HOW the user wants to sound — style, sentence
 * length, emoji usage, sign-off. `buildTonePromptAddon` turns that structured
 * profile into a short block of natural-language instructions appended to the
 * system prompt so the LLM adopts the user's voice consistently across all
 * three length variations.
 *
 * For the MVP the tone profile is a single editable row; the stretch goal is
 * to LEARN it from the user's sent mail (few-shot examples pulled via Gmail
 * API) rather than hand-authoring it.
 */

export interface ToneProfileInput {
  name: string
  styleDescription: string
  /** 'short' | 'medium' | 'long' — free-form string for forward compatibility. */
  sentenceLength: string
  useEmoji: boolean
  signOff?: string | null
}

/**
 * Build a newline-delimited block of tone instructions. When `useEmoji` is
 * false the emoji instruction is omitted entirely (the model is never told
 * about emojis either way), which keeps the prompt tight.
 */
export function buildTonePromptAddon(profile: ToneProfileInput): string {
  const lines: string[] = []

  if (profile.name) {
    lines.push(`Tone profile name: ${profile.name}.`)
  }
  if (profile.styleDescription) {
    lines.push(`Writing style: ${profile.styleDescription}.`)
  }
  if (profile.sentenceLength) {
    lines.push(`Preferred sentence length: ${profile.sentenceLength}.`)
  }
  if (profile.useEmoji) {
    lines.push('You may include one tasteful emoji if it fits naturally; do not overdo it.')
  }
  // When useEmoji is false, no emoji instruction is emitted at all.
  if (profile.signOff && profile.signOff.trim().length > 0) {
    lines.push(`Close the email with the sign-off: "${profile.signOff}".`)
  }
  return lines.join('\n')
}
