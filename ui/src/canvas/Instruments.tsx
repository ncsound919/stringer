import React from 'react'

import type { NoteState } from '../bridge'

export type CanvasProps = {
  selected: string
  onSelect: (part: string) => void
  onFocusPart?: (part: string) => void
  notes: NoteState[]
}

// Strings share the same visual geometry as the engine's sensing positions:
// nut at x, saddle at x + scale, so pickup art sits where the model listens.
const NUT = 84
const SCALE = 378
const SADDLE = NUT + SCALE

const fretX = (n: number) => NUT + SCALE * (1 - Math.pow(2, -n / 12))

function StringSet({
  ys,
  active,
  x0 = NUT,
  x1 = SADDLE,
  thin = 1.1,
}: {
  ys: number[]
  active: number[]
  x0?: number
  x1?: number
  thin?: number
}) {
  return (
    <g>
      {ys.map((y, i) => {
        const live = active.includes(i)
        const w = thin + (ys.length - 1 - i) * 0.22
        return (
          <g key={y} className={live ? 'string-live' : undefined}>
            <line
              x1={x0}
              y1={y}
              x2={x1}
              y2={y}
              stroke={live ? 'var(--ia)' : '#d9d4c8'}
              strokeWidth={w}
              opacity={live ? 1 : 0.78}
              strokeLinecap="round"
            />
            <line x1={x0} y1={y + 0.9} x2={x1} y2={y + 0.9} stroke="#000" strokeWidth={w * 0.6} opacity={0.18} />
          </g>
        )
      })}
    </g>
  )
}

function Hotspot({
  part,
  selected,
  onSelect,
  onFocusPart,
  path,
  children,
}: {
  part: string
  selected: string
  onSelect: (p: string) => void
  onFocusPart?: (p: string) => void
  path?: string
  children?: React.ReactNode
}) {
  return (
    <g
      className="hot"
      data-part={part}
      tabIndex={0}
      onClick={() => onSelect(part)}
      onFocus={() => onFocusPart?.(part)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'a' || e.key === 'l') {
          e.preventDefault()
          onSelect(part)
        }
      }}
    >
      {path && <path d={path} fill="transparent" stroke="none" pointerEvents="all" />}
      {children}
      {selected === part && path && <path className="sel-ring" d={path} />}
    </g>
  )
}

// ---------------------------------------------------------------------------
const ACOUSTIC_BODY =
  'M 290 196 C 290 158, 316 134, 348 134 C 374 134, 396 150, 404 174 ' +
  'C 409 190, 424 192, 434 178 C 446 160, 468 162, 480 182 ' +
  'C 490 200, 490 218, 480 236 C 468 256, 446 258, 434 240 ' +
  'C 424 226, 409 228, 404 244 C 396 268, 374 284, 348 284 ' +
  'C 316 284, 290 260, 290 222 Z'

