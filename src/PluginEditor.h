#pragma once

#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_extra/juce_gui_extra.h>

namespace forme
{

class FormeAudioProcessor;

class FormeAudioProcessorEditor : public juce::AudioProcessorEditor,
                                  private juce::Timer
{
public:
    explicit FormeAudioProcessorEditor (FormeAudioProcessor&);
    ~FormeAudioProcessorEditor() override;

    void paint (juce::Graphics&) override;
    void resized() override;

private:
    void timerCallback() override;

    FormeAudioProcessor& proc;
    juce::WebBrowserComponent web;
    float lastParamHash = -1.0f;

    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR (FormeAudioProcessorEditor)
};

} // namespace forme
