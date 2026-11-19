#pragma once

#include <juce_audio_basics/juce_audio_basics.h>

#include <array>
#include <cmath>
#include <vector>

// ---------------------------------------------------------------------------
// FORMÉ engine.
//
// Signal path per instrument:
//   acoustic : waveguide string -> bridge force -> modal body bank -> capture taps
//   strat    : waveguide string -> per-pickup sensing (position comb, aperture)
//              -> coil resonance -> passive volume/tone -> cable loading
//   p bass   : as strat, split-coil halves at their own sensing positions,
//              per-fret loss profile
//
// The string is a digital waveguide: fractional delay line + loop lowpass +
// cascaded allpass dispersion (stiffness) + loop gain derived from T60.
// ---------------------------------------------------------------------------

namespace forme
{

constexpr int kMaxStrings = 6;
constexpr int kMaxVoices  = 12;
constexpr int kMaxModes   = 12;
constexpr int kDelaySize  = 8192;

inline float fastTanh (float x) noexcept
{
    const float x2 = x * x;
    return x * (27.0f + x2) / (27.0f + 9.0f * x2);
}

struct OnePole
{
    float z = 0.0f;
    void reset() noexcept { z = 0.0f; }
    inline float lp (float x, float a) noexcept { z += a * (x - z); return z; }
};

struct Allpass1
{
    float a = 0.0f, x1 = 0.0f, y1 = 0.0f;

    void reset() noexcept { x1 = y1 = 0.0f; }

    inline float process (float x) noexcept
    {
        const float y = a * x + x1 - a * y1;
        x1 = x;
        y1 = y;
        return y;
    }

    // Low-frequency group delay of the allpass, used to keep tuning honest.
    float phaseDelay() const noexcept { return a > -0.999f ? (1.0f - a) / (1.0f + a) : 1.0f; }
};

// 4-point Lagrange fractional delay.
class DelayLine
{
public:
    void prepare (int size)
    {
        n = juce::jmax (8, size);
        buf.assign ((size_t) n, 0.0f);
        w = 0;
    }

    void clear() noexcept
    {
        std::fill (buf.begin(), buf.end(), 0.0f);
        w = 0;
    }

    inline void write (float x) noexcept
    {
        buf[(size_t) w] = x;
        if (++w >= n) w = 0;
    }

    inline float read (float delaySamples) const noexcept
    {
        const float d = juce::jlimit (1.0f, (float) n - 3.0f, delaySamples);
        const int   i = (int) d;
        const float f = d - (float) i;

        const auto at = [this] (int k) noexcept
        {
            int idx = w - k;
            while (idx < 0) idx += n;
            return buf[(size_t) idx];
        };

        const float xm1 = at (i - 1);
        const float x0  = at (i);
        const float x1  = at (i + 1);
        const float x2  = at (i + 2);

        const float c0 = -f * (f - 1.0f) * (f - 2.0f) / 6.0f;
        const float c1 =  (f + 1.0f) * (f - 1.0f) * (f - 2.0f) / 2.0f;
        const float c2 = -(f + 1.0f) * f * (f - 2.0f) / 2.0f;
        const float c3 =  (f + 1.0f) * f * (f - 1.0f) / 6.0f;

        return c0 * xm1 + c1 * x0 + c2 * x1 + c3 * x2;
    }

    int size() const noexcept { return n; }

private:
    std::vector<float> buf;
    int n = 0, w = 0;
};

// Cytomic topology-preserving SVF.
struct Svf
{
    float g = 0.0f, k = 1.0f, a1 = 0.0f, a2 = 0.0f, a3 = 0.0f;
    float ic1 = 0.0f, ic2 = 0.0f;

    void set (float freqHz, float q, double sr) noexcept
    {
        const float nyq = (float) sr * 0.47f;
        const float f   = juce::jlimit (10.0f, nyq, freqHz);
        g  = std::tan (juce::MathConstants<float>::pi * f / (float) sr);
        k  = 1.0f / juce::jmax (0.05f, q);
        a1 = 1.0f / (1.0f + g * (g + k));
        a2 = g * a1;
        a3 = g * a2;
    }

    void reset() noexcept { ic1 = ic2 = 0.0f; }

