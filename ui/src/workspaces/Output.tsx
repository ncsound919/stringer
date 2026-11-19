import React from 'react'

import { INSTRUMENTS, formatValue } from '../params'
import { useParam, useTelemetry } from '../store'
import { Knob, Meter, Readout, Segmented } from '../components/Controls'
import { Panel } from '../components/Chrome'
import { Scope } from '../canvas/Graphs'

function CaptureDiagram({ position }: { position: number }) {
  const mics = [
    { x: 150, y: 96, label: 'Soundhole' },
    { x: 214, y: 70, label: 'Bridge' },
    { x: 96, y: 122, label: 'Neck' },
    { x: 186, y: 140, label: 'Stereo' },
  ]

  return (
    <svg viewBox="0 0 300 220" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id="capBody" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#3a3128" />
          <stop offset="100%" stopColor="#221d18" />
        </radialGradient>
      </defs>

      <line x1="10" y1="110" x2="96" y2="110" stroke="#3b4246" strokeWidth="10" strokeLinecap="round" />
      <ellipse cx="160" cy="110" rx="62" ry="72" fill="url(#capBody)" stroke="#514535" strokeWidth="1.4" />
      <circle cx="176" cy="106" r="18" fill="#0d0b09" stroke="#6b5a44" strokeWidth="1" />
      <path d="M 96 82 C 78 86, 72 100, 78 110 C 72 120, 78 134, 96 138" fill="none" stroke="#514535" strokeWidth="1.4" />
      <rect x="204" y="86" width="7" height="48" rx="1.5" fill="#2c2318" stroke="#6b5a44" strokeWidth="0.8" />

      {mics.map((m, i) => {
        const on = i === position
        return (
          <g key={m.label}>
            {on && <line x1={m.x} y1={m.y} x2={i === 3 ? 200 : 176} y2="106" stroke="var(--ia)" strokeWidth="1" strokeDasharray="3 3" opacity="0.7" />}
            <circle cx={m.x} cy={m.y} r={on ? 7 : 5} fill={on ? 'var(--ia)' : '#2a3033'} stroke={on ? 'var(--ia)' : '#4a5155'} strokeWidth="1" />
            <circle cx={m.x} cy={m.y} r="1.6" fill={on ? '#17191b' : '#7d8589'} />
            <text
              x={m.x + (m.x > 180 ? -10 : 10)}
              y={m.y + 3}
              textAnchor={m.x > 180 ? 'end' : 'start'}
              fill={on ? 'var(--text)' : 'var(--muted)'}
              fontSize="8"
              fontFamily="ui-monospace, monospace"
            >
              {m.label}
            </text>
          </g>
        )
      })}

      <text x="10" y="206" fill="var(--muted)" fontSize="8" fontFamily="ui-monospace, monospace">
        CAPTURE PLANE · MODELLED
      </text>
    </svg>
  )
}

export function OutputWorkspace({ instrument }: { instrument: number }) {
  const { clip } = useTelemetry()
  const quality = useParam('quality')
  const micPos = useParam('micPosition')
  const output = useParam('outputLevel')
  const width = useParam('stereoWidth')
  const gauge = useParam('stringGauge')
  const tuning = useParam('tuning')
  const selector = useParam('selector')
  const cable = useParam('cableCapacitance')

  const electric = instrument !== 0
  const selName = selector.p.choices?.[Math.round(selector.v)] ?? '—'

  return (
    <div className="out">
      <Panel
        title={electric ? 'Output · electrical DI' : 'Output · acoustic capture'}
        right={<span className={`badge ${clip > 0 ? 'note' : 'ok'}`}>{clip > 0 ? 'over' : 'nominal'}</span>}
      >
        {electric ? (
          <div>
            <div className="cap-canvas" style={{ height: 210 }}>
              <svg viewBox="0 0 420 180" preserveAspectRatio="xMidYMid meet">
                <line x1="30" y1="90" x2="120" y2="90" stroke="#3b4246" strokeWidth="3" />
                <rect x="120" y="34" width="180" height="112" rx="8" fill="#22272a" stroke="#3d4549" strokeWidth="1.2" />
                {Array.from({ length: 6 }, (_, i) => (
                  <line key={i} x1="132" y1={48 + i * 18} x2="288" y2={48 + i * 18} stroke="#8f8981" strokeWidth="0.9" opacity="0.5" />
                ))}
                <rect x="196" y="42" width="8" height="60" rx="2" fill="#c9c2b3" opacity="0.85" />
                <circle cx="252" cy="92" r="11" fill="#1c2124" stroke="#7f8b8f" strokeWidth="1" />
                <circle cx="252" cy="92" r="3.5" fill="#c8ced0" opacity="0.8" />
                <line x1="300" y1="90" x2="392" y2="90" stroke="var(--ia)" strokeWidth="2" />
                <circle cx="396" cy="90" r="4" fill="var(--ia)" />
                <text x="300" y="78" fill="var(--muted)" fontSize="8" fontFamily="ui-monospace, monospace">
                  DI
                </text>
                <text x="128" y="162" fill="var(--muted)" fontSize="8" fontFamily="ui-monospace, monospace">
                  PASSIVE CIRCUIT
                </text>
              </svg>
            </div>

            <div className="readouts" style={{ marginTop: 6 }}>
              <Readout k="Selector" v={instrument === 1 ? selName : 'Split coil'} />
              <Readout k="Pickup system" v={instrument === 1 ? 'Three single coils' : 'Two coil halves'} />
              <Readout k="Cable load" v={formatValue(cable.p, cable.v)} />
              <Readout k="Output" v={`${formatValue(output.p, output.v)} dB`} />
            </div>
          </div>
        ) : (
          <div className="cap-layout">
            <div className="cap-canvas">
              <CaptureDiagram position={Math.round(micPos.v)} />
            </div>
            <div>
              <Segmented id="micPosition" label="Perspective" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Knob id="micDistance" size={56} />
                <Knob id="stereoWidth" size={56} />
              </div>
              <p className="hint">
                Positions select measured-style capture perspectives; distance applies propagation delay and
                air damping.
              </p>
            </div>
          </div>
        )}

        <div style={{ marginTop: 14 }}>
          <Segmented id="quality" label="Engine quality" />
        </div>

        <div className="readouts" style={{ marginTop: 12 }}>
          <Readout k="Profile" v={`${INSTRUMENTS[instrument]?.name} · Factory`} />
          <Readout k="String set" v={gauge.p.choices?.[Math.round(gauge.v)] ?? '—'} />
          <Readout k="Tuning" v={tuning.p.choices?.[Math.round(tuning.v)] ?? '—'} />
          <Readout k="Quality" v={quality.p.choices?.[Math.round(quality.v)] ?? 'Studio'} />
        </div>
      </Panel>

      <Panel title="Signal">
        <div style={{ height: 92, display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <Meter />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <Scope height={104} />
        </div>

        <div className="controls" style={{ padding: '14px 0 0' }}>
          <Knob id="outputLevel" size={56} />
          {instrument === 0 && <Knob id="stereoWidth" size={56} />}
        </div>

        <div className="readouts" style={{ marginTop: 8 }}>
          <Readout k="Peak" v={clip > 0 ? 'above 0 dBFS' : 'below 0 dBFS'} />
          <Readout k="Layout" v={electric ? 'Mono DI' : Math.round(width.v) === 0 ? 'Mono' : 'Stereo'} />
        </div>

        <p className="hint">
          Meters read the actual output bus. Nothing is normalised or trimmed to hide clipping.
        </p>
      </Panel>
    </div>
  )
}
