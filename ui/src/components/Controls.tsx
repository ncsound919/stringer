import React, { useCallback, useRef, useState } from 'react'

import { formatValue } from '../params'
import { useParam, useTelemetry } from '../store'

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const s = polar(cx, cy, r, a0)
  const e = polar(cx, cy, r, a1)
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`
}

export function parseEntry(p: { min: number; max: number; unit: string; choices?: string[] }, text: string): number | null {
  const t = text.trim().toLowerCase()
  if (p.choices) {
    const i = p.choices.findIndex((c) => c.toLowerCase().startsWith(t))
    if (i >= 0) return i
    const n = Number(t)
    if (!Number.isNaN(n)) return Math.max(0, Math.min(p.choices.length - 1, Math.round(n)))
    return null
  }
  let s = t.replace(/[a-z°µ]+/g, '').trim()
  let mult = 1
  if (s.endsWith('k')) { mult = 1000; s = s.slice(0, -1) }
  if (s.endsWith('m')) { mult = 0.001; s = s.slice(0, -1) }
  const n = Number(s)
  if (Number.isNaN(n)) return null
  let v = n * mult
  if (p.unit === 'm') v = (v - 0.05) / 0.45
  if (p.unit === 'dB' && Math.abs(v) < 0.3) v = 0
  return Math.max(p.min, Math.min(p.max, v))
}

// --------------------------------------------------------------------------- Knob
export function Knob({ id, size = 54, advanced }: { id: string; size?: number; advanced?: boolean }) {
  const { p, v, set } = useParam(id)
  const drag = useRef<{ y: number; norm: number } | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const bipolar = p.min < 0 && p.max > 0
  const norm = clamp01((v - p.min) / (p.max - p.min))
  const zeroNorm = bipolar ? clamp01((0 - p.min) / (p.max - p.min)) : null

  const commitNorm = useCallback(
    (n: number, fine = false) => {
      let raw = p.min + clamp01(n) * (p.max - p.min)
      if (p.choices) raw = Math.round(raw)
      if (p.unit === 'dB' && Math.abs(raw) < 0.3) raw = 0
      set(raw)
    },
    [p, set],
  )

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.altKey) {
      e.preventDefault()
      set(p.def)
      return
    }
    e.preventDefault()
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
    drag.current = { y: e.clientY, norm }
  }

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const sensitivity = e.shiftKey ? 0.0055 * 0.12 : 0.0055
    // 180px travel maps full range
    const delta = (d.y - e.clientY) / 180
    commitNorm(d.norm + delta * (e.shiftKey ? 0.12 : 1), e.shiftKey)
  }

  const endDrag = () => {
    drag.current = null
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (editing) return
    const step = p.choices ? 1 : (p.max - p.min) / 100
    const nStep = step / (p.max - p.min)
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
      e.preventDefault()
      commitNorm(norm + (e.shiftKey ? nStep * 0.1 : nStep))
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
      e.preventDefault()
      commitNorm(norm - (e.shiftKey ? nStep * 0.1 : nStep))
    } else if (e.key === 'PageUp') {
      e.preventDefault()
      commitNorm(norm + nStep * 10)
    } else if (e.key === 'PageDown') {
      e.preventDefault()
      commitNorm(norm - nStep * 10)
    } else if (e.key === 'Home') {
      e.preventDefault()
      commitNorm(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      commitNorm(1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      setDraft(formatValue(p, v))
      setEditing(true)
    }
  }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const step = p.choices ? 1 : (p.max - p.min) / 100
    const nStep = step / (p.max - p.min)
    const mult = e.shiftKey ? 0.2 : 1
    commitNorm(norm + (e.deltaY < 0 ? nStep * mult : -nStep * mult))
  }

  const submitEntry = () => {
    const nv = parseEntry(p, draft)
    if (nv !== null) set(nv)
    setEditing(false)
  }

  // geometry
  const a0 = -135
  const a1 = 135
  const angle = a0 + (a1 - a0) * norm
  const tip = polar(50, 50, 24, angle)
  const hub = polar(50, 50, 11, angle)

  // graduations: 13 across sweep
  const grads = Array.from({ length: 13 }, (_, i) => {
    const deg = a0 + (a1 - a0) * (i / 12)
    const major = i % 3 === 0
    const rOuter = 46
    const rInner = major ? 40 : 42
    const outer = polar(50, 50, rOuter, deg)
    const inner = polar(50, 50, rInner, deg)
    const isZero = bipolar && Math.abs(deg - (a0 + (a1 - a0) * (zeroNorm ?? 0))) < 0.01
    return { deg, major, outer, inner, isZero }
  })

  const valueArcStart = bipolar && zeroNorm !== null ? a0 + (a1 - a0) * zeroNorm : a0
  const valueArcEnd = angle

  const r = size

  return (
    <div
      className="knob"
      role="slider"
      tabIndex={0}
      aria-label={p.name}
      aria-valuemin={p.min}
      aria-valuemax={p.max}
      aria-valuenow={v}
      aria-valuetext={formatValue(p, v) + (p.unit ? ' ' + p.unit : '')}
      onKeyDown={onKeyDown}
      onWheel={onWheel}
    >
      <svg width={r} height={r} viewBox="0 0 100 100" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <defs>
          <radialGradient id={`cap-${id}`} cx="38%" cy="30%" r="85%">
            <stop offset="0%" stopColor="#2d2d34" />
            <stop offset="55%" stopColor="#1b1b20" />
            <stop offset="100%" stopColor="#101014" />
          </radialGradient>
          <linearGradient id={`edge-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <filter id={`glow-${id}`}>
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* graduations */}
        {grads.map((g, i) => (
          <line
            key={i}
            x1={g.outer.x}
            y1={g.outer.y}
            x2={g.inner.x}
            y2={g.inner.y}
            stroke={g.isZero ? 'var(--ia)' : g.major ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.14)'}
            strokeWidth={g.major ? 1.4 : 0.9}
            strokeLinecap="round"
          />
        ))}

        {/* track arc */}
        <path d={arc(50, 50, 41, a0, a1)} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={2.5} strokeLinecap="round" />

        {/* value arc */}
        <path
          d={arc(50, 50, 41, Math.min(valueArcStart, valueArcEnd), Math.max(valueArcStart, valueArcEnd))}
          fill="none"
          stroke="var(--ia)"
          strokeWidth={2.5}
          strokeLinecap="round"
          opacity={0.9}
        />

        {/* cap */}
        <circle cx={50} cy={50} r={29} fill={`url(#cap-${id})`} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        <circle cx={50} cy={50} r={29} fill="none" stroke={`url(#edge-${id})`} strokeWidth={1} />
        <circle cx={50} cy={50} r={23.5} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={0.8} />

        {/* hub */}
        <circle cx={50} cy={50} r={2.4} fill="#0a0a0c" stroke="rgba(255,255,255,0.12)" strokeWidth={0.8} />

        {/* pointer */}
        <line x1={hub.x} y1={hub.y} x2={tip.x} y2={tip.y} stroke="var(--t-white)" strokeWidth={2.6} strokeLinecap="round" opacity={0.92} />
        <circle cx={tip.x} cy={tip.y} r={2.1} fill="#ffd9a8" filter={`url(#glow-${id})`} />
      </svg>

      <div className="knob-name" title={p.name} onDoubleClick={() => set(p.def)}>
        {p.name}
        {advanced ? ' ·' : ''}
      </div>
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={submitEntry}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); submitEntry() }
            if (e.key === 'Escape') { e.preventDefault(); setEditing(false) }
            e.stopPropagation()
          }}
          style={{
            fontFamily: 'var(--f-mono)',
            fontSize: 'var(--fs-value)',
            color: 'var(--t-white)',
            background: 'var(--s-inset)',
            border: '1px solid var(--ia-line)',
            borderRadius: 'var(--r-1)',
            width: 64,
            textAlign: 'center',
            padding: '1px 2px',
          }}
        />
      ) : (
        <div
          className="knob-val"
          onDoubleClick={() => set(p.def)}
          onClick={() => { setDraft(formatValue(p, v)); setEditing(true) }}
          title="Click to type a value"
        >
          {formatValue(p, v)}
          {p.unit && p.unit !== '' && !formatValue(p, v).toLowerCase().includes(p.unit.toLowerCase()) ? (
            <span style={{ color: 'var(--t-low)', fontSize: 'var(--fs-micro)', marginLeft: 2 }}>{p.unit}</span>
          ) : null}
        </div>
      )}
    </div>
  )
}

