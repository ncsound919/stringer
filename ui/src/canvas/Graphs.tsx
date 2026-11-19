import React, { useEffect, useRef } from 'react'

import { scopeBuffer } from '../bridge'
import { useParam } from '../store'

// ---------------------------------------------------------------------------
export function Scope({ height = 120 }: { height?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const levels = useRef<number[]>([])

  useEffect(() => {
    let raf = 0

    const draw = () => {
      const canvas = ref.current
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2)
        const w = canvas.clientWidth
        const h = canvas.clientHeight

        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
          canvas.width = Math.round(w * dpr)
          canvas.height = Math.round(h * dpr)
        }

        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          ctx.clearRect(0, 0, w, h)

          ctx.strokeStyle = 'rgba(255,255,255,0.06)'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(0, h / 2)
          ctx.lineTo(w, h / 2)
          ctx.stroke()

          const n = scopeBuffer.length
          ctx.beginPath()

          for (let i = 0; i < n; i++) {
            const x = (i / (n - 1)) * w
            const y = h / 2 - scopeBuffer[i] * (h * 0.42)
            if (i === 0) ctx.moveTo(x, y)
            else ctx.lineTo(x, y)
          }

          ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ia').trim() || '#b99d75'
          ctx.lineWidth = 1.4
          ctx.lineJoin = 'round'
          ctx.stroke()

          ctx.lineTo(w, h / 2)
          ctx.lineTo(0, h / 2)
          ctx.closePath()
          ctx.fillStyle = (getComputedStyle(document.documentElement).getPropertyValue('--ia').trim() || '#b99d75') + '14'
          ctx.fill()
        }
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [levels])

  return (
    <canvas
      ref={ref}
      style={{ width: '100%', height, display: 'block' }}
      aria-label="Output waveform"
    />
  )
}

// ---------------------------------------------------------------------------
// Magnetic pickup response, using the same L/C resonance the DSP sets up.
// ---------------------------------------------------------------------------
export function PickupResponse({ height = 150 }: { height?: number }) {
  const ind = useParam('pickupInductance').v
  const cable = useParam('cableCapacitance').v

  const L = 1.6 + 2.6 * ind
  const C = 180e-12 + 900e-12 * cable
  const f0 = 1 / (2 * Math.PI * Math.sqrt(L * C))
  const Q = 2.4 + 2.2 * (1 - cable)

  const W = 420
  const H = 130
  const fMin = 60
  const fMax = 9000

  const mag = (f: number) => {
    const r = f / f0
    const res = 1 / Math.sqrt(Math.pow(1 - r * r, 2) + Math.pow(r / Q, 2))
    // Sensing position comb, bridge pickup at 7.5% of scale.
    const comb = Math.abs(Math.sin(Math.PI * f * 0.000075))
    return res * (0.35 + 0.65 * comb)
  }

  const xOf = (f: number) =>
    ((Math.log(f) - Math.log(fMin)) / (Math.log(fMax) - Math.log(fMin))) * W

  const yOf = (m: number) => H - Math.max(0, Math.min(1, (20 * Math.log10(Math.max(m, 1e-4)) + 30) / 42)) * H

  const points: string[] = []
  for (let i = 0; i <= 160; i++) {
    const f = fMin * Math.pow(fMax / fMin, i / 160)
    points.push(`${i === 0 ? 'M' : 'L'} ${xOf(f).toFixed(2)} ${yOf(mag(f)).toFixed(2)}`)
  }

  return (
    <div>
      <svg className="graph" viewBox={`0 0 ${W} ${H + 22}`} style={{ height }}>
        <rect x="0" y="0" width={W} height={H} fill="var(--s-inset)" stroke="var(--line-soft)" />
        {[100, 1000, 10000].map((f) => (
          <g key={f}>
            <line x1={xOf(f)} y1="0" x2={xOf(f)} y2={H} stroke="var(--line-soft)" />
            <text className="graph-label" x={xOf(f) + 3} y={H + 15}>
              {f >= 1000 ? `${f / 1000}k` : `${f}`}
            </text>
          </g>
        ))}
        <line x1="0" y1={yOf(1)} x2={W} y2={yOf(1)} stroke="var(--line-soft)" strokeDasharray="3 4" />
        <path d={points.join(' ')} fill="none" stroke="var(--ia)" strokeWidth="1.6" />
        <text className="graph-label" x="4" y="12">
          dB
        </text>
      </svg>
      <div className="hint" style={{ margin: '8px 0 0', borderTop: 0, paddingTop: 0 }}>
        Coil resonance {(f0 / 1000).toFixed(2)} kHz · Q {Q.toFixed(1)} — from L {L.toFixed(2)} H and{' '}
        {(C * 1e12).toFixed(0)} pF. Modelled response, not a measurement.
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Body modal bank — the same frequencies the engine feeds into its resonators.
// ---------------------------------------------------------------------------
const MODES: Record<number, number[]> = {
  0: [98, 190, 262, 372, 512, 688, 880, 1090, 1360, 1680, 2050, 2500],
  1: [180, 320, 470, 640, 820, 1050, 1300, 1600, 1950, 2300, 2700, 3200],
  2: [62, 118, 168, 240, 330, 450, 590, 760, 960, 1200, 1500, 1900],
}

export function BodyModes({ instrument, height = 150 }: { instrument: number; height?: number }) {
  const resonance = useParam('bodyResonance').v
  const q = useParam('bodyQ').v
  const modes = MODES[instrument] ?? MODES[1]

  const W = 420
  const H = 120
  const fMax = 2600

  return (
    <div>
      <svg className="graph" viewBox={`0 0 ${W} ${H + 22}`} style={{ height }}>
        <rect x="0" y="0" width={W} height={H} fill="var(--s-inset)" stroke="var(--line-soft)" />
        {modes.map((f, i) => {
          const x = (Math.log(f / 55) / Math.log(fMax / 55)) * W
          const gain = resonance * (1 / (1 + 0.35 * i))
          const h = Math.max(2, gain * H * 0.92)
          return (
            <g key={f}>
              <rect x={x - 5} y={H - h} width="10" height={h} fill="var(--ia)" opacity={0.16 + 0.55 * gain} rx="1" />
              <text className="graph-label" x={x} y={H + 14} textAnchor="middle">
                {f < 1000 ? f : (f / 1000).toFixed(1) + 'k'}
              </text>
            </g>
          )
        })}
        <line x1="0" y1={H} x2={W} y2={H} stroke="var(--line-soft)" />
      </svg>
      <div className="hint" style={{ margin: '8px 0 0', borderTop: 0, paddingTop: 0 }}>
        Modal bank · Q scale {(1 + q * 2).toFixed(2)}× · frequencies in Hz. Modelled, not measured.
      </div>
    </div>
  )
}
