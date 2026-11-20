import { test, expect, describe } from 'bun:test'
import { buildRewritePrompt } from '../rewrite-builder'
import type { EmailInput } from '../draft-builder'

const originalEmail: EmailInput = {
  subject: 'Re: Q3 roadmap review',
  body: 'Can we move the review to Thursday?',
  senderName: 'Sam Lee',
  threadContext: '',
}

describe('buildRewritePrompt', () => {
  test('user prompt includes the previous draft', () => {
    const { user } = buildRewritePrompt({
      prevDraft: 'Thanks Sam, Thursday works for me.',
      feedback: 'make it more casual',
      originalEmail,
    })
    expect(user).toContain('Thanks Sam, Thursday works for me.')
  })

  test('user prompt includes the feedback', () => {
    const { user } = buildRewritePrompt({
      prevDraft: 'draft text',
      feedback: 'be more concise',
      originalEmail,
    })
    expect(user).toContain('be more concise')
  })

  test('user prompt includes the original email body', () => {
    const { user } = buildRewritePrompt({
      prevDraft: 'draft text',
      feedback: 'tighten',
      originalEmail,
    })
    expect(user).toContain('Can we move the review to Thursday?')
  })

  test('user prompt includes the original email subject', () => {
    const { user } = buildRewritePrompt({
      prevDraft: 'draft text',
      feedback: 'tighten',
      originalEmail,
    })
    expect(user).toContain('Re: Q3 roadmap review')
  })

  test('user prompt includes the sender when present', () => {
    const { user } = buildRewritePrompt({
      prevDraft: 'draft text',
      feedback: 'tighten',
      originalEmail,
    })
    expect(user).toContain('Sam Lee')
  })

  test('falls back to a placeholder when feedback is empty', () => {
    const { user } = buildRewritePrompt({
      prevDraft: 'draft text',
      feedback: '',
      originalEmail,
    })
    expect(user.toLowerCase()).toContain('no specific feedback')
  })

  test('system prompt includes tone addon when provided', () => {
    const { system } = buildRewritePrompt({
      prevDraft: 'draft text',
      feedback: 'tighten',
      originalEmail,
      toneAddon: 'Writing style: friendly-professional.',
    })
    expect(system).toContain('friendly-professional')
  })

  test('system prompt omits tone addon line when absent', () => {
    const { system } = buildRewritePrompt({
      prevDraft: 'draft text',
      feedback: 'tighten',
      originalEmail,
    })
    expect(system).not.toContain('Writing style:')
  })
})
