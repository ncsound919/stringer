// Mirrors src/Params.h. When the plugin is present the C++ table is
// authoritative (the UI asks for it on load); this copy is what the browser
// preview runs against, so the two must describe the same parameters.

export type ParamInfo = {
  id: string
  name: string
  unit: string
  min: number
  max: number
  def: number
  choices?: string[]
  advanced: boolean
}

export const PARAM_INFO: ParamInfo[] = [
  { id: 'instrument', name: 'Instrument', unit: '', min: 0, max: 2, def: 1, choices: ['Acoustic', 'Strat', 'P Bass'], advanced: false },
  { id: 'quality', name: 'Quality', unit: '', min: 0, max: 2, def: 1, choices: ['Efficient', 'Studio', 'Maximum'], advanced: false },
  { id: 'outputLevel', name: 'Output', unit: 'dB', min: -24, max: 12, def: 0, advanced: false },
  { id: 'stereoWidth', name: 'Width', unit: '', min: 0, max: 2, def: 1, advanced: false },

  { id: 'stringGauge', name: 'String Set', unit: '', min: 0, max: 2, def: 1, choices: ['Light', 'Medium', 'Heavy'], advanced: false },
  { id: 'tuning', name: 'Tuning', unit: '', min: 0, max: 3, def: 0, choices: ['Standard', 'Drop D', 'Half Step Down', 'Open G'], advanced: false },
  { id: 'capo', name: 'Capo', unit: 'fret', min: 0, max: 7, def: 0, advanced: false },

  { id: 'decay', name: 'Sustain', unit: '', min: 0, max: 1, def: 0.55, advanced: false },
  { id: 'brightness', name: 'Brightness', unit: '', min: 0, max: 1, def: 0.52, advanced: false },
  { id: 'inharmonicity', name: 'Stiffness', unit: '', min: 0, max: 1, def: 0.3, advanced: true },
  { id: 'detune', name: 'Polarisation', unit: '', min: 0, max: 1, def: 0.35, advanced: true },

  { id: 'bodyResonance', name: 'Resonance Amount', unit: '', min: 0, max: 1, def: 0.5, advanced: false },
  { id: 'bodyQ', name: 'Resonance Q', unit: '', min: 0, max: 1, def: 0.4, advanced: true },
  { id: 'bodyCoupling', name: 'Body Coupling', unit: '', min: 0, max: 1, def: 0.5, advanced: true },
  { id: 'airCavity', name: 'Air Cavity', unit: '', min: 0, max: 1, def: 0.5, advanced: false },

  { id: 'pluckPosition', name: 'Pluck Position', unit: '', min: 0.02, max: 0.48, def: 0.14, advanced: false },
  { id: 'pluckForce', name: 'Excitation', unit: '', min: 0, max: 1, def: 0.6, advanced: false },
  { id: 'pickMaterial', name: 'Contact', unit: '', min: 0, max: 3, def: 0, choices: ['Finger', 'Fingernail', 'Pick', 'Thumb'], advanced: false },
  { id: 'fretNoise', name: 'Fret Noise', unit: '', min: 0, max: 1, def: 0.22, advanced: false },
  { id: 'humanize', name: 'Humanise', unit: '', min: 0, max: 1, def: 0.12, advanced: false },

  { id: 'selector', name: 'Pickup Selector', unit: '', min: 0, max: 4, def: 4, choices: ['Bridge', 'Bridge + Middle', 'Middle', 'Middle + Neck', 'Neck'], advanced: false },
  { id: 'pickupHeight', name: 'Pickup Height', unit: '', min: 0, max: 1, def: 0.5, advanced: false },
  { id: 'pickupInductance', name: 'Coil Inductance', unit: '', min: 0, max: 1, def: 0.5, advanced: true },
  { id: 'cableCapacitance', name: 'Cable Capacitance', unit: '', min: 0, max: 1, def: 0.4, advanced: true },

  { id: 'volume', name: 'Volume', unit: '', min: 0, max: 1, def: 0.85, advanced: false },
  { id: 'tone', name: 'Tone', unit: '', min: 0, max: 1, def: 0.7, advanced: false },
  { id: 'toneCap', name: 'Tone Capacitor', unit: 'uF', min: 0, max: 2, def: 2, choices: ['0.022', '0.033', '0.047'], advanced: true },

  { id: 'micPosition', name: 'Capture', unit: '', min: 0, max: 3, def: 1, choices: ['Soundhole', 'Bridge', 'Neck', 'Stereo Body'], advanced: false },
  { id: 'micDistance', name: 'Distance', unit: 'm', min: 0, max: 1, def: 0.35, advanced: false },

  { id: 'articulation', name: 'Articulation', unit: '', min: 0, max: 3, def: 0, choices: ['Auto', 'Palm Mute', 'Harmonic', 'Dead Note'], advanced: false },
  { id: 'bendRange', name: 'Bend Range', unit: 'st', min: 1, max: 24, def: 2, advanced: true },
  { id: 'glide', name: 'Glide', unit: 's', min: 0, max: 2, def: 0.15, advanced: true },
  { id: 'velocityCurve', name: 'Velocity Curve', unit: '', min: 0, max: 1, def: 0.5, advanced: false },
]

export const DEFAULTS: Record<string, number> = Object.fromEntries(
  PARAM_INFO.map((p) => [p.id, p.def]),
)

export function meta(id: string): ParamInfo {
  const found = PARAM_INFO.find((p) => p.id === id)
  if (!found) throw new Error(`unknown parameter: ${id}`)
  return found
}

export function formatValue(p: ParamInfo, v: number): string {
  if (p.choices) {
    const i = Math.max(0, Math.min(p.choices.length - 1, Math.round(v)))
    return p.choices[i]
  }
  if (p.unit === 'dB') return `${v > 0 ? '+' : ''}${v.toFixed(1)}`
  if (p.unit === 'st') return `${Math.round(v)}`
  if (p.unit === 'fret') return v < 1 ? 'off' : `${Math.round(v)}`
  if (p.unit === 'm') return `${(0.05 + 0.45 * v).toFixed(2)} m`
  if (p.max <= 1.0001) return `${Math.round(v * 100)}`
  return v.toFixed(2)
}

export const INSTRUMENTS = [
  { name: 'Acoustic', sub: 'Dreadnought · 6-string steel', accent: 'var(--timber)' },
  { name: 'Strat', sub: 'SSS · 5-way · passive', accent: 'var(--steel)' },
  { name: 'P Bass', sub: 'Split-coil · 4-string · 34"', accent: 'var(--copper)' },
]
