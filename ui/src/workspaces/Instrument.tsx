import React, { useCallback, useEffect, useRef, useState } from 'react'

import { INSTRUMENTS } from '../params'
import { useParam, useTelemetry } from '../store'
import { Knob, Segmented } from '../components/Controls'
import { Panel } from '../components/Chrome'
import { InstrumentCanvas } from '../canvas/Instruments'
import { BodyModes, PickupResponse } from '../canvas/Graphs'

type TabDef = {
  id: string
  label: string
  segs?: string[]
  knobs?: string[]
  hint: string
  graph?: 'pickup' | 'body'
}

const TABS: Record<number, TabDef[]> = {
  0: [
    {
      id: 'strings',
      label: 'Strings',
      segs: ['stringGauge', 'tuning'],
      knobs: ['capo', 'fretNoise'],
      hint: 'Set-level controls apply to all six strings. Gauge changes linear density and bending stiffness in the model.',
    },
    {
      id: 'body',
      label: 'Body',
      segs: [],
      knobs: ['bodyResonance', 'bodyQ', 'bodyCoupling', 'airCavity'],
      hint: 'Modal bank for the soundboard and air cavity. Q and coupling alter partial decay, not a filter sweep.',
    },
    {
      id: 'bridge',
      label: 'Bridge',
      segs: [],
      knobs: ['inharmonicity', 'detune'],
      hint: 'Termination stiffness drives string dispersion; polarisation detune splits the two planes of vibration.',
    },
    {
      id: 'resonance',
      label: 'Resonance',
      segs: [],
      knobs: ['decay', 'brightness'],
      hint: 'Loop gain is derived from the target T60 at the sounding pitch, per string.',
      graph: 'body',
    },
  ],
  1: [
    {
      id: 'pickups',
      label: 'Pickups',
      segs: [],
      knobs: ['pickupHeight', 'pickupInductance', 'cableCapacitance'],
      hint: 'Height sets flux coupling, inductance and cable capacitance set the coil resonance and its Q.',
    },
    {
      id: 'selector',
      label: 'Selector',
      segs: ['selector'],
      hint: 'The five positions route modelled pickup outputs — combinations are summed in phase, not EQ presets.',
    },
    {
      id: 'controls',
      label: 'Controls',
      segs: ['toneCap'],
      knobs: ['volume', 'tone'],
      hint: 'Passive volume and tone. The tone network is a first-order RC to ground with the selected capacitor.',
    },
    {
      id: 'response',
      label: 'Response',
      hint: 'Modelled pickup response from the current coil and cable values.',
      graph: 'pickup',
    },
  ],
  2: [
    {
      id: 'strings',
      label: 'Strings',
      segs: ['stringGauge', 'tuning'],
      knobs: ['capo', 'decay', 'brightness'],
      hint: 'Four strings, 34-inch scale. Loss is frequency dependent, so decay and brightness interact.',
    },
    {
      id: 'pickup',
      label: 'Pickup',
      segs: [],
      knobs: ['pickupHeight', 'pickupInductance', 'cableCapacitance'],
      hint: 'Split coil: two sensing halves at their own positions, summed into one passive circuit.',
    },
    {
      id: 'controls',
      label: 'Controls',
      segs: ['toneCap'],
      knobs: ['volume', 'tone'],
      hint: 'Authentic Precision layout — volume, tone. No blend control, because this model has one pickup system.',
    },
    {
      id: 'response',
      label: 'Response',
      hint: 'Modelled low-frequency and coil response for the split coil.',
      graph: 'pickup',
    },
  ],
}

