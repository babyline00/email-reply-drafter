import { test, expect, describe } from 'bun:test'
import { buildDraftPrompt, type EmailInput } from '../draft-builder'
import { getLengthSpec } from '../length-variations'
import type { ToneProfileInput } from '../tone-builder'

const tone: ToneProfileInput = {
  name: 'Default',
  styleDescription: 'friendly-professional',
  sentenceLength: 'medium',
  useEmoji: false,
  signOff: 'Best, [my name]',
}

const email: EmailInput = {
  subject: 'Re: Q3 roadmap review',
  body: 'Hi, can we move the review to Thursday and bring the design doc?',
  senderName: 'Sam Lee',
  threadContext: 'Earlier we discussed Monday but Sam has a conflict.',
}

describe('buildDraftPrompt', () => {
  test('returns an object with system and user strings', () => {
    const spec = getLengthSpec('short')
    const { system, user } = buildDraftPrompt(email, tone, spec)
    expect(typeof system).toBe('string')
    expect(typeof user).toBe('string')
    expect(system.length).toBeGreaterThan(0)
    expect(user.length).toBeGreaterThan(0)
  })

  test('user prompt includes the email body', () => {
    const spec = getLengthSpec('short')
    const { user } = buildDraftPrompt(email, tone, spec)
    expect(user).toContain(email.body)
  })

  test('user prompt includes the sender name when provided', () => {
    const spec = getLengthSpec('medium')
    const { user } = buildDraftPrompt(email, tone, spec)
    expect(user).toContain('Sam Lee')
  })

  test('user prompt includes the email subject', () => {
    const spec = getLengthSpec('short')
    const { user } = buildDraftPrompt(email, tone, spec)
    expect(user).toContain(email.subject)
  })

  test('system prompt includes the tone instructions (style)', () => {
    const spec = getLengthSpec('short')
    const { system } = buildDraftPrompt(email, tone, spec)
    expect(system).toContain('friendly-professional')
  })

  test('user prompt includes the length instructions', () => {
    const spec = getLengthSpec('detailed')
    const { user } = buildDraftPrompt(email, tone, spec)
    // The full instruction string is injected verbatim.
    expect(user).toContain(spec.instruction)
  })

  test('user prompt includes thread context when provided', () => {
    const spec = getLengthSpec('short')
    const { user } = buildDraftPrompt(email, tone, spec)
    expect(user).toContain('Earlier we discussed Monday')
  })

  test('omits the sender name line when absent', () => {
    const spec = getLengthSpec('short')
    const { user } = buildDraftPrompt(
      { subject: 'Hi', body: 'Body text', senderName: '', threadContext: '' },
      tone,
      spec,
    )
    expect(user).not.toContain('Sender name:')
  })
})
