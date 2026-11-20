import { test, expect, describe } from 'bun:test'
import { buildGmailComposeUrl } from '../gmail-link-builder'

describe('buildGmailComposeUrl', () => {
  test('returns the base Gmail compose URL with view=cm and fs=1', () => {
    const url = buildGmailComposeUrl('', '', '')
    expect(url).toBe('https://mail.google.com/mail/?view=cm&fs=1')
  })

  test('includes the to param when provided', () => {
    const url = buildGmailComposeUrl('sam@example.com', '', '')
    expect(url).toContain('to=sam%40example.com')
  })

  test('uses su (not subject) for the subject param', () => {
    const url = buildGmailComposeUrl('', 'Hello', '')
    expect(url).toContain('su=Hello')
    expect(url).not.toContain('subject=')
  })

  test('includes the body param when provided', () => {
    const url = buildGmailComposeUrl('', '', 'Reply body')
    expect(url).toContain('body=Reply+body')
  })

  test('URL-encodes special characters', () => {
    const url = buildGmailComposeUrl('a@b.com', 'Hi there & now', 'Body & more')
    expect(url).toContain('to=a%40b.com')
    expect(url).toContain('su=Hi+there+%26+now')
    expect(url).toContain('body=Body+%26+more')
  })

  test('omits the to param when empty', () => {
    const url = buildGmailComposeUrl('', 'Subject', 'Body')
    expect(url).not.toContain('to=')
  })

  test('omits the subject param when empty', () => {
    const url = buildGmailComposeUrl('a@b.com', '', 'Body')
    expect(url).not.toContain('su=')
  })

  test('omits the body param when empty', () => {
    const url = buildGmailComposeUrl('a@b.com', 'Subject', '')
    expect(url).not.toContain('body=')
  })

  test('omits all optional params when only base is requested', () => {
    const url = buildGmailComposeUrl('', '', '')
    expect(url).not.toContain('to=')
    expect(url).not.toContain('su=')
    expect(url).not.toContain('body=')
  })

  test('encodes newlines in the body', () => {
    const url = buildGmailComposeUrl('', '', 'Line 1\nLine 2')
    expect(url).toContain('body=Line+1%0ALine+2')
  })
})
