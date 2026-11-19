#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <array>
#include <atomic>

#include "Params.h"
#include "dsp/Engine.h"

namespace forme
{

class FormeAudioProcessor : public juce::AudioProcessor
{
public:
    FormeAudioProcessor();
    ~FormeAudioProcessor() override = default;

    void prepareToPlay (double sampleRate, int samplesPerBlock) override;
    void releaseResources() override {}
    void processBlock (juce::AudioBuffer<float>&, juce::MidiBuffer&) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "Forme"; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 8.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram (int) override {}
    const juce::String getProgramName (int) override { return "Init"; }
    void changeProgramName (int, const juce::String&) override {}

    void getStateInformation (juce::MemoryBlock&) override;
    void setStateInformation (const void*, int) override;

    juce::AudioProcessorValueTreeState apvts;

    // --- WebView bridge -----------------------------------------------------
    juce::String handleRequest (const juce::String& action, const juce::String& payload);
    juce::var buildTelemetry() const;
    juce::String buildSnapshot() const;

    // --- Telemetry ----------------------------------------------------------
    struct NoteState
    {
        std::atomic<int> stringIdx { -1 };
        std::atomic<int> fret { -1 };
    };

    std::array<NoteState, kMaxVoices> noteStates;
    std::atomic<int>   activeVoices { 0 };
    std::atomic<float> peakL { 0.0f }, peakR { 0.0f };
    std::atomic<float> cpuLoad { 0.0f };
    std::atomic<int>   clipCount { 0 };

    static constexpr int kScopeSize = 160;
    std::array<std::atomic<float>, kScopeSize> scope;
    std::atomic<int> scopeWrite { 0 };

private:
    struct EngineSettings;

    // Defined here rather than in the .cpp: std::array needs a complete type.
    struct Voice
    {
        StringVoice str;
        int midi = -1, stringIdx = -1, fret = -1, channel = 0;
        bool held = false;
        int startOrder = 0;
        float vel = 0.8f;
    };

    EngineSettings readSettings() const;
    void handleMidiMessage (const juce::MidiMessage&, const EngineSettings&);
    void renderChunk (juce::AudioBuffer<float>&, int startSample, int numSamples,
                      const EngineSettings&);
    void startNote (int midiNote, float velocity, int channel, const EngineSettings&);
    void refreshFretboard (const EngineSettings&);

    std::array<Voice, kMaxVoices> voices;
    std::array<int, kMaxStrings> lastFret { -1, -1, -1, -1, -1, -1 };

    int numStrings = 6;
    int noteCounter = 0;
    float pitchBendSemis = 0.0f;
    double sampleRateHz = 48000.0;

    Fretboard fretboard;
    BodyModel body;
    PickupModel pickups[3];
    PassiveCircuit circuit;
    DelayLine micDelay;
    OnePole micTone;
    OnePole acousticDistance;

    std::array<double, kMaxStrings> openHz {};
    juce::uint32 voiceSeed = 0x1234567u;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (FormeAudioProcessor)
};

} // namespace forme
