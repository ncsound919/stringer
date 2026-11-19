/**
 * Literature fixtures + reference implementations for the guitar-engine schema.
 * Each block states its source and what is ASSUMED vs MEASURED in that source.
 * Run: tsc --strict --target es2020 --module commonjs guitar-engine-fixtures.ts && node guitar-engine-fixtures.js
 */

// ───────────── Kemp 2017, PLOS ONE 12(9):e0184803 — Strat tremolo pitch ─────────────
// Rotation of bridge/block about a pivot. Strings slip over the nut, so only a
// fraction of the sounding-length change loads the string: δc = δ·lf/(lf+lnut).
// Strat: American Standard 2-post tremolo, D'Addario EXL120 9–42.
// ASSUMED in the paper (not measured): E_core = 207 GPa, ρ_core = 7860 kg/m³.
// (The paper notes unwound-string E measured by others is 171–189 GPa.)
export interface KempString {
  name: string;
  nuHz: number;       // open pitch, measured
  lf: number;         // m, sounding length, ±1 mm
  lnut: number;       // m, nut → tuning peg, ±0.5 mm
  Ra: number;         // m, pivot → saddle contact, ±0.1 mm
  phi: number;        // rad, ±0.01
  tau: number;        // total/core mass per length (1 = unwound); from Table 2, destructive teardown
  // Published results for θ = 0.085 rad full pull-up:
  expectCentsTheory: number;
  expectCentsMeasured: number;  // ±6 cents (tuner resolution)
}

export const KEMP_E = 207e9;
export const KEMP_RHO = 7860;
export const KEMP_THETA = 0.085;
export const KEMP_STRINGS: KempString[] = [
  { name: "E4", nuHz: 329.6, lf: 0.6478, lnut: 0.1591, Ra: 0.0092, phi: 1.13, tau: 1.0,  expectCentsTheory: 101, expectCentsMeasured: 105 },
  { name: "B3", nuHz: 246.9, lf: 0.6483, lnut: 0.1354, Ra: 0.0099, phi: 1.11, tau: 1.0,  expectCentsTheory: 187, expectCentsMeasured: 185 },
  { name: "G3", nuHz: 196.0, lf: 0.6496, lnut: 0.1123, Ra: 0.0113, phi: 1.04, tau: 1.0,  expectCentsTheory: 310, expectCentsMeasured: 300 },
  { name: "D3", nuHz: 146.8, lf: 0.6490, lnut: 0.0879, Ra: 0.0110, phi: 1.09, tau: 2.76, expectCentsTheory: 220, expectCentsMeasured: 222 },
  { name: "A2", nuHz: 110.0, lf: 0.6496, lnut: 0.0645, Ra: 0.0107, phi: 1.01, tau: 3.59, expectCentsTheory: 277, expectCentsMeasured: 285 },
  { name: "E2", nuHz: 82.4,  lf: 0.6501, lnut: 0.0411, Ra: 0.0106, phi: 0.95, tau: 4.76, expectCentsTheory: 348, expectCentsMeasured: 356 },
];

/** Engineering strain Δl/lf needed to reach pitch nu (Kemp eq. 24, core carries all tension). */
export function kempStrain(s: KempString, E = KEMP_E, rho = KEMP_RHO): number {
  const r = (rho * s.tau * (2 * s.lf * s.nuHz) ** 2) / E;
  return 1 + (1 - Math.sqrt(1 + 4 * r)) / (2 * r);
}

/** Pitch change in cents for a bridge rotation θ about the pivot (Kemp eqs. 28–31). */
export function kempTremoloCents(s: KempString, theta: number, lnutOverride?: number): number {
  const lnut = lnutOverride ?? s.lnut;
  const dl = kempStrain(s) * s.lf;
  const delta = 2 * s.Ra * Math.sin(theta / 2) * Math.sin(s.phi - theta / 2);
  const deltaC = delta * (s.lf / (s.lf + lnut));
  const ratio = (1 / (1 + delta / s.lf)) * Math.sqrt((1 + deltaC / dl) * (1 + deltaC / s.lf));
  return 1200 * Math.log2(ratio);
}

