import React from 'react'

import { useParam, useTelemetry } from '../store'
import { Knob, Readout, Segmented } from '../components/Controls'
import { Panel } from '../components/Chrome'
import { Fretboard } from '../canvas/Fretboard'
import { formatValue } from '../params'

const ARTICULATIONS = [
  { name: 'Auto', sub: 'Picked note, natural release' },
  { name: 'Palm Mute', sub: 'Heavy damping at the bridge' },
  { name: 'Harmonic', sub: 'Excite at a node, fundamental suppressed' },
  { name: 'Dead Note', sub: 'Fretted without pitch, very short tail' },
]

export function PerformanceWorkspace({ instrument }: { instrument: number }) {
  const { notes, voices } = useTelemetry()
  const articulation = useParam('articulation')
  const active = Math.round(articulation.v)
  const strings = instrument === 2 ? 4 : 6

  const bend = useParam('bendRange')
  const velocity = useParam('velocityCurve')

  return (
    <div className="perf">
      <div className="stack">
        <Panel title="Contact">
          <Segmented id="pickMaterial" label="Playing contact" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Knob id="pluckPosition" size={58} />
            <Knob id="pluckForce" size={58} />
          </div>
          <p className="hint">
            Contact material changes the excitation spectrum; position places the pluck along the string,
            which is what sets the comb of missing partials.
          </p>
        </Panel>

        <Panel title="Fretboard" flush={false}>
          <div className="fretboard-wrap">
            <Fretboard strings={strings} notes={notes} />
          </div>
          <div className="readouts" style={{ marginTop: 10 }}>
            <Readout k="Sounding" v={`${voices} / 12`} />
            <Readout k="Velocity" v={`${Math.round(velocity.v * 100)}% curve`} />
            <Readout k="Bend" v={formatValue(bend.p, bend.v) + ' st'} />
            <Readout k="Assignment" v="Automatic" />
          </div>
        </Panel>
      </div>

      <div className="stack2">
        <Panel title="Articulation">
          <div className="art-grid">
            {ARTICULATIONS.map((a, i) => (
              <button
                key={a.name}
                className={`art ${i === active ? 'on' : ''}`}
                onClick={() => articulation.set(i)}
              >
                <div className="a-name">{a.name}</div>
                <div className="a-sub">{a.sub}</div>
              </button>
            ))}
          </div>
          <p className="hint">
            Articulations modify the physical state: they change excitation, loop damping and decay rather
            than layering a sample.
          </p>
        </Panel>

        <Panel title="Expression">
          <div className="controls" style={{ paddingTop: 4 }}>
            <Knob id="velocityCurve" size={52} />
            <Knob id="humanize" size={52} />
            <Knob id="fretNoise" size={52} />
            <Knob id="bendRange" size={52} />
          </div>
          <p className="hint">
            Pitch bend applies to sounding strings. Humanise barely moves excitation depth and position so
            offline renders stay repeatable.
          </p>
        </Panel>
      </div>
    </div>
  )
}
