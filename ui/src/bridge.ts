import { DEFAULTS, PARAM_INFO } from './params'

export type NoteState = { string: number; fret: number }

export type Telemetry = {
  voices: number
  cpu: number
  peakL: number
  peakR: number
  clip: number
  notes: NoteState[]
  scope?: number[]
}

type Backend = {
  getNativeFunction?: (name: string) => (...args: unknown[]) => Promise<unknown>
  addEventListener?: (name: string, cb: (payload: unknown) => void) => void
}

const g = globalThis as unknown as { __JUCE__?: { backend?: Backend } }
const backend = g.__JUCE__?.backend

const native =
  typeof backend?.getNativeFunction === 'function'
    ? backend.getNativeFunction('forme')
    : null

export const isPlugin = native !== null

// Scope data is read by the canvas on its own animation frame, so it is a plain
// buffer rather than React state: 30 Hz of state churn would fight the drawing.
export const scopeBuffer = new Float32Array(160)

const mockValues: Record<string, number> = { ...DEFAULTS }

async function request(action: string, payload?: unknown): Promise<unknown> {
  if (!native) return mockRequest(action, payload)

  const raw = await native(action, payload === undefined ? '' : JSON.stringify(payload))

  if (typeof raw !== 'string') return null
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function mockRequest(action: string, payload?: unknown): unknown {
  switch (action) {
    case 'info':
      return PARAM_INFO
    case 'snapshot':
      return Object.entries(mockValues).map(([id, value]) => ({ id, value }))
    case 'set': {
      const p = payload as { id: string; value: number }
      mockValues[p.id] = p.value
      return {}
    }
    case 'reset':
      Object.assign(mockValues, DEFAULTS)
      return {}
    default:
      return {}
  }
}

export const getParamInfo = async () => (await request('info')) as typeof PARAM_INFO

export const getSnapshot = async () => {
  const rows = (await request('snapshot')) as { id: string; value: number }[]
  const out: Record<string, number> = {}
  for (const r of rows ?? []) out[r.id] = r.value
  return out
}

export const setParam = (id: string, value: number) => {
  void request('set', { id, value })
}

export const resetAll = () => {
  void request('reset')
}

// ---------------------------------------------------------------------------
// telemetry
// ---------------------------------------------------------------------------
type TelemetryCb = (t: Telemetry) => void
const telemetrySubs = new Set<TelemetryCb>()

export function onTelemetry(cb: TelemetryCb): () => void {
  telemetrySubs.add(cb)
  return () => telemetrySubs.delete(cb)
}

export function onParamPush(cb: (values: Record<string, number>) => void): () => void {
  if (!backend?.addEventListener) return () => {}

  backend.addEventListener('forme.params', (payload) => {
    if (!Array.isArray(payload)) return
    const out: Record<string, number> = {}
    for (const row of payload as { id: string; value: number }[]) out[row.id] = row.value
    cb(out)
  })

  return () => {}
}

if (backend?.addEventListener) {
  backend.addEventListener('forme.telemetry', (payload) => {
    const t = payload as Telemetry
    if (!t) return

    if (Array.isArray(t.scope)) {
      const s = t.scope as number[]
      for (let i = 0; i < scopeBuffer.length; i++) scopeBuffer[i] = s[i] ?? 0
    }

    for (const cb of telemetrySubs) cb(t)
  })
}

// ---------------------------------------------------------------------------
// browser preview: a damped string so the displays are not dead in dev
// ---------------------------------------------------------------------------
if (!isPlugin) {
  const strings = [
    { string: 3, fret: 5 },
    { string: 2, fret: 7 },
    { string: 1, fret: 5 },
  ]

  let t = 0
  let step = 0

  setInterval(() => {
    t += 1 / 30

    const note = strings[step % strings.length]
    const phase = (t * 1.1) % 1

    if (phase < 0.02) step++

    const env = Math.exp(-4.5 * phase)
    for (let i = 0; i < scopeBuffer.length; i++) {
      const x = i / scopeBuffer.length
      scopeBuffer[i] =
        env * 0.55 * Math.sin(2 * Math.PI * (2.2 + (step % 3) * 0.6) * x) * Math.cos(Math.PI * (x - 0.5) * 0.4)
    }

    const playing = phase < 0.75
    for (const cb of telemetrySubs) {
      cb({
        voices: playing ? 1 : 0,
        cpu: 0.06 + 0.01 * Math.sin(t),
        peakL: playing ? 0.62 * env + 0.04 : 0.02,
        peakR: playing ? 0.58 * env + 0.04 : 0.02,
        clip: 0,
        notes: playing ? [note] : [],
      })
    }
  }, 33)
}
