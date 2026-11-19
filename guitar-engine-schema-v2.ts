/**
 * Physical-modeling guitar engine — schema v2 (supersedes guitar-engine-schema.ts).
 * SI units. Angles in rad. Strings indexed 0 = lowest pitch. Distances along a string in m.
 * Evidence, sources and open gaps for every module: guitar-engine-research.md.
 * "Reference solver" = Bilbao/Russo/Webb/Ducceschi, DAFx24 (IEQ/SAV, single polarization).
 */

// ───────────────────────── Provenance ─────────────────────────
export type MeasurementId = string;

/** measured/fitted need measurement refs + relative 1σ (worst element for arrays).
 *  nominal = datasheet/setup spec, hand-tuned = ears. nonMeasured() lists the rest. */
export type Param<T> =
  | { src: "measured" | "fitted"; v: T; ref: MeasurementId[]; unc: number }
  | { src: "nominal" | "hand-tuned"; v: T; note?: string };

// ───────────────────────── Contact laws (item 1) ─────────────────────────
/** Power-law contact, potential-based so the scheme stays energy-stable:
 *  V = K/(α+1)·[penetration]₊^(α+1). α ≥ 1; DAFx24 calls its choice "simple Hertzian".
 *  No measured K or α for real frets/boards exists in the sources found: treat as FITTED
 *  (identify from fret-buzz / tap recordings), never nominal. */
export interface PowerLaw {
  K: Param<number>;
  alpha: Param<number>;
}

export interface ContactModel {
  /** Distributed: force DENSITY = K·[b(x) − u]₊^α, so K has units N·m^(−1−α). */
  board: PowerLaw;
  /** Lumped at fret tips: force = K·[m0 − u(x_q)]₊^α, K in N·m^(−α). */
  fret: PowerLaw;
  /** Optional Hunt–Crossley term λ [s/m] (Bilbao–Torin–Chatziioannou 2015 lossy collisions).
   *  NOT in the DAFx24 reference scheme: anything using it is unvalidated against it. */
  loss?: Param<number>;
}

export interface FretFinger {
  mass: number;                           // kg (M_FG)
  padWidth: number;                       // m along the string
  law: PowerLaw;                          // lumped, finger ↔ string
  /** Pad friction is NOT in the reference model; used only by the tip-trajectory path. */
  friction?: Param<number>;
}

// ───────────────────────── Fret geometry & clearance (item 2) ─────────────────────────
export interface FretCrown {
  width: Param<number>;
  radius: Param<number>;
  height: Param<number>;                  // crown top above board surface
}

export interface Fretboard {
  nFrets: number;
  /** m from nut; length nFrets+1; [0] = nut. Default L(1 − 2^(−q/12)); measured overrides. */
  fretPositions: Param<number[]>;
  saddleCompensation: Param<number[]>;    // per string, m added to scaleLength
  boardRadius: number;                    // m (9.5 in = 0.2413 m)
  crown: FretCrown;
  /** What the reference solver consumes, string at rest under tension (so relief is included):
   *  fretTop[string][fret] = m0 ≤ 0 : fret-tip height relative to the string rest line.
   *  boardProfile.b[string][i] = b(x_i) ≤ fretTop : board surface relative to the string rest line. */
  fretTop: Param<number[][]>;
  boardProfile: Param<{ xs: number[]; b: number[][] }>;
  /** Setup descriptors, kept to cross-check fretTop. Convention MUST be recorded. */
  setup: {
    reliefMm: Param<number>;
    reliefConvention: { capoAtFret: number; otherCapoAtFret: number; gaugeAtFret: number };
    actionAtFret: number;                 // e.g. 17 electric/bass, 14 acoustic (Fender convention)
    actionPerString: Param<number[]>;     // m, string bottom → fret top
  };
}

// ───────────────────────── Nut, saddle, string ends (item 3) ─────────────────────────
/** Tension equalisation across a nut/saddle/tree. Kemp 2017 assumes "free" (full equalisation);
 *  "locked" is a locking nut. Real parts sit between: "coulomb" bounds Thi/Tlo ≤ e^(μθ)
 *  (capstan relation — standard mechanics, not taken from the retrieved papers). */
export type SlipModel =
  | { kind: "locked" }
  | { kind: "free" }
  | { kind: "coulomb"; mu: Param<number>; wrapAngle: number };