    inline void step (float v0, float& bp, float& lp) noexcept
    {
        const float v3 = v0 - ic2;
        const float v1 = a1 * ic1 + a2 * v3;
        const float v2 = ic2 + a2 * ic1 + a3 * v3;
        ic1 = 2.0f * v1 - ic1;
        ic2 = 2.0f * v2 - ic2;
        bp = v1;
        lp = v2;
    }
};

// ---------------------------------------------------------------------------
// One vibrating string with two polarisations.
// ---------------------------------------------------------------------------
struct StringSetup
{
    float freq            = 110.0f;
    float brightness      = 0.5f;   // 0 dark .. 1 bright
    float t60             = 3.0f;
    float inharmonicity   = 0.3f;
    float detuneCents     = 4.0f;
    float pluckPos        = 0.14f;
    float force           = 0.6f;
    int   dispersionStages = 2;
    float extraDamping    = 0.0f;   // palm mute / dead note
    float harmonicBias    = 0.0f;  // >0 suppresses the fundamental (natural harmonic)
    float fretNoise       = 0.22f;  // fret click/buzz excitation strength (0..1)
    float glideSecs       = 0.15f;  // pitch glide time for bends/portamento
};

class StringVoice
{
public:
    void prepare (double sampleRate)
    {
        sr = sampleRate;
        for (auto& l : line) l.prepare (kDelaySize);
        reset();
    }

    void reset() noexcept
    {
        for (auto& l : line) l.clear();
        for (auto& a : disp) for (auto& s : a) s.reset();
        lpf[0].reset();
        lpf[1].reset();
        active = false;
        bendSemis = 0.0f;
        releaseGain = 1.0f;
    }

    bool isActive() const noexcept { return active; }

    void start (const StringSetup& s, juce::uint32 seed)
    {
        baseFreq   = s.freq;
        brightness = s.brightness;
        stages     = juce::jlimit (1, 3, s.dispersionStages);
        bendSemis  = 0.0f;

        const float detuneRatio = std::pow (2.0f, s.detuneCents / 1200.0f);

        // Dispersion coefficients first: lengthFor() compensates their phase
        // delay, so the loop must be tuned against the current stiffness.
        const float dispA = juce::jlimit (-0.75f, 0.75f, 0.62f * s.inharmonicity);
        for (int p = 0; p < 2; ++p)
            for (int sIdx = 0; sIdx < 3; ++sIdx)
            {
                disp[p][sIdx].reset();
                disp[p][sIdx].a = (sIdx < stages) ? dispA * (float) (stages - sIdx) / (float) stages : 0.0f;
            }

        for (int p = 0; p < 2; ++p)
        {
            const float f = (p == 0) ? baseFreq : baseFreq * detuneRatio;
            delay[p] = lengthFor (f);
            lpf[p].reset();
        }

        // Loop damping: lowpass coefficient and the gain that lands on T60.
        const float damp = juce::jlimit (0.02f, 0.85f, 0.05f + 0.75f * brightness)
                            + 0.14f * s.extraDamping;
        dampCoef  = juce::jlimit (0.02f, 0.95f, damp);
        const float t60 = juce::jmax (0.08f, s.t60 * (1.0f - 0.92f * s.extraDamping));

        loopGain = 0.0f;
        for (int p = 0; p < 2; ++p)
        {
            const float period = delay[p] / (float) sr;
            const float g = std::pow (10.0f, -3.0f * period / t60);
            loopGain = (p == 0) ? g : loopGain;
        }

        harmonicBias = s.harmonicBias;
        releaseGain = 1.0f;
        level       = 1.0f;
        rngState    = seed | 1u;

        fillPluck (juce::jlimit (0.02f, 0.48f, s.pluckPos), juce::jlimit (0.0f, 1.0f, s.force));
        fretNoiseEnv = juce::jlimit (0.0f, 2.0f, s.fretNoise);

        // Glide coefficient: one-pole per sample. 0 s => immediate (bend path
        // still smooths at its old 0.0016 rate).
        const float glideSecs = juce::jmax (0.0f, s.glideSecs);
        glideCoef = (glideSecs > 0.001f)
            ? juce::jlimit (0.0005f, 0.95f, 1.0f - std::exp (-1.0f / (glideSecs * (float) sr)))
            : 1.0f;

        active = true;
    }

    void setLevel (float l) noexcept { level = juce::jlimit (0.0f, 2.0f, l); }

    void release (float dampingScale)
    {
        releaseGain = 1.0f - juce::jlimit (0.0f, 1.0f, dampingScale) * 0.35f;
    }

    void kill() noexcept { active = false; }

    void setBend (float semitones) noexcept
    {
        bendSemis = juce::jlimit (-24.0f, 24.0f, semitones);
    }

    void updateBend()
    {
        if (! active) return;
        const float f = baseFreq * std::pow (2.0f, bendSemis / 12.0f);
        // Slow one-pole glide so bending does not click; glide time widens it.
        const float coef = std::max (0.0016f, glideCoef);
        for (int p = 0; p < 2; ++p)
        {
            const float target = lengthFor (f) * (p == 1 ? 1.0f : 1.0f);
            delay[p] += (target - delay[p]) * coef;
        }
    }