export function InstrumentWorkspace({ instrument }: { instrument: number }) {
  const { notes } = useTelemetry()
  const instrumentParam = useParam('instrument')
  const tabs = TABS[instrument] ?? TABS[1]
  const [tab, setTab] = useState(tabs[0].id)

  useEffect(() => {
    setTab((TABS[instrument] ?? TABS[1])[0].id)
  }, [instrument])

  const current = tabs.find((t) => t.id === tab) ?? tabs[0]
  const canvasRef = useRef<HTMLDivElement>(null)
  const [focusOnMount, setFocusOnMount] = useState<string | null>(null)
  const handleFocusPart = useCallback((p: string) => setFocusOnMount(p), [])

  // Keyboard nav: when the instrument changes, put focus back on the hotspot
  // that was last focused (P26).
  useEffect(() => {
    const p = focusOnMount
    if (p) {
      const el = canvasRef.current?.querySelector(`g.hot[data-part="${p}"]`)
      ;(el as unknown as { focus?: () => void } | null)?.focus?.()
      setFocusOnMount(null)
    }
  }, [instrument])

  return (
    <div className="grid3">
      {/* instrument family */}
      <div className="panel">
        <div className="panel-head">
          <span>Instrument</span>
        </div>
        <div className="panel-body">
          <div className="tiles">
            {INSTRUMENTS.map((inst, i) => (
              <button
                key={inst.name}
                className={`tile ${i === instrument ? 'on' : ''}`}
                onClick={() => instrumentParam.set(i)}
              >
                <span className="glyph">
                  {i === 0 && (
                    <svg width="30" height="30" viewBox="0 0 30 30">
                      <ellipse cx="19" cy="15" rx="8" ry="9" fill="none" stroke="currentColor" strokeWidth="1.2" />
                      <circle cx="19" cy="15" r="2.6" fill="none" stroke="currentColor" strokeWidth="1" />
                      <line x1="2" y1="15" x2="11" y2="15" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  )}
                  {i === 1 && (
                    <svg width="30" height="30" viewBox="0 0 30 30">
                      <path d="M12 9c4-3 9-1 10 4s-2 10-7 10-7-4-6-8 1-4 3-6z" fill="none" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="2" y1="15" x2="11" y2="15" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="18" y1="12" x2="18" y2="20" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  )}
                  {i === 2 && (
                    <svg width="30" height="30" viewBox="0 0 30 30">
                      <ellipse cx="19" cy="15" rx="9" ry="10" fill="none" stroke="currentColor" strokeWidth="1.2" />
                      <line x1="2" y1="15" x2="10" y2="15" stroke="currentColor" strokeWidth="1.4" />
                      <rect x="18" y="10" width="2" height="4" fill="currentColor" />
                      <rect x="20" y="16" width="2" height="4" fill="currentColor" />
                    </svg>
                  )}
                </span>
                <span>
                  <span className="t-name">{inst.name.toUpperCase()}</span>
                  <span className="t-sub">{inst.sub}</span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="rail-foot">
          {instrument === 0 && 'Steel-string dreadnought. Bridge force drives a modal soundboard and air cavity.'}
          {instrument === 1 && 'Three single coils, five-way routing, passive tone. Electrical DI output.'}
          {instrument === 2 && 'Split-coil, per-fret loss. Long-scale string with low fundamental damping.'}
        </div>
      </div>

      {/* canvas */}
      <Panel
        title="Instrument canvas"
        flush
        right={<span className="badge note">{notes.length > 0 ? `${notes.length} sounding` : 'idle'}</span>}
      >
        <div ref={canvasRef}>
          <InstrumentCanvas
            instrument={instrument}
            selected={tab}
            onSelect={(part) => setTab(part)}
            onFocusPart={handleFocusPart}
            notes={notes}
          />
        </div>
      </Panel>

      {/* inspector */}
      <div className="panel">
        <div className="panel-head">
          <span>Inspector</span>
          <span className="badge note">{INSTRUMENTS[instrument]?.name}</span>
        </div>

        <div className="tabs" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={t.id === tab}
              className={`subtab ${t.id === tab ? 'on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="panel-body" style={{ padding: 0 }}>
          {(current.segs ?? []).length > 0 && (
            <div style={{ padding: '12px 12px 0' }}>
              {(current.segs ?? []).map((id) => (
                <Segmented key={id} id={id} />
              ))}
            </div>
          )}

          {(current.knobs ?? []).length > 0 && (
            <div className="controls">
              {(current.knobs ?? []).map((id) => (
                <Knob key={id} id={id} />
              ))}
            </div>
          )}

          {current.graph === 'pickup' && (
            <div style={{ padding: '8px 12px' }}>
              <PickupResponse />
            </div>
          )}

          {current.graph === 'body' && (
            <div style={{ padding: '8px 12px 0' }}>
              <BodyModes instrument={instrument} />
            </div>
          )}

          <p className="hint">{current.hint}</p>
        </div>
      </div>
    </div>
  )
}
