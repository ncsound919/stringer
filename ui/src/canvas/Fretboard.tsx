import React from 'react'

import type { NoteState } from '../bridge'

const NUT = 46
const SCALE = 560
const FRETS = 21

const fretX = (n: number) => NUT + SCALE * (1 - Math.pow(2, -n / 12))

export function Fretboard({
  strings,
  notes,
}: {
  strings: number
  notes: NoteState[]
}) {
  const spacing = strings === 4 ? 24 : 16
  const top = strings === 4 ? 34 : 24
  const height = (strings - 1) * spacing
  const ys = Array.from({ length: strings }, (_, i) => top + i * spacing)
  const end = fretX(FRETS) + 16

  return (
    <svg className="graph" viewBox={`0 0 ${586} ${height + 56}`} preserveAspectRatio="xMidYMid meet">
      <rect x={NUT} y={top - 10} width={end - NUT} height={height + 20} rx="2" fill="var(--s-inset)" stroke="var(--line-soft)" strokeWidth="1" />

      {Array.from({ length: FRETS + 1 }, (_, i) => i).map((n) => {
        const x = n === 0 ? NUT + 0.5 : fretX(n)
        return (
          <line
            key={n}
            x1={x}
            y1={top - 10}
            x2={x}
            y2={top + height + 10}
            stroke={n === 0 ? 'var(--t-mid)' : 'var(--t-dim)'}
            strokeWidth={n === 0 ? 3 : 1}
            opacity={n === 0 ? 0.85 : 0.55}
          />
        )
      })}

      {[3, 5, 7, 9, 15, 17, 19].map((n) => (
        <circle key={n} cx={(fretX(n) + fretX(n - 1)) / 2} cy={top + height / 2} r="3.2" fill="var(--t-mid)" opacity="0.28" />
      ))}
      <circle cx={(fretX(12) + fretX(11)) / 2} cy={top + height / 2 - 9} r="3.2" fill="var(--t-mid)" opacity="0.28" />
      <circle cx={(fretX(12) + fretX(11)) / 2} cy={top + height / 2 + 9} r="3.2" fill="var(--t-mid)" opacity="0.28" />

      {ys.map((y, i) => (
        <line key={y} x1={NUT} y1={y} x2={end} y2={y} stroke="var(--t-mid)" strokeWidth={0.9 + (strings - 1 - i) * 0.2} opacity="0.5" />
      ))}

      {notes.map((note) => {
        if (note.string < 0 || note.string >= strings) return null
        const y = ys[note.string]
        const x = note.fret <= 0 ? NUT - 12 : (fretX(note.fret) + fretX(note.fret - 1)) / 2
        return (
          <g key={`${note.string}-${note.fret}`}>
            <circle className="fb-note" cx={x} cy={y} r="7.5" />
            <text className="fb-note-text" x={x} y={y + 2.5}>
              {note.fret}
            </text>
          </g>
        )
      })}

      {Array.from({ length: FRETS + 1 }, (_, n) => n)
        .filter((n) => n > 0 && n % 3 === 0)
        .map((n) => (
          <text key={n} className="graph-label" x={(fretX(n) + fretX(n - 1)) / 2} y={top + height + 24} textAnchor="middle">
            {n}
          </text>
        ))}

      <text className="graph-label" x={NUT - 12} y={top + height + 24} textAnchor="middle">
        0
      </text>
    </svg>
  )
}
