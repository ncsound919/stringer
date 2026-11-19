import React from 'react'

import { INSTRUMENTS } from '../params'
import { useParam, useTelemetry } from '../store'

export type Page = 'instrument' | 'performance' | 'output'

const PAGES: { id: Page; label: string; idx: string }[] = [
  { id: 'instrument', label: 'Instrument', idx: '01' },
  { id: 'performance', label: 'Performance', idx: '02' },
  { id: 'output', label: 'Output', idx: '03' },
]

export function Header({ instrument, onReset }: { instrument: number; onReset: () => void }) {
  const gauge = useParam('stringGauge')
  const tuning = useParam('tuning')
  const capo = useParam('capo')

  const gaugeName = gauge.p.choices?.[Math.round(gauge.v)] ?? 'Medium'
  const tuningName = tuning.p.choices?.[Math.round(tuning.v)] ?? 'Standard'
  const capoFret = Math.round(capo.v)

  return (
    <header className="header">
      <div className="wordmark">
        FORM<span>É</span>
      </div>

      <div className="ident">
        <div className="name">{INSTRUMENTS[instrument]?.name ?? 'Strat'}</div>
        <div className="profile">
          {gaugeName} · {tuningName}
          {capoFret > 0 ? ` · Capo ${capoFret}` : ''}
        </div>
      </div>

      <div className="spacer" />

      <span className="tag">Physical model</span>
      <button className="action" onClick={onReset} title="Restore factory profile values">
        Reset profile
      </button>
    </header>
  )
}

export function Nav({ page, onPage }: { page: Page; onPage: (p: Page) => void }) {
  return (
    <nav className="nav" role="tablist" aria-label="Workspaces">
      {PAGES.map((p) => (
        <button
          key={p.id}
          role="tab"
          aria-selected={page === p.id}
          className={`tab ${page === p.id ? 'on' : ''}`}
          onClick={() => onPage(p.id)}
        >
          <span className="idx">{p.idx}</span>
          {p.label}
        </button>
      ))}
    </nav>
  )
}

export function Footer() {
  const { voices, cpu, midiActive, clip } = useTelemetry()
  const quality = useParam('quality')
  const qualityName = quality.p.choices?.[Math.round(quality.v)] ?? 'Studio'

  return (
    <footer className="footer">
      <span className={`dot ${midiActive ? '' : 'warn'}`} />
      <span>
        <span className="k">MIDI</span> <span className="v">{midiActive ? 'IN' : 'IDLE'}</span>
      </span>
      <span>
        <span className="k">VOICES</span> <span className="v">{voices}/12</span>
      </span>
      <span>
        <span className="k">DSP</span> <span className="v">{Math.round(cpu * 100)}%</span>
      </span>
      <span>
        <span className="k">MODE</span> <span className="v">{qualityName}</span>
      </span>

      <div className="right">
        {clip > 0 && <span className="badge note" style={{ color: 'var(--error)' }}>OUTPUT OVER</span>}
        <span>
          <span className="k">ENGINE</span> <span className="v">Waveguide · 48 kHz</span>
        </span>
      </div>
    </footer>
  )
}

export function Panel({
  title,
  right,
  children,
  flush,
  className,
}: {
  title: string
  right?: React.ReactNode
  children: React.ReactNode
  flush?: boolean
  className?: string
}) {
  return (
    <section className={`panel ${className ?? ''}`}>
      <div className="panel-head">
        <span>{title}</span>
        {right}
      </div>
      <div className={`panel-body ${flush ? 'canvas' : ''}`}>{children}</div>
    </section>
  )
}
