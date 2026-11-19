#include "PluginProcessor.h"
#include "PluginEditor.h"

namespace forme
{

// ---------------------------------------------------------------------------
// Engine settings, derived once per block from the parameter tree.
// ---------------------------------------------------------------------------
struct FormeAudioProcessor::EngineSettings
{
    int   instrument = 1;
    int   quality = 1;
    float outputGain = 1.0f;
    float width = 1.0f;

    float t60 = 3.0f;
    float brightness = 0.5f;
    float inharmonicity = 0.3f;
    float detuneCents = 4.0f;
    float pluckPos = 0.14f;
    float pluckForce = 0.6f;
    float bodyRes = 0.5f, bodyQ = 0.4f, air = 0.5f;

    int   selector = 4;
    float pickupHeight = 0.5f, inductance = 0.5f, cable = 0.4f;
    float bodyCoupling = 0.5f;
    float fretNoise = 0.22f;
    float glideSecs = 0.15f;
    float volume = 0.85f, tone = 0.7f, toneCapUF = 0.047f;

    int   micPos = 1;
    float micDistance = 0.35f;

    int   articulation = 0;
    float bendRange = 2.0f;
    float velocityCurve = 0.5f;
    int   dispersionStages = 2;
    int   bodyModes = 8;
    float humanize = 0.1f;