export function AcousticCanvas({ selected, onSelect, onFocusPart, notes }: CanvasProps) {
  const ys = [160, 176, 192, 208, 224, 240]
  const active = notes.map((n) => n.string)

  return (
    <svg viewBox="0 0 520 440" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="acTop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d3ab7c" />
          <stop offset="45%" stopColor="#bd9163" />
          <stop offset="100%" stopColor="#8e6944" />
        </linearGradient>
        <radialGradient id="acHole" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#0a0908" />
          <stop offset="80%" stopColor="#120e0a" />
          <stop offset="100%" stopColor="#241a12" />
        </radialGradient>
        <linearGradient id="acNeck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a3524" />
          <stop offset="50%" stopColor="#3a2a1c" />
          <stop offset="100%" stopColor="#241a12" />
        </linearGradient>
        <linearGradient id="acHead" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#3d2c1e" />
          <stop offset="100%" stopColor="#251a12" />
        </linearGradient>
      </defs>

      {/* neck + headstock */}
      <rect x="70" y="150" width="222" height="100" rx="2" fill="url(#acNeck)" />
      <path d="M 26 138 L 78 148 L 78 252 L 26 264 Z" fill="url(#acHead)" stroke="#1b130d" strokeWidth="1" />
      {[156, 186, 216, 246].map((y, i) => (
        <g key={y}>
          <circle cx={i % 2 === 0 ? 44 : 62} cy={y} r="5.6" fill="#8d8f8f" stroke="#3a3d3d" strokeWidth="1" />
          <circle cx={i % 2 === 0 ? 44 : 62} cy={y} r="2.2" fill="#2c2f30" />
        </g>
      ))}

      {/* body */}
      <Hotspot part="body" selected={selected} onSelect={onSelect} onFocusPart={onFocusPart} path={ACOUSTIC_BODY}>
        <path d={ACOUSTIC_BODY} fill="url(#acTop)" stroke="#463322" strokeWidth="1.4" />
        <path d={ACOUSTIC_BODY} fill="none" stroke="#f0e3ce" strokeWidth="0.6" opacity="0.22" transform="scale(0.985) translate(4,3)" />
      </Hotspot>

      {/* soundhole + rosette */}
      <Hotspot part="resonance" selected={selected} onSelect={onSelect} onFocusPart={onFocusPart}>
        <circle cx="356" cy="209" r="38" fill="none" stroke="#3d2a1a" strokeWidth="1.2" opacity="0.65" />
        <circle cx="356" cy="209" r="35" fill="none" stroke="#e2cba8" strokeWidth="1.4" opacity="0.55" />
        <circle cx="356" cy="209" r="32" fill="url(#acHole)" stroke="#20150e" strokeWidth="1.4" />
        <circle cx="356" cy="209" r="32" fill="none" stroke="#e6d3b4" strokeWidth="0.8" opacity="0.35" />
        {selected === 'resonance' && <circle className="sel-ring" cx="356" cy="209" r="40" />}
      </Hotspot>

      {/* fretboard */}
      <Hotspot part="strings" selected={selected} onSelect={onSelect} onFocusPart={onFocusPart} path="M78 152h214v96H78z">
        <rect x="78" y="152" width="214" height="96" rx="1.5" fill="#241a12" />
        {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
          const x = fretX(n)
          if (x > 292) return null
          return <line key={n} x1={x} y1="153" x2={x} y2="247" stroke="#a9a49a" strokeWidth="0.9" opacity="0.7" />
        })}
        {[3, 5, 7, 9, 12, 15, 17, 19].map((n) => {
          const x = (fretX(n) + fretX(n - 1)) / 2
          if (x > 292) return null
          return <circle key={n} cx={x} cy="200" r={n === 12 ? 2.4 : 2} fill="#e8e2d6" opacity="0.5" />
        })}
        <rect x="76" y="148" width="4" height="104" fill="#e8e2d6" opacity="0.75" />
        {selected === 'strings' && <rect className="sel-ring" x="72" y="146" width="222" height="108" rx="2" />}
      </Hotspot>

      {/* bridge */}
      <Hotspot part="bridge" selected={selected} onSelect={onSelect} onFocusPart={onFocusPart} path="M452 152h26v98h-26z">
        <rect x="452" y="152" width="26" height="98" rx="2" fill="#2b1f15" stroke="#5c4430" strokeWidth="1" />
        <rect x="451" y="186" width="4" height="30" rx="1" fill="#eae4d6" opacity="0.85" />
        {ys.map((y, i) => (
          <g key={y}>
            <circle cx="468" cy={y + 4} r="2.6" fill="#e8e0cf" opacity="0.85" />
            <circle cx="468" cy={y + 4} r="1.1" fill="#2b1f15" opacity="0.9" />
          </g>
        ))}
        {/* bridge pins */}
        {[458, 478].map((x) =>
          ys.map((y, i) => (
            <circle key={`${x}-${y}`} cx={x} cy={y - 2 + (i % 2)} r="1.3" fill="#c9bca6" opacity="0.7" />
          )),
        )}
        {selected === 'bridge' && <rect className="sel-ring" x="448" y="148" width="34" height="106" rx="3" />}
      </Hotspot>

      <StringSet ys={ys} active={active} />
    </svg>
  )
}