export interface NutModel {
  slotHeightAboveFret1: Param<number>;
  /** l_nut: free string between nut and tuner-post contact. Sets tremolo/bend sensitivity:
   *  δc = δ·lf/(lf + l_nut). Strat 9–42 set measured 41–159 mm by Kemp. */
  stringLengthBehind: Param<number>;
  slip: SlipModel;
  boundary: { kind: "simply-supported" } | { kind: "compliant"; compliance: Param<number> };
  stringTree?: { slip: SlipModel; wrapAngle: number };
}

export interface StringLoss {
  /** u_tt = c²u_xx − κ²u_xxxx − 2σ0·u_t + 2σ1·u_xxt  (σ0 [1/s], σ1 [m²/s]), per fret (0 = open). */
  byFret: Param<{ fret: number; sigma0: number; sigma1: number }[]>;
  /** Measured target byFret is fitted to. */
  t60Table: Param<{ fret: number; partialHz: number[]; t60s: number[] }[]>;
}

export interface StringSpec {
  index: number;
  construction: "plain" | "roundwound" | "flatwound" | "halfround";
  scaleLength: number;                    // m
  linearDensity: Param<number>;           // kg/m, total, at tuned tension
  tension: Param<number>;                 // N at open pitch, reference temperature
  axial: {
    /** EA of the CORE only: winding carries < 1 % of tension (Kemp 2017). Needed for
     *  Kirchhoff–Carrier (EA/2L), bends, tremolo and temperature. */
    coreEA: Param<number>;                // N
    coreYoungsModulus: Param<number>;     // Pa; Kemp ASSUMED 207 GPa, others measured 171–189
    coreDensity: Param<number>;           // kg/m³; Kemp ASSUMED 7860
    /** total/core mass per length; 1 = unwound; measured by TEARDOWN (unwind, weigh). */
    massRatioTau: Param<number>;
    thermalExpansion: Param<number>;      // 1/K; steel 11–13e-6 (Kemp). Body flex cuts real drift to ~1/3–1/2.
  };
  bendingStiffness: Param<number>;        // EI, N·m²; for wound strings FITTED
  loss: StringLoss;
  nonlinearity: "linear" | "kirchhoff-carrier" | "geometrically-exact";
  polarization: { detuneHz: Param<number>; crossCoupling: Param<number> };
  nut: NutModel;
  saddle: { slip: SlipModel };
}

// ───────────────────────── Floating tremolo (item 4) ─────────────────────────
/** Rotation about a pivot line, NOT a translating mass-spring (that was v1's error).
 *  Rotating θ changes sounding length by δ = 2·Ra·sin(θ/2)·sin(φ − θ/2); the string slips over
 *  the nut, so only δc = δ·lf/(lf + l_nut) loads it. Rest balance is TORQUE, not tension:
 *  Στ_strings(θ, string states) = τ_springs(θ) + τ_arm. All strings couple through θ, so bending
 *  one string detunes the others. Reference: Kemp 2017 (reproduced in the fixtures file). */
export interface TremoloString {
  Ra: Param<number>;                      // pivot → saddle contact, m (Kemp: 9.2–11.3 mm)
  phi: Param<number>;                     // contact angle from body, rad (Kemp: 0.95–1.13)
}

export interface FloatingTremolo {
  kind: "floating-tremolo";
  perString: TremoloString[];
  inertia: Param<number>;                 // kg·m² about the pivot: plate + saddles + block + arm
  /** Combined spring-claw torque vs angle. No published values exist: bench-measure. */
  springTorque: Param<{ theta: number; torque: number }[]>;
  pivotFriction: Param<number>;           // N·m Coulomb at posts/knife edge (return-to-pitch hysteresis)
  stops: { deckedAngle: number; maxPullAngle: number };   // Kemp full pull-up: 0.085 rad
  restAngle: number;
  coupling: "quasi-static" | "dynamic";
}

// ───────────────────────── Excitation (item 7) ─────────────────────────
export interface Tip {
  id: string;
  kind: "finger" | "nail" | "thumb" | "pick";
  material: string;                       // e.g. "polyoxymethylene (Tortex)"
  thickness?: number;                     // m (1.14 mm tested by Jasiński 2026)
  width: number;
  mass: number;
  law: PowerLaw;
  frictionStatic: Param<number>;
  frictionKinetic: Param<number>;
}