    bool electric = true;
};

// ---------------------------------------------------------------------------
FormeAudioProcessor::FormeAudioProcessor()
    : AudioProcessor (BusesProperties()
                        .withOutput ("Output", juce::AudioChannelSet::stereo(), true)),
      apvts (*this, nullptr, "PARAMS", createLayout())
{
    for (auto& s : scope) s.store (0.0f);
    for (auto& v : voices) v.str.prepare (sampleRateHz);
    fretboard.nStrings = numStrings;
}

void FormeAudioProcessor::prepareToPlay (double sampleRate, int)
{
    sampleRateHz = sampleRate;

    for (auto& v : voices)
    {
        v.str.prepare (sampleRate);
        v.midi = -1; v.stringIdx = -1; v.fret = -1; v.held = false;
    }

    body.prepare (sampleRate);
    for (auto& p : pickups) p.prepare (sampleRate);
    circuit.reset();
    micDelay.prepare (kDelaySize);
    micDelay.clear();
    micTone.reset();
    acousticDistance.reset();

    lastFret.fill (-1);
    pitchBendSemis = 0.0f;

    for (auto& n : noteStates) { n.stringIdx.store (-1); n.fret.store (-1); }
}

// ---------------------------------------------------------------------------
FormeAudioProcessor::EngineSettings FormeAudioProcessor::readSettings() const
{
    const auto raw = [this] (int i)
    {
        const auto* v = apvts.getRawParameterValue (paramDesc (i).id);
        return v != nullptr ? v->load() : paramDesc (i).def;
    };

    EngineSettings s;

    s.instrument   = juce::jlimit (0, 2, (int) raw (pInstrument));
    s.quality      = juce::jlimit (0, 2, (int) raw (pQuality));
    s.outputGain   = std::pow (10.0f, raw (pOutputLevel) / 20.0f);
    s.width        = raw (pStereoWidth);

    const float decay = raw (pDecay);
    s.t60          = 0.35f + 11.0f * decay * decay;
    s.brightness   = raw (pBrightness);
    s.inharmonicity = raw (pInharmonicity);
    s.detuneCents  = raw (pDetune) * 14.0f;
    s.pluckPos     = raw (pPluckPosition);
    s.pluckForce   = raw (pPluckForce);
    s.bodyRes      = raw (pBodyResonance);
    s.bodyQ        = raw (pBodyQ);
    s.air          = raw (pAirCavity);

    s.selector     = juce::jlimit (0, 4, (int) raw (pSelector));
    s.pickupHeight = raw (pPickupHeight);
    s.inductance   = raw (pPickupInductance);
    s.cable        = raw (pCableCapacitance);
    s.bodyCoupling = raw (pBodyCoupling);
    s.fretNoise    = raw (pFretNoise);
    s.glideSecs    = raw (pGlide);
    s.volume       = raw (pVolume);
    s.tone         = raw (pTone);

    switch ((int) raw (pToneCap))
    {
        case 0: s.toneCapUF = 0.022f; break;
        case 1: s.toneCapUF = 0.033f; break;
        default: s.toneCapUF = 0.047f; break;
    }

    s.micPos       = juce::jlimit (0, 3, (int) raw (pMicPosition));
    s.micDistance  = raw (pMicDistance);
    s.articulation = juce::jlimit (0, 3, (int) raw (pArticulation));
    s.bendRange    = raw (pBendRange);
    s.velocityCurve = raw (pVelocityCurve);
    s.humanize     = raw (pHumanize);

    // String set changes mass and stiffness.
    const float gauge = juce::jlimit (0.0f, 2.0f, raw (pStringGauge));
    s.inharmonicity *= 0.82f + 0.24f * gauge;
    s.t60 *= 0.9f + 0.1f * gauge;

    // Contact material shapes the excitation.
    switch ((int) raw (pPickMaterial))
    {
        case 0: s.pluckForce *= 0.92f; s.brightness *= 0.94f; break;   // finger
        case 1: s.pluckForce *= 1.00f; s.brightness *= 1.00f; break;   // nail
        case 2: s.pluckForce *= 1.12f; s.brightness *= 1.10f; break;   // pick
        default: s.pluckForce *= 0.80f; s.brightness *= 0.86f; break;  // thumb
    }

    // Quality mode selects real engine resolution, not a gain trim.
    switch (s.quality)
    {
        case 0: s.dispersionStages = 1; s.bodyModes = 4; break;
        case 1: s.dispersionStages = 2; s.bodyModes = 8; break;
        default: s.dispersionStages = 3; s.bodyModes = 12; break;
    }

    s.electric = (s.instrument != 0);
    return s;
}

void FormeAudioProcessor::refreshFretboard (const EngineSettings& s)
{
    const int tuning = juce::jlimit (0, 3, (int) apvts.getRawParameterValue ("tuning")->load());
    const int capo   = juce::jlimit (0, 7, (int) apvts.getRawParameterValue ("capo")->load());

    openHz = TuningTable::openPitches (s.instrument, tuning, capo);
    numStrings = (s.instrument == 2) ? 4 : 6;

    fretboard.nStrings = numStrings;
    fretboard.openHz = openHz;
}

// ---------------------------------------------------------------------------
void FormeAudioProcessor::startNote (int midiNote, float velocity, int channel,
                                     const EngineSettings& s)
{
    const auto assignment = fretboard.assign (midiNote, AssignMode::automatic, lastFret);

    if (assignment.fret < 0)
        return;   // out of range for this instrument

    // Find a free voice, otherwise steal the oldest.
    int slot = -1;
    int oldest = 1 << 30;

    for (int i = 0; i < kMaxVoices; ++i)
    {
        if (! voices[(size_t) i].str.isActive()) { slot = i; break; }
        if (voices[(size_t) i].startOrder < oldest)
        {
            oldest = voices[(size_t) i].startOrder;
            slot = i;
        }
    }

    auto& v = voices[(size_t) slot];

    StringSetup setup;
    setup.freq = (float) (openHz[(size_t) assignment.stringIdx]
                          * std::pow (2.0, (double) assignment.fret / 12.0));

    const float velCurve = std::pow (juce::jlimit (0.01f, 1.0f, velocity),
                                     0.6f + 1.6f * s.velocityCurve);

    setup.brightness   = juce::jlimit (0.02f, 0.95f, s.brightness * (0.55f + 0.6f * velCurve));
    setup.t60          = juce::jmax (0.08f, s.t60 * (0.45f + 0.7f * velCurve));
    setup.inharmonicity = juce::jlimit (0.0f, 1.0f, s.inharmonicity);
    setup.detuneCents  = s.detuneCents;
    setup.fretNoise    = juce::jlimit (0.0f, 1.0f, s.fretNoise);
    setup.glideSecs    = juce::jlimit (0.0f, 2.0f, s.glideSecs);

    // Fretted physics: a shorter speaking length raises stiffness relative to
    // tension (more inharmonic modes) and loses energy a little faster.
    const float fretNorm = juce::jlimit (0.0f, 1.0f, (float) assignment.fret / 22.0f);
    setup.inharmonicity = juce::jlimit (0.0f, 1.0f, setup.inharmonicity * (1.0f + 0.55f * fretNorm));
    setup.t60 = juce::jmax (0.06f, setup.t60 * (1.0f - 0.16f * fretNorm));
    setup.force        = juce::jlimit (0.0f, 1.0f, s.pluckForce * (0.35f + 0.85f * velCurve));
    setup.dispersionStages = s.dispersionStages;
    setup.extraDamping = 0.0f;
    setup.harmonicBias = 0.0f;

    // Position and force wobble: bounded, seeded, so offline renders repeat.
    float pos = s.pluckPos;
    if (s.humanize > 0.0f)
    {
        voiceSeed = voiceSeed * 1664525u + 1013904223u;
        const float r = (float) ((voiceSeed >> 8) & 0xFFFF) / 65535.0f - 0.5f;
        pos = juce::jlimit (0.02f, 0.48f, pos + r * 0.06f * s.humanize);
        setup.force = juce::jlimit (0.0f, 1.0f, setup.force * (1.0f + r * 0.12f * s.humanize));
    }
    setup.pluckPos = pos;

    switch (s.articulation)
    {
        case 1:   // palm mute
            setup.extraDamping = 0.55f;
            setup.brightness *= 0.62f;
            setup.t60 *= 0.30f;
            break;
        case 2:   // natural harmonic: excite at a node, suppress the fundamental
            setup.pluckPos = 0.5f;
            setup.harmonicBias = 0.65f;
            setup.t60 *= 0.85f;
            break;
        case 3:   // dead note
            setup.extraDamping = 0.95f;
            setup.t60 = 0.16f;
            setup.force *= 0.7f;
            break;
        default:
            break;
    }

    v.str.start (setup, voiceSeed + (juce::uint32) midiNote * 7919u);
    v.midi = midiNote;
    v.stringIdx = assignment.stringIdx;
    v.fret = assignment.fret;
    v.channel = channel;
    v.held = true;
    v.vel = velocity;
    v.startOrder = ++noteCounter;

    lastFret[(size_t) assignment.stringIdx] = assignment.fret;

    for (int k = 0; k < 3; ++k)
        pickups[k].prepare (sampleRateHz);
    circuit.set (s.tone, s.toneCapUF, sampleRateHz);

    body.setProfile (s.instrument, s.bodyRes, s.bodyQ, s.air, s.bodyModes);
}

// ---------------------------------------------------------------------------
void FormeAudioProcessor::handleMidiMessage (const juce::MidiMessage& m,
                                             const EngineSettings& s)
{
    if (m.isNoteOn())
    {
        startNote (m.getNoteNumber(), m.getFloatVelocity(), m.getChannel(), s);
    }
    else if (m.isNoteOff())
    {
        for (auto& v : voices)
            if (v.midi == m.getNoteNumber() && v.channel == m.getChannel() && v.held)
            {
                v.held = false;
                v.str.release (0.4f);
            }
    }
    else if (m.isAllNotesOff() || m.isAllSoundOff())
    {
        for (auto& v : voices) { v.held = false; v.str.kill(); v.midi = -1; }
    }
    else if (m.isPitchWheel())
    {
        const float norm = ((float) m.getPitchWheelValue() - 8192.0f) / 8192.0f;
        pitchBendSemis = norm * s.bendRange;

        for (auto& v : voices)
            if (v.str.isActive())
                v.str.setBend (pitchBendSemis);
    }
}

// ---------------------------------------------------------------------------
void FormeAudioProcessor::renderChunk (juce::AudioBuffer<float>& buffer, int start,
                                       int num, const EngineSettings& s)
{
    if (num <= 0) return;

    auto* left = buffer.getWritePointer (0);
    auto* right = buffer.getNumChannels() > 1 ? buffer.getWritePointer (1) : nullptr;

    // Sensing positions along the string, measured from the bridge.
    float taps[3] { 0.0f, 0.0f, 0.0f };
    bool usePickup[3] { false, false, false };
    int numTaps = 0;

    if (s.instrument == 1)
    {
        taps[0] = 0.075f; taps[1] = 0.225f; taps[2] = 0.385f;
        numTaps = 3;
        switch (s.selector)
        {
            case 0: usePickup[0] = true; break;
            case 1: usePickup[0] = usePickup[1] = true; break;
            case 2: usePickup[1] = true; break;
            case 3: usePickup[1] = usePickup[2] = true; break;
            default: usePickup[2] = true; break;
        }
    }
    else if (s.instrument == 2)
    {
        taps[0] = 0.19f; taps[1] = 0.31f;
        numTaps = 2;
        usePickup[0] = usePickup[1] = true;
    }

    for (int k = 0; k < 3; ++k)
        if (usePickup[k])
            pickups[k].set (s.pickupHeight, s.inductance, s.cable, 1.0f, s.bodyCoupling);

    circuit.set (s.tone, s.toneCapUF, sampleRateHz);
    body.setProfile (s.instrument, s.bodyRes, s.bodyQ, s.air, s.bodyModes);

    for (auto& v : voices)
        if (v.str.isActive())
            v.str.updateBend();

    const float distance = 0.05f + 0.45f * juce::jlimit (0.0f, 1.0f, s.micDistance);
    const float micDelaySamples =
        juce::jlimit (1.0f, (float) kDelaySize - 8.0f,
                      distance / 343.0f * (float) sampleRateHz);
    float prevBody = 0.0f;

    for (int i = 0; i < num; ++i)
    {
        // Bridge force proxy: the string slope at the saddle drives the body,
        // and the body's admittance feeds back into the strings (coupled system).
        float bridgeIn = 0.0f;
        float sensed[3] { 0.0f, 0.0f, 0.0f };

        const float excitation = prevBody * 0.035f * juce::jlimit (0.0f, 1.0f, s.bodyCoupling);

        for (auto& v : voices)
        {
            if (! v.str.isActive()) continue;
            v.str.tick (excitation);
            bridgeIn += v.str.sense (0.055f);
            for (int k = 0; k < numTaps; ++k)
                sensed[k] += v.str.sense (taps[k]);
        }

        float out = 0.0f;

        if (! s.electric)
        {
            const float capture = body.process (bridgeIn);
            prevBody = capture;
            micDelay.write (capture);
            const float direct = micDelay.read (micDelaySamples);

            // Capture perspective: a tilt around the body, plus distance damping.
            float tilt = 0.0f;
            switch (s.micPos)
            {
                case 0: tilt = -0.55f; break;   // soundhole: low-mid weight
                case 1: tilt =  0.35f; break;   // bridge: brighter
                case 2: tilt = -0.25f; break;   // neck: softer
                default: tilt = 0.0f; break;    // stereo body
            }

            const float low = micTone.lp (direct, 0.22f);
            const float distDamp = 1.0f - 0.45f * juce::jlimit (0.0f, 1.0f, s.micDistance);
            out = (direct + (direct - low) * tilt) * distDamp;

            if (right != nullptr)
            {
                // Stereo width comes from the two capture points, not a widener.
                const float side = (s.micPos == 3)
                    ? micDelay.read (micDelaySamples * 1.12f) * 0.55f * s.width
                    : direct * 0.04f * s.width;
                left[start + i]  += (out - side) * s.outputGain;
                right[start + i] += (out + side) * s.outputGain;
                continue;
            }
        }
        else
        {
            float sum = 0.0f;
            int used = 0;

            for (int k = 0; k < 3; ++k)
                if (usePickup[k])
                {
                    sum += pickups[k].process (sensed[k]);
                    ++used;
                }

            if (used > 1) sum /= (float) used;
            out = circuit.process (sum, s.volume) * 2.4f;
        }

        const float v = out * s.outputGain;
        left[start + i] += v;
        if (right != nullptr) right[start + i] += v;

        if ((i & 7) == 0)
        {
            const int w = scopeWrite.load();
            scope[(size_t) w].store (juce::jlimit (-1.0f, 1.0f, v));
            scopeWrite.store ((w + 1) % kScopeSize);
        }
    }
}

// ---------------------------------------------------------------------------
void FormeAudioProcessor::processBlock (juce::AudioBuffer<float>& buffer,
                                        juce::MidiBuffer& midi)
{
    juce::ScopedNoDenormals noDenormals;

    const auto tStart = juce::Time::getHighResolutionTicks();
    const int n = buffer.getNumSamples();
    buffer.clear();

    if (n <= 0) return;

    const auto s = readSettings();
    refreshFretboard (s);

    // Body and pickup configuration is block-rate; only the string is per-sample.
    body.setProfile (s.instrument, s.bodyRes, s.bodyQ, s.air, s.bodyModes);

    int pos = 0;
    for (const auto meta : midi)
    {
        const int t = juce::jlimit (0, n, meta.samplePosition);
        if (t > pos) { renderChunk (buffer, pos, t - pos, s); pos = t; }
        handleMidiMessage (meta.getMessage(), s);
    }

    if (pos < n)
        renderChunk (buffer, pos, n - pos, s);

    if (sampleRateHz > 0.0)
    {
        const auto elapsed = juce::Time::highResolutionTicksToSeconds (
            juce::Time::getHighResolutionTicks() - tStart);
        const float load = (float) (elapsed / ((double) n / sampleRateHz));
        cpuLoad.store (cpuLoad.load() * 0.85f + load * 0.15f);
    }

    // Telemetry
    float pl = 0.0f, pr = 0.0f;
    for (int ch = 0; ch < buffer.getNumChannels(); ++ch)
    {
        const float m = buffer.getMagnitude (ch, 0, n);
        if (ch == 0) pl = m; else pr = juce::jmax (pr, m);
    }

    peakL.store (juce::jmax (pl, peakL.load() * 0.82f));
    peakR.store (juce::jmax (pr, peakR.load() * 0.82f));

    if (pl > 1.0f || pr > 1.0f)
        clipCount.fetch_add (1);

    int active = 0;
    for (int i = 0; i < kMaxVoices; ++i)
    {
        if (voices[(size_t) i].str.isActive())
        {
            noteStates[(size_t) i].stringIdx.store (voices[(size_t) i].stringIdx);
            noteStates[(size_t) i].fret.store (voices[(size_t) i].fret);
            ++active;
        }
        else
        {
            noteStates[(size_t) i].stringIdx.store (-1);
            noteStates[(size_t) i].fret.store (-1);
        }
    }
    activeVoices.store (active);
}

// ---------------------------------------------------------------------------
juce::AudioProcessorEditor* FormeAudioProcessor::createEditor()
{
    return new FormeAudioProcessorEditor (*this);
}

void FormeAudioProcessor::getStateInformation (juce::MemoryBlock& destData)
{
    if (auto xml = apvts.copyState().createXml())
        copyXmlToBinary (*xml, destData);
}

void FormeAudioProcessor::setStateInformation (const void* data, int sizeInBytes)
{
    if (auto xml = getXmlFromBinary (data, sizeInBytes))
        if (xml->hasTagName (apvts.state.getType()))
            apvts.replaceState (juce::ValueTree::fromXml (*xml));
}

// ---------------------------------------------------------------------------
juce::String FormeAudioProcessor::buildSnapshot() const
{
    juce::Array<juce::var> arr;

    for (int i = 0; i < numParams; ++i)
    {
        const auto& d = paramDesc (i);
        if (auto* p = apvts.getParameter (d.id))
        {
            auto* o = new juce::DynamicObject();
            o->setProperty ("id", d.id);
            o->setProperty ("value", p->convertFrom0to1 (p->getValue()));
            arr.add (juce::var (o));
        }
    }

    return juce::JSON::toString (juce::var (arr));
}

juce::String FormeAudioProcessor::handleRequest (const juce::String& action,
                                                 const juce::String& payload)
{
    if (action == "info")
    {
        juce::Array<juce::var> arr;

        for (int i = 0; i < numParams; ++i)
        {
            const auto& d = paramDesc (i);
            auto* o = new juce::DynamicObject();
            o->setProperty ("id", d.id);
            o->setProperty ("name", d.name);
            o->setProperty ("unit", d.unit);
            o->setProperty ("min", d.min);
            o->setProperty ("max", d.max);
            o->setProperty ("def", d.def);
            o->setProperty ("advanced", d.advanced);

            if (d.choices != nullptr)
            {
                juce::StringArray items;
                items.addTokens (d.choices, "|", "");
                o->setProperty ("choices", items);
            }

            arr.add (juce::var (o));
        }

        return juce::JSON::toString (juce::var (arr));
    }

    if (action == "snapshot")
        return buildSnapshot();

    if (action == "set")
    {
        const auto j = juce::JSON::parse (payload);
        const auto id = j["id"].toString();
        const float value = (float) (double) j["value"];

        if (auto* p = apvts.getParameter (id))
            p->setValueNotifyingHost (p->convertTo0to1 (value));

        return "{}";
    }

    if (action == "reset")
    {
        for (int i = 0; i < numParams; ++i)
        {
            const auto& d = paramDesc (i);
            if (auto* p = apvts.getParameter (d.id))
                p->setValueNotifyingHost (p->convertTo0to1 (d.def));
        }
        return "{}";
    }

    return "{}";
}

juce::var FormeAudioProcessor::buildTelemetry() const
{
    auto o = new juce::DynamicObject();
    o->setProperty ("voices", activeVoices.load());
    o->setProperty ("peakL", peakL.load());
    o->setProperty ("peakR", peakR.load());
    o->setProperty ("clip", clipCount.load());
    o->setProperty ("cpu", cpuLoad.load());

    juce::Array<juce::var> notes;
    for (int i = 0; i < kMaxVoices; ++i)
    {
        const int s = noteStates[(size_t) i].stringIdx.load();
        if (s < 0) continue;

        auto* n = new juce::DynamicObject();
        n->setProperty ("string", s);
        n->setProperty ("fret", noteStates[(size_t) i].fret.load());
        notes.add (juce::var (n));
    }
    o->setProperty ("notes", notes);

    juce::Array<juce::var> scopeArr;
    const int head = scopeWrite.load();
    for (int i = 0; i < kScopeSize; ++i)
        scopeArr.add ((double) scope[(size_t) ((head + i) % kScopeSize)].load());
    o->setProperty ("scope", scopeArr);

    return juce::var (o);
}

} // namespace forme

// VST3 entry point: JUCE calls this to instantiate the processor.
juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter()
{
    return new forme::FormeAudioProcessor();
}

