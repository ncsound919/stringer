import { describe, test, expect } from 'bun:test'
import { PARAM_INFO, DEFAULTS, meta, formatValue, INSTRUMENTS } from './params'

describe('params', () => {
  test('PARAM_INFO non-empty and unique ids', () => {
    expect(PARAM_INFO.length).toBeGreaterThan(0)
    const ids = PARAM_INFO.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  test('DEFAULTS mirrors PARAM_INFO defs', () => {
    for (const p of PARAM_INFO) {
      expect(DEFAULTS[p.id]).toBe(p.def)
    }
  })

  test('meta returns info and throws on unknown', () => {
    const p = meta('instrument')
    expect(p.id).toBe('instrument')
    expect(() => meta('nope')).toThrow()
  })

  test('formatValue choices', () => {
    const p = meta('instrument')
    expect(formatValue(p, 0)).toBe('Acoustic')
    expect(formatValue(p, 2)).toBe('P Bass')
  })

  test('formatValue dB', () => {
    const p = meta('outputLevel')
    expect(formatValue(p, 0)).toBe('0.0')
    expect(formatValue(p, 3)).toBe('+3.0')
  })

  test('formatValue m unit', () => {
    const p = meta('micDistance')
    // v=0.35 -> 0.05+0.45*0.35 = 0.2075
    expect(formatValue(p, 0.35)).toBe('0.21 m')
  })

  test('formatValue 0..1 percent', () => {
    const p = meta('decay')
    expect(formatValue(p, 0.5)).toBe('50')
  })

  test('INSTRUMENTS has 3 entries', () => {
    expect(INSTRUMENTS.length).toBe(3)
  })

  test('all params have min <= def <= max', () => {
    for (const p of PARAM_INFO) {
      expect(p.min).toBeLessThanOrEqual(p.def)
      expect(p.def).toBeLessThanOrEqual(p.max)
    }
  })

  test('choices arrays align with min/max', () => {
    for (const p of PARAM_INFO) {
      if (p.choices) {
        expect(p.max).toBe(p.choices.length - 1)
      }
    }
  })

  test('glide parameter present (S3.4)', () => {
    const g = meta('glide')
    expect(g.unit).toBe('s')
    expect(g.def).toBe(0.15)
    expect(g.min).toBe(0)
    expect(g.max).toBe(2)
  })
})