// ---------------------------------------------------------------------------
const STRAT_BODY =
  'M 302 196 C 296 166, 312 138, 340 132 C 368 126, 392 138, 402 160 ' +
  'C 408 172, 416 172, 424 160 C 438 136, 466 130, 482 148 ' +
  'C 496 164, 492 196, 484 214 C 478 232, 474 262, 452 278 ' +
  'C 428 294, 396 282, 386 260 C 378 244, 368 230, 350 232 ' +
  'C 330 234, 314 220, 306 210 Z'

const PICKGUARD =
  'M 336 168 C 356 158, 392 158, 414 166 C 432 172, 444 186, 446 204 ' +
  'C 448 224, 438 244, 420 252 C 398 262, 368 258, 350 246 ' +
  'C 336 236, 330 210, 336 168 Z'

export function StratCanvas({ selected, onSelect, onFocusPart, notes }: CanvasProps) {
  const ys = [160, 176, 192, 208, 224, 240]
  const active = notes.map((n) => n.string)

  // Engine sensing positions: bridge 0.075, middle 0.225, neck 0.385 of scale.
  const px = [SADDLE - 0.075 * SCALE, SADDLE - 0.225 * SCALE, SADDLE - 0.385 * SCALE]

  return (
    <svg viewBox="0 0 520 440" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="stBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a9b6b9" />
          <stop offset="42%" stopColor="#859396" />
          <stop offset="100%" stopColor="#5d6a6e" />
        </linearGradient>
        <linearGradient id="stGuard" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e9e5d9" />
          <stop offset="100%" stopColor="#cfcabc" />
        </linearGradient>
        <linearGradient id="stNeck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d8bd94" />
          <stop offset="100%" stopColor="#b1906a" />
        </linearGradient>
      </defs>

      {/* neck + headstock */}
      <rect x="62" y="152" width="238" height="96" fill="url(#stNeck)" stroke="#8a6c4b" strokeWidth="1" />
      <path d="M 22 148 L 68 152 L 68 248 L 22 256 Z" fill="#c9ae88" stroke="#8a6c4b" strokeWidth="1" />
      {[160, 186, 212, 238].map((y, i) => (
        <g key={y}>
          <circle cx={i % 2 === 0 ? 38 : 54} cy={y} r="4.6" fill="#b9bcbd" stroke="#5e6365" strokeWidth="0.9" />
        </g>
      ))}
      <rect x="66" y="150" width="4" height="100" fill="#efeae0" opacity="0.8" />

      {/* body */}
      <Hotspot part="body" selected={selected} onSelect={onSelect} onFocusPart={onFocusPart} path={STRAT_BODY}>
        <path d={STRAT_BODY} fill="url(#stBody)" stroke="#4e5a5d" strokeWidth="1.4" />
        <path d={STRAT_BODY} fill="none" stroke="#e6ecee" strokeWidth="0.7" opacity="0.3" transform="scale(0.98) translate(6,4)" />
      </Hotspot>

      {/* pickguard */}
      <path d={PICKGUARD} fill="url(#stGuard)" stroke="#b3ad9f" strokeWidth="1" opacity="0.95" />
      {/* pickguard screws */}
      {[[346,172],[400,162],[438,184],[440,232],[404,256],[352,248]].map(([x,y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="1.6" fill="#b3ad9f" stroke="#8a8376" strokeWidth="0.6" />
          <line x1={x-1} y1={y} x2={x+1} y2={y} stroke="#6b6558" strokeWidth="0.5" />
        </g>
      ))}
      {/* fretboard dots */}
      {[3,5,7,9,12,15,17,19].map((n) => {
        const x = (fretX(n) + fretX(n-1)) / 2
        if (x > 298) return null
        return (
          <circle key={n} cx={x} cy="200" r={n===12?2.2:1.8} fill="#efeae0" opacity="0.55" />
        )
      })}

      {/* pickups */}
      <Hotspot part="pickups" selected={selected} onSelect={onSelect} onFocusPart={onFocusPart}>
        {px.map((x, i) => (
          <g key={x}>
            <rect x={x - 8} y={152} width="16" height="96" rx="4" fill="#d9d3c4" stroke="#a49c8b" strokeWidth="0.9" />
            {ys.map((y) => (
              <circle key={y} cx={x} cy={y} r="2.6" fill="#5f574a" opacity="0.85" />
            ))}
            <rect x={x - 8} y={152} width="16" height="7" rx="3" fill="#bfb8a8" opacity="0.85" />
            <text x={x} y="256" textAnchor="middle" fill="#5c6467" fontSize="7" fontFamily="ui-monospace, monospace">
              {['B', 'M', 'N'][i]}
            </text>
          </g>
        ))}
        {selected === 'pickups' && <rect className="sel-ring" x={px[2] - 14} y="148" width={px[0] - px[2] + 28} height="112" rx="6" />}
      </Hotspot>

      {/* five-way selector */}
      <Hotspot part="selector" selected={selected} onSelect={onSelect} onFocusPart={onFocusPart} path="M424 238h30v16h-30z">
        <rect x="424" y="238" width="30" height="16" rx="3" fill="#20252a" stroke="#4c5559" strokeWidth="1" />
        <line x1="430" y1="248" x2="446" y2="240" stroke="#d7dadd" strokeWidth="2" strokeLinecap="round" />
        {selected === 'selector' && <rect className="sel-ring" x="421" y="235" width="36" height="22" rx="4" />}
      </Hotspot>

      {/* volume / tone */}
      <Hotspot part="controls" selected={selected} onSelect={onSelect} onFocusPart={onFocusPart} path="M396 256h72v32h-72z">
        {[
          [408, 268],
          [432, 274],
          [456, 268],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="7.5" fill="#22282c" stroke="#7f8b8f" strokeWidth="1" />
            <circle cx={x} cy={y} r="3" fill="#c8ced0" opacity="0.8" />
          </g>
        ))}
        {selected === 'controls' && <rect className="sel-ring" x="396" y="256" width="72" height="32" rx="5" />}
      </Hotspot>

      {/* bridge */}
      <rect x="452" y="160" width="14" height="80" rx="2" fill="#b9bfc1" stroke="#6d787c" strokeWidth="0.9" />
      {ys.map((y) => (
        <rect key={y} x="450" y={y - 2} width="18" height="4" rx="1" fill="#d7dcde" opacity="0.9" />
      ))}

      <StringSet ys={ys} active={active} />
    </svg>
  )
}

