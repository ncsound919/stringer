// Offline DSP tests for the FORME string engine (no editor, no WebView).
// Build: cmake -S . -B build_tests -DFORME_BUILD_TESTS=ON
//        cmake --build build_tests --config Release --target FormeDSPTests
#include "../src/dsp/Engine.h"

#include <cmath>
#include <cstdio>
#include <vector>

using namespace forme;

static int failures = 0;
#define CHECK(cond, msg) do { \
    if (!(cond)) { std::printf ("FAIL: %s\n", msg); ++failures; } \
    else std::printf ("ok:   %s\n", msg); } while (0)

static double zeroCrossHz (const std::vector<float>& v, double sr)
{
    double mean = 0.0;
    for (float x : v) mean += x;
    mean /= (double) v.size();

    int crossings = 0;
    for (std::size_t i = 1; i < v.size(); ++i)
    {
        const double a = v[i - 1] - mean;
        const double b = v[i] - mean;
        if ((a <= 0.0 && b > 0.0) || (a >= 0.0 && b < 0.0)) ++crossings;
    }
    const double secs = (double) v.size() / sr;
    return (double) crossings / (2.0 * secs);
}

/** Goertzel magnitude at one frequency (Hann window). */
static double goertzel (const std::vector<float>& sig, double freq, double sr,
                        int start, int len)
{
    const double w = 2.0 * 3.14159265358979323846 * freq / sr;
    const double coeff = 2.0 * std::cos (w);
    double s1 = 0.0, s2 = 0.0;
    for (int i = 0; i < len && start + i < (int) sig.size(); ++i)
    {
        const double hann = 0.5 - 0.5 * std::cos (2.0 * 3.14159265358979323846 * i / (len - 1));
        const double s0 = sig[(std::size_t) (start + i)] * hann + coeff * s1 - s2;
        s2 = s1;
        s1 = s0;
    }
    return std::sqrt (std::max (0.0, s1 * s1 + s2 * s2 - coeff * s1 * s2));
}

static StringSetup setupFor (float hz, float brightness = 0.5f)
{
    StringSetup s;
    s.freq = hz;
    s.brightness = brightness;
    s.t60 = 3.0f;
    s.inharmonicity = 0.3f;
    s.detuneCents = 0.0f;
    s.force = 0.6f;
    s.dispersionStages = 2;
    s.pluckPos = 0.14f;
    s.fretNoise = 0.0f;
    s.glideSecs = 0.0f;
    return s;
}

static std::vector<float> renderString (StringVoice& v, int n)
{
    std::vector<float> out ((std::size_t) n);
    for (int i = 0; i < n; ++i) out[(std::size_t) i] = v.tick();
    return out;
}