// --------------------------------------------------------------------------- Segmented
export function Segmented({ id, label }: { id: string; label?: string }) {
  const { p, v, set } = useParam(id)
  const active = Math.round(v)

  return (
    <div className="field">
      {label ? <label>{label}</label> : <label>{p.name}</label>}
      <div className="seg" role="radiogroup" aria-label={p.name}>
        {(p.choices ?? []).map((choice, i) => (
          <button
            key={choice}
            role="radio"
            aria-checked={i === active}
            className={i === active ? 'on' : ''}
            onClick={() => set(i)}
          >
            {choice}
          </button>
        ))}
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------- Meter
export function Meter() {
  const { peakL, peakR } = useTelemetry()

  const bar = (value: number) => {
    const db = 20 * Math.log10(Math.max(value, 1e-5))
    const h = clamp01((db + 54) / 60) * 100
    return (
      <div className="bar" role="meter" aria-valuenow={db} aria-valuetext={`${db.toFixed(1)} dB`}>
        <div className="fill" style={{ height: `${h}%` }} />
        <div className="peak" style={{ bottom: `${h}%` }} />
      </div>
    )
  }

  return (
    <div className="meter" aria-label="Output level">
      {bar(peakL)}
      {bar(peakR)}
    </div>
  )
}

// --------------------------------------------------------------------------- Readout
export function Readout({ k, v }: { k: string; v: string }) {
  return (
    <div className="readout">
      <div className="r-k">{k}</div>
      <div className="r-v">{v}</div>
    </div>
  )
}