// ───────────── Novak et al., DAFx-18 paper 39 — pickup static nonlinearity ─────────────
// Measured: 8 cm string piece, 1 mm diameter, on a shaker, in front of the LOW-E pole piece,
// vertical axis only, 60–400 Hz. Output u = d/dt NL(x), x = instantaneous string–pole distance.
// d0 (rest distance) is NOT a pickup parameter; only the curve position changes.
// A's unit is not stated in the extracted text (plots: mV·s vs mm). A absorbs N and Br.
export interface NovakFit { pickup: string; A: number; Leq_mm: number; req_mm: number }
export const NOVAK_FITS: NovakFit[] = [
  { pickup: "Seymour Duncan SSL-5 (single coil)",  A: 21.51e3, Leq_mm: 12.98, req_mm: 2.77 },
  { pickup: "Seymour Duncan SH-2N (humbucker)",    A: 40.67e3, Leq_mm: 9.86,  req_mm: 1.34 },
  { pickup: "Seymour Duncan STHR-1B (Hot Rails)",  A: 47.46e3, Leq_mm: 13.11, req_mm: 1.88 },
];
const cbrt = (v: number) => Math.cbrt(v);
export function novakNL(f: NovakFit, x: number): number {
  const L = f.Leq_mm, r2 = f.req_mm ** 2;
  return f.A * ((x + L) / cbrt(r2 + (x + L) ** 2) - x / cbrt(r2 + x * x));
}
/** Analytic dNL/dx (paper eq. 9, re-derived here). */
export function novakDNL(f: NovakFit, x: number): number {
  const L = f.Leq_mm, r2 = f.req_mm ** 2;
  const g = (y: number) => (y * y + 3 * r2) / (3 * (y * y + r2) ** (4 / 3));
  return f.A * (g(x + L) - g(x));
}

// ───────────── Bilbao et al., DAFx24 paper 50 — fret positions ─────────────
/** Equal-temperament fret positions from the nut: x_q = L(1 − 2^(−q/12)). Measured positions override. */
export function fretPositions(L: number, nFrets: number): number[] {
  return Array.from({ length: nFrets + 1 }, (_, q) => L * (1 - 2 ** (-q / 12)));
}

// ───────────── Self-test ─────────────
declare const require: { main?: unknown } | undefined;
declare const module: unknown;
declare const process: { exit(code: number): never };

function selfTest(): boolean {
  let ok = true;
  const check = (label: string, pass: boolean, detail: string) => {
    if (!pass) ok = false;
    console.log(`${pass ? "PASS" : "FAIL"}  ${label}  ${detail}`);
  };

  for (const s of KEMP_STRINGS) {
    const strainPct = kempStrain(s) * 100;
    const cents = kempTremoloCents(s, KEMP_THETA);
    check(`Kemp ${s.name} cents vs paper theory`, Math.abs(cents - s.expectCentsTheory) <= 2,
      `got ${cents.toFixed(1)}, paper ${s.expectCentsTheory} (measured ${s.expectCentsMeasured}±6), strain ${strainPct.toFixed(3)}%`);
  }
  // Paper claims: locking nut (lnut→0) raises sensitivity; Table 3 gives E4 125, G3 354.
  const e4 = KEMP_STRINGS[0], g3 = KEMP_STRINGS[2];
  check("Kemp locking nut E4", Math.abs(kempTremoloCents(e4, KEMP_THETA, 0) - 125) <= 3, `got ${kempTremoloCents(e4, KEMP_THETA, 0).toFixed(1)}, paper 125`);
  check("Kemp locking nut G3", Math.abs(kempTremoloCents(g3, KEMP_THETA, 0) - 354) <= 3, `got ${kempTremoloCents(g3, KEMP_THETA, 0).toFixed(1)}, paper 354`);

  for (const f of NOVAK_FITS) {
    let worst = 0;
    for (let x = 2; x <= 14; x += 0.5) {
      const h = 1e-4;
      const num = (novakNL(f, x + h) - novakNL(f, x - h)) / (2 * h);
      worst = Math.max(worst, Math.abs(num - novakDNL(f, x)) / Math.abs(novakDNL(f, x)));
    }
    check(`Novak ${f.pickup}: analytic dNL/dx = numeric`, worst < 1e-5, `max rel err ${worst.toExponential(2)}`);
  }

  const fp = fretPositions(0.648, 24);
  check("Fret 12 at half scale length", Math.abs(fp[12] - 0.324) < 1e-9, `x12=${fp[12].toFixed(6)} m`);
  return ok;
}

if (typeof require !== "undefined" && typeof module !== "undefined" && require.main === module) {
  process.exit(selfTest() ? 0 : 1);
}
