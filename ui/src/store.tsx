import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import {
  getParamInfo,
  getSnapshot,
  onParamPush,
  onTelemetry,
  setParam,
  type NoteState,
} from './bridge'
import { PARAM_INFO, meta, type ParamInfo } from './params'

type ParamStore = {
  info: Record<string, ParamInfo>
  values: Record<string, number>
  set: (id: string, value: number) => void
}

const ParamContext = createContext<ParamStore | null>(null)

export function ParamProvider({ children }: { children: React.ReactNode }) {
  const [info, setInfo] = useState<Record<string, ParamInfo>>(() =>
    Object.fromEntries(PARAM_INFO.map((p) => [p.id, p])),
  )
  const [values, setValues] = useState<Record<string, number>>(() => {
    const out: Record<string, number> = {}
    for (const p of PARAM_INFO) out[p.id] = p.def
    return out
  })

  useEffect(() => {
    let cancelled = false

    void (async () => {
      const [remoteInfo, snapshot] = await Promise.all([getParamInfo(), getSnapshot()])
      if (cancelled) return
      if (Array.isArray(remoteInfo) && remoteInfo.length > 0) {
        setInfo(Object.fromEntries(remoteInfo.map((p) => [p.id, p])))
      }
      setValues((prev) => ({ ...prev, ...snapshot }))
    })()

    const off = onParamPush((pushed) => setValues((prev) => ({ ...prev, ...pushed })))

    return () => {
      cancelled = true
      off()
    }
  }, [])

  const set = useCallback((id: string, value: number) => {
    setValues((prev) => ({ ...prev, [id]: value }))
    setParam(id, value)
  }, [])

  const store = useMemo<ParamStore>(() => ({ info, values, set }), [info, values, set])

  return <ParamContext.Provider value={store}>{children}</ParamContext.Provider>
}

export function useParams(): ParamStore {
  const ctx = useContext(ParamContext)
  if (!ctx) throw new Error('useParams outside ParamProvider')
  return ctx
}

export function useParam(id: string): { p: ParamInfo; v: number; set: (v: number) => void } {
  const { info, values, set } = useParams()
  const p = info[id] ?? meta(id)
  const v = values[id] ?? p.def
  const setter = useCallback((next: number) => set(id, next), [id, set])
  return { p, v, set: setter }
}

// ---------------------------------------------------------------------------
// telemetry
// ---------------------------------------------------------------------------
export type TelemetryState = {
  voices: number
  cpu: number
  peakL: number
  peakR: number
  clip: number
  notes: NoteState[]
  midiActive: boolean
}

const TelemetryContext = createContext<TelemetryState>({
  voices: 0,
  cpu: 0,
  peakL: 0,
  peakR: 0,
  clip: 0,
  notes: [],
  midiActive: false,
})

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<TelemetryState>({
    voices: 0,
    cpu: 0,
    peakL: 0,
    peakR: 0,
    clip: 0,
    notes: [],
    midiActive: false,
  })

  const lastNotes = useRef('')

  useEffect(
    () =>
      onTelemetry((t) => {
        const key = JSON.stringify(t.notes ?? [])

        setState((prev) => {
          const notesChanged = key !== lastNotes.current
          const levelChanged =
            Math.abs(prev.peakL - t.peakL) > 0.004 || Math.abs(prev.peakR - t.peakR) > 0.004

          if (!notesChanged && !levelChanged && prev.voices === t.voices) return prev

          lastNotes.current = key
          return {
            voices: t.voices,
            cpu: t.cpu,
            peakL: t.peakL,
            peakR: t.peakR,
            clip: t.clip,
            notes: notesChanged ? (t.notes ?? []) : prev.notes,
            midiActive: t.voices > 0,
          }
        })
      }),
    [],
  )

  return <TelemetryContext.Provider value={state}>{children}</TelemetryContext.Provider>
}

export const useTelemetry = () => useContext(TelemetryContext)
