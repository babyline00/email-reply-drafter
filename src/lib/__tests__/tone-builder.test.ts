import { test, expect, describe } from 'bun:test'
import { buildTonePromptAddon, type ToneProfileInput } from '../tone-builder'

const baseProfile: ToneProfileInput = {
  name: 'Default',
  styleDescription: 'friendly-professional',
  sentenceLength: 'medium',
  useEmoji: false,
  signOff: 'Best, [my name]',
}

describe('buildTonePromptAddon', () => {
  test('returns a non-empty string', () => {
    const addon = buildTonePromptAddon(baseProfile)
    expect(typeof addon).toBe('string')
    expect(addon.length).toBeGreaterThan(0)
  })

  test('profile with style="friendly-professional" produces a prompt mention', () => {
    const addon = buildTonePromptAddon(baseProfile)
    expect(addon).toContain('friendly-professional')
  })

  test('includes the profile name', () => {
    const addon = buildTonePromptAddon({ ...baseProfile, name: 'Work-casual' })
    expect(addon).toContain('Work-casual')
  })

  test('includes the sentence length', () => {
    const addon = buildTonePromptAddon({ ...baseProfile, sentenceLength: 'short' })
    expect(addon.toLowerCase()).toContain('short')
  })

  test('useEmoji=false excludes the emoji instruction entirely', () => {
    const addon = buildTonePromptAddon({ ...baseProfile, useEmoji: false })
    expect(addon.toLowerCase()).not.toContain('emoji')
  })

  test('useEmoji=true includes the emoji instruction', () => {
    const addon = buildTonePromptAddon({ ...baseProfile, useEmoji: true })
    expect(addon.toLowerCase()).toContain('emoji')
  })

  test('signOff present appears in the prompt', () => {
    const addon = buildTonePromptAddon({ ...baseProfile, signOff: 'Best, [my name]' })
    expect(addon).toContain('Best, [my name]')
  })

  test('empty signOff omits the sign-off line', () => {
    const addon = buildTonePromptAddon({ ...baseProfile, signOff: '' })
    expect(addon.toLowerCase()).not.toContain('sign-off')
  })

  test('null signOff omits the sign-off line', () => {
    const addon = buildTonePromptAddon({ ...baseProfile, signOff: null })
    expect(addon.toLowerCase()).not.toContain('sign-off')
  })
})
