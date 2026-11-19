import { describe, test, expect, beforeEach } from 'bun:test'
import { DEFAULTS } from './params'
import { getParamInfo, getSnapshot, setParam, resetAll, isPlugin, scopeBuffer } from './bridge'

describe('bridge (mock)', () => {
  test('isPlugin is false in test env', () => {
    expect(isPlugin).toBe(false)
  })

  test('getParamInfo returns PARAM_INFO', async () => {
    const info = await getParamInfo()
    expect(Array.isArray(info)).toBe(true)
    expect((info as any[]).length).toBeGreaterThan(0)
  })

  test('getSnapshot returns defaults initially', async () => {
    resetAll()
    const snap = await getSnapshot()
    expect(snap.instrument).toBe(DEFAULTS.instrument)
  })

  test('setParam updates mock value', async () => {
    resetAll()
    setParam('decay', 0.9)
    // set is fire-and-forget; allow microtask
    await new Promise((r) => setTimeout(r, 0))
    const snap = await getSnapshot()
    expect(snap.decay).toBe(0.9)
  })

  test('resetAll restores defaults', async () => {
    setParam('decay', 0.1)
    await new Promise((r) => setTimeout(r, 0))
    resetAll()
    await new Promise((r) => setTimeout(r, 0))
    const snap = await getSnapshot()
    expect(snap.decay).toBe(DEFAULTS.decay)
  })

  test('scopeBuffer length', () => {
    expect(scopeBuffer.length).toBe(160)
  })
})