/** The reference solver is driven by a FORCE PULSE f = famp·sin²(π(t−te)/2Δ), upward, single
 *  polarization — not by tip speed. tip-trajectory (sticking → slipping → release, friction)
 *  is the physically richer path and is unvalidated against the reference. */
export type ExcitationDrive =
  | { kind: "force-pulse"; peakN: number; durationS: number; position: number; planeAngle: number }
  | { kind: "tip-trajectory"; tipId: string; position: number; planeAngle: number;
      path: { t: number; dy: number; dz: number }[] }   // tip centre vs string rest line at the pluck point
  | { kind: "wire-break"; wireDiameter: number; breakForceN: number; position: number };

/** MIDI velocity → drive. No published map was found. Pluck depth is the sensitive variable:
 *  the whole sliding→forte range was ~0.68 mm of depth in Jasiński 2026 (17 × 39.9 µm), and
 *  remounting shifted the effective contact point by SD 187 µm. */
export interface PlayerProfile {
  technique: string;
  velocityToDrive: Param<{ midiVelocity: number; peakN?: number; durationS?: number;
                           pluckDepth?: number; approachSpeed?: number }[]>;
  calibration: { method: "closed-loop-acoustic" | "open-loop-geometric" | "human-mocap";
                 remountOffsetSd?: number };
}

// ───────────────────────── Performance events ─────────────────────────
export interface FingerState {
  position: number;                       // m from nut (continuous: covers slides)
  pressure: number;                       // N; 0 = off the string
  lateral: number;                        // m along the fret direction (= bend)
}

export type PerformanceEvent =
  | { type: "pluck"; t: number; string: number; drive: ExcitationDrive }
  | { type: "finger"; t: number; string: number; target: FingerState; ramp: number }
  | { type: "damp"; t: number; string: number; position: number;
      contactLength: number; pressure: number; ramp: number }
  | { type: "harmonic-touch"; t: number; string: number; position: number; pressure: number }
  | { type: "tremolo"; t: number; angle: number };

// ───────────────────────── Electrical netlist ─────────────────────────
export type NodeId = string;               // "gnd" reserved

export type Element =
  | { id: string; kind: "R"; a: NodeId; b: NodeId; ohms: Param<number> }
  | { id: string; kind: "C"; a: NodeId; b: NodeId; farads: Param<number> }
  | { id: string; kind: "L"; a: NodeId; b: NodeId; henries: Param<number> }
  | { id: string; kind: "pot"; hi: NodeId; wiper: NodeId; lo: NodeId;
      totalOhms: Param<number>; taper: Param<{ pos: number; fraction: number }[]>; setting: number }
  /** Expands to a −dΦ/dt source in series with the pickup's CoilModel network. */
  | { id: string; kind: "pickup"; pickupId: string; plus: NodeId; minus: NodeId }
  | { id: string; kind: "switch"; a: NodeId; b: NodeId }
  | { id: string; kind: "cable"; a: NodeId; b: NodeId;
      seriesOhms: Param<number>; shuntFarads: Param<number> };

export interface Netlist {
  elements: Element[];
  out: { plus: NodeId; minus: NodeId };
  solver: { kind: "mna"; integration: "trapezoidal" | "backward-euler" };
}

/** Pickup combinations are circuit topologies, not summed voltages. */
export interface Selector {
  positions: { name: string; closed: string[] }[];
  position: number;
}

// ───────────────────────── Pickups (items 5 & 6) ─────────────────────────
/** Coil as a circuit, NOT a table of L(f). Apparent frequency-dependent inductance comes from
 *  eddy-current loss + leakage (a one-turn shorted secondary: Re in series with Lleak, across L)
 *  and parallel loss; a table is non-causal in the time-domain netlist solver.
 *  Fit to a measured complex impedance sweep (I–V method), not a 1 kHz LCR reading.
 *  Some Strat pickups show a 2nd resonance near 100–150 kHz → add ladder sections. */
export interface CoilModel {
  Rdc: Param<number>;
  L: Param<number>;                       // low-frequency magnetizing inductance, H
  C: Param<number>;                       // self-capacitance, F
  eddy: Param<{ Re: number; Lleak: number }>;
  Rp: Param<number>;                      // parallel loss, Ω
  ladder?: Param<{ L: number; C: number; R: number }[]>;
  impedanceTarget: Param<{ hz: number; re: number; im: number }[]>;
  maxFitErrorDb: number;
}