    inline float tick (float excitation = 0.0f) noexcept
    {
        float out = 0.0f;

        for (int p = 0; p < 2; ++p)
        {
            // Bridge admittance feedback enters the loop (body -> string coupling).
            float y = line[p].read (delay[p]) + excitation * (p == 0 ? 1.0f : 0.8f);
            y = lpf[p].lp (y, dampCoef);

            for (int sIdx = 0; sIdx < stages; ++sIdx)
                y = disp[p][sIdx].process (y);

            if (harmonicBias > 0.0f)
                y -= harmonicBias * 0.5f * y;

            y *= loopGain * releaseGain;
            line[p].write (y);
            out += y * (p == 0 ? 0.72f : 0.28f);
        }

        if (fretNoiseEnv > 1e-4f)
        {
            // Fret-noise burst: high-frequency buzz ramping down over ~40 ms.
            out += (nextRandom() - 0.5f) * 0.08f * fretNoiseEnv;
            fretNoiseEnv *= 0.945f;
        }

        return out * level;
    }

    // Displacement sensed at a position along the string (0 = bridge, 1 = nut).
    inline float sense (float posRatio) const noexcept
    {
        const float tap = juce::jlimit (0.01f, 0.95f, posRatio) * delay[0];
        return line[0].read (juce::jmax (1.0f, delay[0] - tap));
    }

    float frequency() const noexcept { return baseFreq; }

private:
    float lengthFor (float f) const noexcept
    {
        // Compensate loop filter + dispersion phase delay so the pitch is right.
        float comp = 0.5f;
        for (int sIdx = 0; sIdx < stages; ++sIdx)
            comp += juce::jmax (0.0f, disp[0][sIdx].phaseDelay() - 0.0f) - 0.0f;

        return juce::jlimit (2.0f, (float) kDelaySize - 8.0f, (float) sr / f - comp);
    }

    void fillPluck (float pos, float force)
    {
        const int N    = (int) std::round (delay[0]);
        const int peak = juce::jlimit (1, juce::jmax (1, N - 1), (int) (pos * (float) N));
        const float amp = 0.35f * (0.15f + force);

        for (auto& l : line) l.clear();

        for (int i = 0; i < N; ++i)
        {
            const float t = (float) i / (float) N;
            const float v = (t < pos) ? (t / juce::jmax (0.001f, pos))
                                      : ((1.0f - t) / juce::jmax (0.001f, 1.0f - pos));
            // A little noise in the initial condition stands in for pick texture.
            const float noise = (nextRandom() - 0.5f) * 0.012f;
            line[0].write (v * amp + noise);
            line[1].write (v * amp - noise);
        }
    }

    float nextRandom() noexcept
    {
        rngState = rngState * 1664525u + 1013904223u;
        return (float) ((rngState >> 8) & 0xFFFF) / 65535.0f;
    }

    double sr = 48000.0;
    DelayLine line[2];
    Allpass1 disp[2][3];
    OnePole lpf[2];
    float baseFreq = 110.0f, delay[2] { 100.0f, 100.0f };
    float dampCoef = 0.4f, loopGain = 0.99f;
    float brightness = 0.5f, bendSemis = 0.0f, releaseGain = 1.0f, harmonicBias = 0.0f, level = 1.0f;
    float fretNoiseEnv = 0.0f;  // fret-noise burst envelope (per sample, decays)
    float glideCoef = 1.0f;      // per-sample portamento coefficient
    int   stages = 2;
    bool  active = false;
    juce::uint32 rngState = 1u;
};

// ---------------------------------------------------------------------------
// Modal body / soundboard.
// ---------------------------------------------------------------------------
class BodyModel
{
public:
    void prepare (double sampleRate)
    {
        sr = sampleRate;
        for (auto& m : modes) m.reset();
        activeCount = 0;
    }