// ---------------------------------------------------------------------------
const BASS_BODY =
  'M 296 198 C 292 168, 312 140, 342 136 C 372 132, 398 148, 408 172 ' +
  'C 414 186, 428 188, 438 176 C 452 160, 474 164, 486 184 ' +
  'C 496 202, 494 222, 484 240 C 472 260, 452 262, 440 244 ' +
  'C 430 230, 414 232, 408 248 C 400 272, 374 288, 346 284 ' +
  'C 314 280, 292 256, 296 220 Z'

export function BassCanvas({ selected, onSelect, onFocusPart, notes }: CanvasProps) {
  const ys = [168, 196, 224, 252]
  const active = notes.map((n) => n.string)

  return (
    <svg viewBox="0 0 520 440" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="bsBody" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#b98a5f" />
          <stop offset="38%" stopColor="#8d6142" />
          <stop offset="100%" stopColor="#4a2f1f" />
        </linearGradient>
        <linearGradient id="bsNeck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#cbb08a" />
          <stop offset="100%" stopColor="#a2805c" />
        </linearGradient>
      </defs>

      {/* long-scale neck */}
      <rect x="42" y="158" width="258" height="84" fill="url(#bsNeck)" stroke="#7d5f42" strokeWidth="1" />
      <path d="M 18 154 L 46 158 L 46 242 L 18 248 Z" fill="#a9855f" stroke="#6f5439" strokeWidth="1" />
      {[164, 188, 212, 236].map((y, i) => (
        <circle key={y} cx={i % 2 === 0 ? 30 : 40} cy={y} r="4.2" fill="#c2c6c7" stroke="#5c6163" strokeWidth="0.9" />
      ))}
      <rect x="44" y="156" width="4" height="88" fill="#efeae0" opacity="0.78" />

      {/* body */}
      <Hotspot part="body" selected={selected} onSelect={onSelect} onFocusPart={onFocusPart} path={BASS_BODY}>
        <path d={BASS_BODY} fill="url(#bsBody)" stroke="#3a2517" strokeWidth="1.4" />
        <path d={BASS_BODY} fill="none" stroke="#e8cda9" strokeWidth="0.6" opacity="0.22" transform="scale(0.982) translate(5,4)" />
      </Hotspot>

      {/* pickguard */}
      <path
        d="M 330 168 C 352 160, 392 162, 414 172 C 432 180, 442 196, 442 212 C 442 230, 430 246, 410 252 C 386 258, 356 252, 342 238 C 330 226, 324 196, 330 168 Z"
        fill="#1c1b1a"
        stroke="#3a3835"
        strokeWidth="1"
        opacity="0.92"
      />
      {/* pickguard screws */}
      {[[340,178],[402,170],[434,200],[426,240],[372,252],[338,220]].map(([x,y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="1.5" fill="#5a554f" stroke="#2a2724" strokeWidth="0.5" />
          <line x1={x-1} y1={y} x2={x+1} y2={y} stroke="#8a8378" strokeWidth="0.4" />
        </g>
      ))}
      {/* fretboard dots */}
      {[3,5,7,9,12,15,17,19].map((n) => {
        const x = (fretX(n) + fretX(n-1)) / 2
        if (x > 298) return null
        return (
          <circle key={n} cx={x} cy="200" r={n===12?2.0:1.6} fill="#efeae0" opacity="0.45" />
        )
      })}

      {/* split coil: two halves at different positions */}
      <Hotspot part="pickup" selected={selected} onSelect={onSelect} onFocusPart={onFocusPart}>
        <rect x="352" y="160" width="14" height="46" rx="3" fill="#d9d3c4" stroke="#a49c8b" strokeWidth="0.9" />
        <rect x="376" y="212" width="14" height="46" rx="3" fill="#d9d3c4" stroke="#a49c8b" strokeWidth="0.9" />
        {[168, 196].map((y) => (
          <circle key={y} cx="359" cy={y} r="2.6" fill="#5f574a" />
        ))}
        {[224, 252].map((y) => (
          <circle key={y} cx="383" cy={y} r="2.6" fill="#5f574a" />
        ))}
        <text x="359" y="156" textAnchor="middle" fill="#cfc7b6" fontSize="6.5" fontFamily="ui-monospace, monospace">
          E/A
        </text>
        <text x="383" y="270" textAnchor="middle" fill="#cfc7b6" fontSize="6.5" fontFamily="ui-monospace, monospace">
          D/G
        </text>
        {selected === 'pickup' && <rect className="sel-ring" x="348" y="156" width="46" height="106" rx="5" />}
      </Hotspot>

      {/* volume / tone */}
      <Hotspot part="controls" selected={selected} onSelect={onSelect} onFocusPart={onFocusPart} path="M410 258h56v28h-56z">
        {[
          [424, 272],
          [452, 272],
        ].map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x} cy={y} r="8" fill="#1d1c1b" stroke="#8b8378" strokeWidth="1" />
            <circle cx={x} cy={y} r="3" fill="#cfc9bd" opacity="0.75" />
          </g>
        ))}
        {selected === 'controls' && <rect className="sel-ring" x="410" y="258" width="56" height="28" rx="5" />}
      </Hotspot>

      <rect x="452" y="168" width="18" height="52" rx="2" fill="#b9bfc1" stroke="#6d787c" strokeWidth="0.9" />
      {ys.map((y) => (
        <rect key={y} x="450" y={y - 2.5} width="22" height="5" rx="1.2" fill="#d7dcde" opacity="0.9" />
      ))}

      <StringSet ys={ys} active={active} thin={1.6} />
    </svg>
  )
}

export function InstrumentCanvas(props: CanvasProps & { instrument: number }) {
  if (props.instrument === 0) return <AcousticCanvas {...props} />
  if (props.instrument === 2) return <BassCanvas {...props} />
  return <StratCanvas {...props} />
}