/** Novak et al. 2018: simple Hammerstein (static NL then d/dt) is sufficient; generalized
 *  Hammerstein converged back to it. NL(x) = A[(x+Leq)/∛(req²+(x+Leq)²) − x/∛(req²+x²)],
 *  x = instantaneous string–pole distance, so rest height d0 only picks the curve position.
 *  A absorbs turns N, remanence and string properties (so `turns` is not a separate input).
 *  Measured on ONE pole (low E), VERTICAL axis only, 60–400 Hz, a short string piece. */
export interface PickupFlux {
  kind: "novak-static-nl";
  A: Param<number>;                       // unit not stated in the paper's text: refit, don't copy
  Leq: Param<number>;                     // m
  req: Param<number>;                     // m
}

export interface StringPull {
  /** Static attraction vs pole–string height. No peer-reviewed force data found. */
  staticForce: Param<{ height: number; newtons: number }[]>;
  /** Eddy-current drag on the moving string; null = unmeasured (only lecture-note theory exists). */
  eddyDrag: Param<{ height: number; sPerM: number }[]> | null;
}

export interface PolePiece {
  string: number;
  lateral: number;
  height: Param<number>;
  /** Pole-top → string measured with the string at rest or fretted at the last fret — record which. */
  heightReference: "string-at-rest" | "string-fretted-last-fret";
  flux: PickupFlux;
  /** Horizontal-axis sensitivity relative to vertical; null = no literature measurement. */
  lateralResponse: Param<number> | null;
  pull: StringPull;
  poleFieldTesla?: Param<number>;
}

export interface MagneticPickup {
  id: string;
  xFromSaddle: Param<number>;
  aperture: Param<number>;
  poles: PolePiece[];
  polarity: 1 | -1;
  coil: CoilModel;
}

export interface MagneticRig {
  kind: "strat" | "pbass";
  pickups: MagneticPickup[];
  circuit: Netlist;
  selector: Selector;
}

// ───────────────────────── Acoustic transducer ─────────────────────────
export interface BodyMode {
  hz: number;
  zeta: number;
  modalMass: number;                      // kg
  bridgeShape: number[];                  // 2·nStrings: [string][plane] flattened
}

export interface MicPerspective {
  position: { x: number; y: number; z: number };
  modalGain: Param<number[]>;
  residualIR: Param<{ fs: number; samples: Float32Array }> | null;
}

export interface AcousticTransducer {
  kind: "acoustic";
  modes: Param<BodyMode[]>;
  mics: Record<string, MicPerspective>;
}

// ───────────────────────── Solvers ─────────────────────────
export type StringSolver =
  | { kind: "fd-sav"; fs: number; oversample: 1 | 2 | 4 | 8;
      /** "min-stable" = h from the DAFx24 bound h ≥ h_min (eq. 47), N = ⌊L/h⌋ per string. */
      h: "min-stable" | number; scheme: "sav" | "iqe";
      gauge: number;                      // ε in the gradient normalisation (machine epsilon in DAFx24)
      positivityConstraint: boolean }     // M₋ψ ≥ 0 scaling; stops SAV drift / sign flips
  | { kind: "modal"; fs: number; modesPerString: number }
  | { kind: "waveguide"; fs: number; dispersionAllpassOrder: number;
      fractionalDelay: "lagrange" | "thiran" | "allpass" };

// ───────────────────────── Gates ─────────────────────────
export interface Gate {
  id: string;
  metric: "cents" | "t60-rel-error" | "inharmonicity-rel-error" | "modal-hz-rel-error"
        | "modal-q-rel-error" | "mr-stft-distance" | "abx-p-value"
        | "tremolo-cents-error" | "pickup-nl-rel-error" | "coil-impedance-db-error";
  subject: "reference-vs-recording" | "realtime-vs-reference" | "instrument-vs-recording"
         | "solver-vs-literature";
  /** null = not yet derivable; the build FAILS while any gate is null. */
  threshold: number | null;
  basis: "repeatability" | "reference-vs-recording" | "fixed";
  noiseFloor: MeasurementId[];
}

// ───────────────────────── Instrument ─────────────────────────
interface InstrumentBase {
  id: string;
  strings: StringSpec[];
  fretboard: Fretboard;
  finger: FretFinger;
  contact: ContactModel;
  tips: Tip[];
  players: PlayerProfile[];
  solvers: { reference: StringSolver; realtime: StringSolver[] };
  gates: Gate[];
}

