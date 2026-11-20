import { test, expect, describe } from 'bun:test'
import { formatQuickReply, buildQuickReplyVars } from '../quick-reply-formatter'

describe('formatQuickReply', () => {
  test('replaces a single placeholder', () => {
    expect(formatQuickReply('Thanks {{senderName}}', { senderName: 'Sam' })).toBe(
      'Thanks Sam',
    )
  })

  test('replaces multiple distinct placeholders', () => {
    expect(
      formatQuickReply('Hi {{senderName}}, re: {{subject}}', {
        senderName: 'Sam',
        subject: 'Roadmap',
      }),
    ).toBe('Hi Sam, re: Roadmap')
  })

  test('replaces repeated placeholders', () => {
    expect(formatQuickReply('{{a}} and {{a}}', { a: '1' })).toBe('1 and 1')
  })

  test('leaves unknown placeholders intact', () => {
    expect(formatQuickReply('unknown {{foo}}', {})).toBe('unknown {{foo}}')
  })

  test('returns the body unchanged when there are no placeholders', () => {
    expect(formatQuickReply('no placeholders here', { senderName: 'Sam' })).toBe(
      'no placeholders here',
    )
  })

  test('preserves special characters in variable values', () => {
    expect(formatQuickReply('val: {{a}}', { a: 'a&b' })).toBe('val: a&b')
  })

  test('handles empty vars object', () => {
    expect(formatQuickReply('Hello {{name}}', {})).toBe('Hello {{name}}')
  })

  test('preserves surrounding text and punctuation', () => {
    expect(
      formatQuickReply('Thanks, {{senderName}} — got it!', { senderName: 'Sam' }),
    ).toBe('Thanks, Sam — got it!')
  })
})

describe('buildQuickReplyVars', () => {
  test('builds a vars map from email context', () => {
    const vars = buildQuickReplyVars({
      senderName: 'Sam',
      subject: 'Hi',
      myName: 'Alex',
    })
    expect(vars).toEqual({ senderName: 'Sam', subject: 'Hi', myName: 'Alex' })
  })

  test('omits nullish fields', () => {
    const vars = buildQuickReplyVars({ senderName: null, subject: undefined })
    expect(Object.keys(vars)).toHaveLength(0)
  })
})