    void setProfile (int instrument, float resonance, float qScale, float air, int count)
    {
        static const float acoustic[kMaxModes] = {  98.0f, 190.0f, 262.0f, 372.0f, 512.0f, 688.0f,
                                                  880.0f, 1090.0f, 1360.0f, 1680.0f, 2050.0f, 2500.0f };
        static const float electric[kMaxModes] = { 180.0f, 320.0f, 470.0f, 640.0f, 820.0f, 1050.0f,
                                                  1300.0f, 1600.0f, 1950.0f, 2300.0f, 2700.0f, 3200.0f };
        static const float bass[kMaxModes] =     {  62.0f, 118.0f, 168.0f, 240.0f, 330.0f, 450.0f,
                                                   590.0f, 760.0f, 960.0f, 1200.0f, 1500.0f, 1900.0f };

        const float* table = (instrument == 0) ? acoustic : (instrument == 2 ? bass : electric);

        activeCount = juce::jlimit (1, kMaxModes, count);
        bodyGain    = (instrument == 0) ? 0.85f : (instrument == 2 ? 0.42f : 0.10f);

        for (int i = 0; i < activeCount; ++i)
        {
            float f = table[i];
            if (instrument == 0 && i == 0 && air > 0.0f)
                f *= 0.85f + 0.35f * air;   // Helmholtz air mode moves with cavity volume

            const float q = juce::jmax (1.2f, (3.0f + 9.0f * qScale) * (1.0f - 0.5f * (float) i / (float) activeCount));
            modes[i].set (f, q, sr);

            // Amplitude rolls off with mode index; resonance is a macro over the bank.
            const float rolloff = 1.0f / (1.0f + 0.35f * (float) i);
            gains[i] = resonance * rolloff / (1.0f + 0.15f * (float) i);
        }

        airGain = air * 0.7f;
    }

    void reset() noexcept { for (auto& m : modes) m.reset(); }

    inline float process (float in) noexcept
    {
        float sum = 0.0f;
        for (int i = 0; i < activeCount; ++i)
        {
            float bp, lp;
            modes[i].step (in, bp, lp);
            sum += bp * gains[i];
        }
        return in * (1.0f - 0.35f * airGain) + sum * bodyGain;
    }

private:
    Svf modes[kMaxModes];
    float gains[kMaxModes] {};
    double sr = 48000.0;
    int activeCount = 0;
    float bodyGain = 0.5f, airGain = 0.0f;
};

// ---------------------------------------------------------------------------
// Magnetic pickup + passive circuit.
// ---------------------------------------------------------------------------
class PickupModel
{
public:
    void prepare (double sampleRate)
    {
        sr = sampleRate;
        coil.reset();
        aperture.reset();
    }

    void set (float heightNorm, float inductanceNorm, float cableNorm, float level, float coupling)
    {
        // Body coupling: how much string signal enters the pickup (bridge feedback path).
        this->coupling = coupling;

        // Coil resonance: L 1.6..4.2 H against cable + parasitic capacitance.
        const float L = 1.6f + 2.6f * juce::jlimit (0.0f, 1.0f, inductanceNorm);
        const float C = 180e-12f + 900e-12f * juce::jlimit (0.0f, 1.0f, cableNorm);
        const float f0 = 1.0f / (2.0f * juce::MathConstants<float>::pi * std::sqrt (L * C));
        const float q  = juce::jlimit (1.2f, 6.0f, 2.4f + 2.2f * (1.0f - cableNorm));

        coil.set (juce::jlimit (900.0f, 9000.0f, f0), q, sr);

        // Closer to the string: more flux, slightly more edge.
        gain  = level * (0.55f + 0.9f * heightNorm);
        drive = 1.0f + 1.4f * heightNorm;

        // Aperture averaging (sensing width) as a short box filter.
        apertureCoef = juce::jlimit (0.25f, 0.95f, 0.92f - 0.4f * heightNorm);
    }

    inline float process (float in) noexcept
    {
        const float shaped = fastTanh (in * drive) / drive;
        const float avg    = aperture.lp (shaped, apertureCoef);
        float bp, lp;
        coil.step (avg, bp, lp);
        return (lp * 0.55f + bp * 0.45f) * gain * (1.0f + coupling);
    }

    void reset() noexcept { coil.reset(); aperture.reset(); }

private:
    Svf coil;
    OnePole aperture;
    double sr = 48000.0;
    float gain = 1.0f, drive = 1.0f, apertureCoef = 0.6f, coupling = 0.0f;
};

struct PassiveCircuit
{
    OnePole toneLp;

    void reset() noexcept { toneLp.reset(); }

    void set (float toneNorm, float capMicroFarads, double sampleRate)
    {
        const float cap = juce::jmax (0.001f, capMicroFarads) * 1.0e-6f;
        const float r   = 2500.0f + 245000.0f * std::pow (1.0f - juce::jlimit (0.0f, 1.0f, toneNorm), 2.2f);
        const float fc  = 1.0f / (2.0f * juce::MathConstants<float>::pi * r * cap);
        const float nyq = 20000.0f;
        const float f   = juce::jlimit (220.0f, nyq, fc);
        // One-pole coefficient for a 1st order RC lowpass at the host rate.
        const float dt  = 1.0f / juce::jmax (8000.0f, (float) sampleRate);
        const float a   = juce::jlimit (0.002f, 0.999f, dt / (1.0f / (2.0f * juce::MathConstants<float>::pi * f) + dt));
        coef = a;
    }

