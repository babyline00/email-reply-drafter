import { test, expect, describe } from 'bun:test'
import { getLengthSpecs, getLengthSpec, type LengthKey } from '../length-variations'

describe('getLengthSpecs', () => {
  test('returns an array of three specs', () => {
    const specs = getLengthSpecs()
    expect(Array.isArray(specs)).toBe(true)
    expect(specs).toHaveLength(3)
  })

  test('returns short / medium / detailed in canonical order', () => {
    const specs = getLengthSpecs()
    expect(specs.map((s) => s.length)).toEqual(['short', 'medium', 'detailed'])
  })

  test('short = 1-3 sentences', () => {
    const specs = getLengthSpecs()
    const short = specs.find((s) => s.length === 'short')!
    expect(short.sentences).toEqual([1, 3])
  })

  test('medium = 4-7 sentences', () => {
    const specs = getLengthSpecs()
    const medium = specs.find((s) => s.length === 'medium')!
    expect(medium.sentences).toEqual([4, 7])
  })

  test('detailed = 2-3 paragraphs', () => {
    const specs = getLengthSpecs()
    const detailed = specs.find((s) => s.length === 'detailed')!
    expect(detailed.paragraphs).toEqual([2, 3])
  })

  test('every spec has a non-empty instruction', () => {
    for (const s of getLengthSpecs()) {
      expect(s.instruction.length).toBeGreaterThan(0)
    }
  })

  test('getLengthSpec returns the matching spec by key', () => {
    expect(getLengthSpec('short').length).toBe('short')
    expect(getLengthSpec('medium').length).toBe('medium')
    expect(getLengthSpec('detailed').length).toBe('detailed')
  })

  test('getLengthSpec throws for unknown keys', () => {
    expect(() => getLengthSpec('unknown' as LengthKey)).toThrow()
  })
})
