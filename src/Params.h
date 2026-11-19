#pragma once

#include <juce_audio_processors/juce_audio_processors.h>

namespace forme
{

// Single source of truth for the parameter surface. The audio thread, the
// WebView bridge and (by mirror) the React UI all read this table, so a control
// can never be presented that the engine does not implement.
enum ParamIndex
{
    pInstrument = 0, pQuality, pOutputLevel, pStereoWidth,
    pStringGauge, pTuning, pCapo,
    pDecay, pBrightness, pInharmonicity, pDetune,
    pBodyResonance, pBodyQ, pBodyCoupling, pAirCavity,
    pPluckPosition, pPluckForce, pPickMaterial, pFretNoise, pHumanize,
    pSelector, pPickupHeight, pPickupInductance, pCableCapacitance,
    pVolume, pTone, pToneCap,
    pMicPosition, pMicDistance,
    pArticulation, pBendRange, pGlide, pVelocityCurve,
    numParams
};

struct ParamDesc
{
    const char* id;
    const char* name;
    const char* unit;
    float min;
    float max;
    float def;
    const char* choices;    // "A|B|C" for discrete parameters, nullptr for continuous
    bool advanced;
};

inline const ParamDesc& paramDesc (int i) noexcept
{
    static const ParamDesc table[numParams] =
    {
        // id                  name                  unit     min      max     def    choices                                                  adv
        { "instrument",        "Instrument",         "",       0.0f,   2.0f,   1.0f, "Acoustic|Strat|P Bass",                                false },
        { "quality",           "Quality",            "",       0.0f,   2.0f,   1.0f, "Efficient|Studio|Maximum",                              false },
        { "outputLevel",       "Output",             "dB",   -24.0f,  12.0f,   0.0f, nullptr,                                                  false },
        { "stereoWidth",       "Width",              "",       0.0f,   2.0f,   1.0f, nullptr,                                                  false },

        { "stringGauge",       "String Set",         "",       0.0f,   2.0f,   1.0f, "Light|Medium|Heavy",                                     false },
        { "tuning",            "Tuning",             "",       0.0f,   3.0f,   0.0f, "Standard|Drop D|Half Step Down|Open G",                  false },
        { "capo",              "Capo",               "fret",   0.0f,   7.0f,   0.0f, nullptr,                                                  false },

        { "decay",             "Sustain",            "",       0.0f,   1.0f,   0.55f, nullptr,                                                 false },
        { "brightness",        "Brightness",         "",       0.0f,   1.0f,   0.52f, nullptr,                                                 false },
        { "inharmonicity",     "Stiffness",          "",       0.0f,   1.0f,   0.30f, nullptr,                                                 true  },
        { "detune",            "Polarisation",       "",       0.0f,   1.0f,   0.35f, nullptr,                                                 true  },

        { "bodyResonance",     "Resonance Amount",   "",       0.0f,   1.0f,   0.50f, nullptr,                                                 false },
        { "bodyQ",             "Resonance Q",        "",       0.0f,   1.0f,   0.40f, nullptr,                                                 true  },
        { "bodyCoupling",      "Body Coupling",      "",       0.0f,   1.0f,   0.50f, nullptr,                                                 true  },
        { "airCavity",         "Air Cavity",         "",       0.0f,   1.0f,   0.50f, nullptr,                                                 false },

        { "pluckPosition",     "Pluck Position",     "",       0.02f,  0.48f,  0.14f, nullptr,                                                 false },
        { "pluckForce",        "Excitation",         "",       0.0f,   1.0f,   0.60f, nullptr,                                                 false },
        { "pickMaterial",      "Contact",            "",       0.0f,   3.0f,   0.0f, "Finger|Fingernail|Pick|Thumb",                          false },
        { "fretNoise",         "Fret Noise",         "",       0.0f,   1.0f,   0.22f, nullptr,                                                 false },
        { "humanize",          "Humanise",           "",       0.0f,   1.0f,   0.12f, nullptr,                                                 false },

        { "selector",          "Pickup Selector",    "",       0.0f,   4.0f,   4.0f, "Bridge|Bridge + Middle|Middle|Middle + Neck|Neck",       false },
        { "pickupHeight",      "Pickup Height",      "",       0.0f,   1.0f,   0.50f, nullptr,                                                 false },
        { "pickupInductance",  "Coil Inductance",    "",       0.0f,   1.0f,   0.50f, nullptr,                                                 true  },
        { "cableCapacitance",  "Cable Capacitance",  "",       0.0f,   1.0f,   0.40f, nullptr,                                                 true  },

        { "volume",            "Volume",             "",       0.0f,   1.0f,   0.85f, nullptr,                                                 false },
        { "tone",              "Tone",               "",       0.0f,   1.0f,   0.70f, nullptr,                                                 false },
        { "toneCap",           "Tone Capacitor",     "uF",     0.0f,   2.0f,   2.0f, "0.022|0.033|0.047",                                     true  },

        { "micPosition",       "Capture",            "",       0.0f,   3.0f,   1.0f, "Soundhole|Bridge|Neck|Stereo Body",                     false },
        { "micDistance",       "Distance",           "m",      0.0f,   1.0f,   0.35f, nullptr,                                                 false },

        { "articulation",      "Articulation",       "",       0.0f,   3.0f,   0.0f, "Auto|Palm Mute|Harmonic|Dead Note",                     false },
        { "bendRange",         "Bend Range",         "st",     1.0f,  24.0f,   2.0f, nullptr,                                                 true  },
        { "glide",             "Glide",              "s",      0.0f,   2.0f,   0.15f, nullptr,                                                true  },
        { "velocityCurve",     "Velocity Curve",     "",       0.0f,   1.0f,   0.50f, nullptr,                                                 false },
    };

    return table[(size_t) i];
}

inline juce::AudioProcessorValueTreeState::ParameterLayout createLayout()
{
    juce::AudioProcessorValueTreeState::ParameterLayout layout;

    for (int i = 0; i < numParams; ++i)
    {
        const auto& d = paramDesc (i);
        const juce::ParameterID pid { d.id, 1 };

        if (d.choices != nullptr)
        {
            juce::StringArray items;
            items.addTokens (d.choices, "|", "");
            layout.add (std::make_unique<juce::AudioParameterChoice> (
                pid, d.name, items, (int) d.def));
        }
        else
        {
            layout.add (std::make_unique<juce::AudioParameterFloat> (
                pid, d.name, juce::NormalisableRange<float> (d.min, d.max), d.def, d.unit));
        }
    }

    return layout;
}

} // namespace forme