    inline float process (float x, float volume) noexcept
    {
        const float g = std::pow (juce::jlimit (0.0f, 1.0f, volume), 2.2f);
        return toneLp.lp (x, coef) * g;
    }

    float coef = 0.5f;
};

// ---------------------------------------------------------------------------
// Fretboard assignment
// ---------------------------------------------------------------------------
enum class AssignMode { automatic = 0, lowestPosition, nearestPosition, stringLocked };

struct Assignment { int stringIdx = 0; int fret = -1; };

struct Fretboard
{
    int nStrings = 6;
    int nFrets   = 22;
    std::array<double, kMaxStrings> openHz { 82.41, 110.0, 146.83, 196.0, 246.94, 329.63 };

    static double midiToHz (int note) { return 440.0 * std::pow (2.0, (note - 69) / 12.0); }

    Assignment assign (int midiNote, AssignMode mode, const std::array<int, kMaxStrings>& previous) const
    {
        Assignment best;
        float bestCost = 1.0e9f;

        for (int s = 0; s < nStrings; ++s)
        {
            // Fret for this string, from the string's open pitch.
            const int openNote = (int) std::lround (69.0 + 12.0 * std::log2 (openHz[(size_t) s] / 440.0));
            const int fret = midiNote - openNote;
            if (fret < 0 || fret > nFrets) continue;

            float cost = (float) fret;

            if (mode == AssignMode::automatic)
            {
                cost += (fret == 0) ? 0.6f : 0.0f;             // prefer stopped notes
                cost += 0.28f * (float) s;                      // prefer lower strings
            }
            else if (mode == AssignMode::lowestPosition)
            {
                cost += 0.05f * (float) s;
            }
            else if (mode == AssignMode::nearestPosition)
            {
                const int prev = previous[(size_t) s];
                if (prev >= 0)
                    cost += 1.1f * (float) std::abs (fret - prev);
                else
                    cost += 0.5f * (float) s;
            }
            else // stringLocked: keep to the string used last
            {
                const int prev = previous[(size_t) s];
                cost += (prev >= 0) ? 0.0f : 6.0f;
            }

            if (cost < bestCost)
            {
                bestCost = cost;
                best.stringIdx = s;
                best.fret = fret;
            }
        }

        return best;
    }
};

// ---------------------------------------------------------------------------
// Per-instrument tuning tables
// ---------------------------------------------------------------------------
struct TuningTable
{
    static std::array<double, kMaxStrings> openPitches (int instrument, int tuning, int capo)
    {
        std::array<double, kMaxStrings> out {};

        if (instrument == 2)
        {
            const double bass[4] = { 41.20, 55.00, 73.42, 98.00 };   // E1 A1 D2 G2
            for (int i = 0; i < 4; ++i) out[(size_t) i] = bass[i];
            for (int i = 4; i < kMaxStrings; ++i) out[(size_t) i] = 0.0;
        }
        else
        {
            const double standard[6] = { 82.41, 110.00, 146.83, 196.00, 246.94, 329.63 };
            for (int i = 0; i < 6; ++i) out[(size_t) i] = standard[i];
        }

        const int nStrings = (instrument == 2) ? 4 : 6;

        // Per-string semitone offsets: real tunings are not one uniform shift.
        int semis[kMaxStrings] = { 0, 0, 0, 0, 0, 0 };

        switch (tuning)
        {
            case 1:                                      // Drop D (lowest string down a tone)
                semis[0] = -2;
                break;
            case 2:                                      // Half step down
                for (int i = 0; i < nStrings; ++i) semis[i] = -1;
                break;
            case 3:                                      // Open G
                if (instrument == 2)
                {
                    // 4-string open G: D2 G2 D3 G3
                    semis[0] = 10; semis[1] = 10; semis[2] = 12; semis[3] = 12;
                }
                else
                {
                    // 6-string open G: D2 G2 D3 G3 B3 D4
                    semis[0] = -2; semis[1] = -2; semis[2] = 0;
                    semis[3] = 0;  semis[4] = 0; semis[5] = -2;
                }
                break;
            default:
                break;
        }

        for (int i = 0; i < nStrings; ++i)
        {
            semis[i] += capo;
            out[(size_t) i] *= std::pow (2.0, semis[i] / 12.0);
        }

        return out;
    }
};

} // namespace forme