export interface AcousticInstrument extends InstrumentBase {
  kind: "acoustic";
  bridge: { kind: "body-admittance" };
  transducer: AcousticTransducer;
}

export interface ElectricInstrument extends InstrumentBase {
  kind: "strat" | "pbass";
  bridge: { kind: "rigid" } | FloatingTremolo;
  transducer: MagneticRig;
}

export type Instrument = AcousticInstrument | ElectricInstrument;

// ───────────────────────── Sensor calibration & measurements (item 8) ─────────────────────────
export type CalibrationStandard =
  | "IEC 61094-2"      // primary pressure reciprocity, LS microphones
  | "IEC 61094-5"      // working-standard microphones by comparison
  | "IEC 60942"        // sound calibrators
  | "ISO 16063-11"     // primary vibration calibration, laser interferometry
  | "ISO 16063-21"     // vibration transducers by comparison
  | "manufacturer"
  | "none";

export interface SensorCalibration {
  standard: CalibrationStandard;
  certificateId?: string;
  calibratedOn: string;                   // ISO 8601
  unit: string;                           // V/Pa, V/(m/s²), V/(m/s)
  /** Complex sensitivity: magnitude AND phase, since inter-channel timing is analysed. */
  response: { hz: number; magnitude: number; phaseRad: number }[];
  uncertaintyK2: number;                  // relative, k = 2
  validHz: [number, number];              // must cover the analysed band
}

export interface SignalChain {
  conditioner?: string;
  adc: string;
  fs: number;
  groupDelayS: number;                    // measured per channel (Novak 2018: 0.23 ms accel-vs-pickup)
  polarity: 1 | -1;                       // LDV and pickups see opposite sides: inverted
  inputImpedance?: { R: number; C: number };  // loads a pickup, so it is part of the pickup response
  cableCapacitance?: number;
}

export interface OpticalTarget {
  massKg: number;                         // 0.0056 g tape ≈ 0.1 % of an E2 string still changed decay + spectrum
  areaM2: number;
  position: number;
}

export interface Sensor {
  kind: "pickup-di" | "mic" | "accelerometer" | "laser-vibrometer"
      | "force-transducer" | "position-sensor" | "lcr-meter" | "impedance-analyzer";
  model: string;
  serial: string;
  position: { x: number; y: number; z: number };
  axis: "vertical" | "horizontal" | "omni";
  calibration: SensorCalibration;
  chain: SignalChain;
  /** LDV needs a retroreflective target; it is invasive, so it is never a neutral reference. */
  intrusive?: OpticalTarget;
  /** A pickup used as a sensor is NOT calibrated unless its own transfer function is measured. */
  pickupId?: string;
}

export interface Measurement {
  id: MeasurementId;
  instrumentId: string;
  kind: "string-pluck" | "bridge-mobility" | "body-radiation" | "pickup-response" | "pickup-nl-sweep"
      | "coil-impedance" | "pot-sweep" | "cable" | "tremolo-torque" | "tremolo-pitch"
      | "string-teardown" | "fret-contact" | "magnetic-pull" | "noise-floor";
  string?: number;
  fret?: number;
  excitation: { kind: "plucker-rig" | "wire-break" | "pendulum" | "hand" | "impact-hammer" | "shaker";
                actual: ExcitationDrive | null; forceTraceFile?: string; positionTraceFile?: string };
  /** Remounting moved the effective plectrum–string contact by SD 187 µm even after caliper checks. */
  mount: { mountId: string; remountIndex: number; closedLoop: boolean; effectiveOffsetM?: number };
  sensors: { sensor: Sensor; file: string }[];
  fs: number;
  bits: 24 | 32;
  stringState: { brand: string; gauge: number; hoursSinceInstall: number;
                 measuredTension?: number; openHz: number };
  environment: { tempC: number; relHumidityPct: number };
  repeats: number;
  capturedAt: string;
  sha256: string;
}

// ───────────────────────── Provenance report ─────────────────────────
export function nonMeasured(root: unknown, path = ""): string[] {
  const out: string[] = [];
  if (root && typeof root === "object") {
    const o = root as Record<string, unknown>;
    if (typeof o.src === "string" && "v" in o) {
      if (o.src === "nominal" || o.src === "hand-tuned") out.push(`${path} (${o.src})`);
      return out;
    }
    for (const [k, v] of Object.entries(o)) out.push(...nonMeasured(v, path ? `${path}.${k}` : k));
  }
  return out;
}