int main()
{
    const double sr = 48000.0;

    // 1. Open-string tuning: the fundamental must dominate both neighbouring
    //    semitones (zero-crossing counting is unreliable on stiff, two-polar
    //    strings with strong upper partials).
    {
        StringVoice v; v.prepare (sr);
        v.start (setupFor (82.41f), 0x12345678u);
        const auto out = renderString (v, 48000);

        const int start = 12000;
        const int len = 8192;
        const double e0   = goertzel (out, 82.41, sr, start, len);
        const double eDn  = goertzel (out, 73.42, sr, start, len);
        const double eUp  = goertzel (out, 92.50, sr, start, len);
        std::printf ("      open E goertzel: e0 %.2f  D2 %.2f  F#2 %.2f\n", e0, eDn, eUp);
        CHECK (e0 > eDn * 1.3 && e0 > eUp * 1.3, "open string fundamental dominates neighbours");
    }

    // 2. Determinism: same seed + setup renders bit-identically
    {
        StringVoice a, b; a.prepare (sr); b.prepare (sr);
        a.start (setupFor (110.0f), 0xDEADBEEFu);
        b.start (setupFor (110.0f), 0xDEADBEEFu);
        const auto ra = renderString (a, 12000);
        const auto rb = renderString (b, 12000);
        CHECK (ra == rb, "seeded render is reproducible");
    }

    // 3. Extreme setup remains finite (force/pluck/stiffness at bounds)
    {
        StringVoice v; v.prepare (sr);
        auto s = setupFor (220.0f);
        s.force = 1.0f; s.pluckPos = 0.02f; s.inharmonicity = 1.0f;
        s.dispersionStages = 3; s.harmonicBias = 0.9f; s.extraDamping = 1.0f;
        v.start (s, 1u);
        bool finite = true; float pk = 0.0f;
        for (int i = 0; i < 48000; ++i)
        {
            const float y = v.tick();
            if (! std::isfinite (y)) { finite = false; break; }
            pk = std::max (pk, std::fabs (y));
        }
        std::printf ("      extreme setup peak %.3f\n", pk);
        CHECK (finite && pk < 8.0f, "extreme setup stays finite");
    }

    // 4. Tuning table: Open G (guitar) and bass open G
    {
        const auto guitar = TuningTable::openPitches (1, 3, 0);
        CHECK (std::fabs (guitar[0] - 73.42) < 0.5, "Open G string 1 = D2");
        CHECK (std::fabs (guitar[1] - 98.00) < 0.5, "Open G string 2 = G2");
        CHECK (std::fabs (guitar[5] - 293.66) < 1.0, "Open G string 6 = D4");

        const auto bass = TuningTable::openPitches (2, 3, 0);
        CHECK (std::fabs (bass[0] - 73.42) < 0.5, "bass Open G string 1 = D2");
        CHECK (std::fabs (bass[3] - 196.0) < 1.0, "bass Open G string 4 = G3");

        const auto dropD = TuningTable::openPitches (1, 1, 0);
        CHECK (std::fabs (dropD[0] - 73.42) < 0.5, "Drop D lowers only the lowest string");
        CHECK (std::fabs (dropD[1] - 110.0) < 0.5, "Drop D leaves A2 alone");
    }

    // 5. Body / pickup / passive circuit stability
    {
        BodyModel body; body.prepare (sr);
        body.setProfile (0, 0.7f, 0.6f, 0.6f, 12);
        PickupModel pu; pu.prepare (sr);
        pu.set (0.8f, 0.7f, 0.6f, 1.0f, 0.7f);
        PassiveCircuit pc; pc.reset();
        pc.set (0.6f, 0.047f, sr);

        bool finite = true; float pk = 0.0f;
        for (int i = 0; i < 48000; ++i)
        {
            const float x = 0.2f * std::sin (2.0 * 3.14159265358979 * 110.0 * i / sr);
            const float b = body.process (x);
            const float p = pu.process (b);
            const float y = pc.process (p, 0.85f);
            if (! std::isfinite (y)) { finite = false; break; }
            pk = std::max (pk, std::fabs (y));
        }
        std::printf ("      chain peak %.3f\n", pk);
        CHECK (finite, "body -> pickup -> circuit stays finite");
    }

    // 6. 60 s two-voice soak: finite, no silence, no clip pin
    {
        StringVoice a, b; a.prepare (sr); b.prepare (sr);
        a.start (setupFor (82.41f), 11u);
        b.start (setupFor (123.47f, 0.6f), 22u);

        bool finite = true; float pk = 0.0f;
        const int total = (int) sr * 60;
        for (int i = 0; i < total; ++i)
        {
            const float y = a.tick() + b.tick();
            if (! std::isfinite (y)) { finite = false; break; }
            pk = std::max (pk, std::fabs (y));
        }
        std::printf ("      60 s soak peak %.3f\n", pk);
        CHECK (finite && pk > 0.0005f && pk < 8.0f, "60 s soak stays finite and audible");
    }

    std::printf (failures ? "\n%d FAILURES\n" : "\nALL PASSED\n", failures);
    return failures ? 1 : 0;
}
