#include "PluginEditor.h"
#include "PluginProcessor.h"

#include <BinaryData.h>

namespace forme
{

namespace
{
    std::optional<juce::WebBrowserComponent::Resource> provideResource (const juce::String&)
    {
        // The UI is a single self-contained HTML file, so every path resolves
        // to the same document and the app routes itself.
        juce::WebBrowserComponent::Resource r;
        const auto size = (size_t) BinaryData::index_htmlSize;
        r.data.resize (size);
        std::memcpy (r.data.data(), BinaryData::index_html, size);
        r.mimeType = "text/html";
        return r;
    }
}

FormeAudioProcessorEditor::FormeAudioProcessorEditor (FormeAudioProcessor& p)
    : juce::AudioProcessorEditor (&p),
      proc (p),
      web (juce::WebBrowserComponent::Options{}
               .withNativeIntegrationEnabled()
               .withResourceProvider (provideResource)
               .withNativeFunction (
                   "forme",
                   [this] (const juce::Array<juce::var>& args,
                           juce::WebBrowserComponent::NativeFunctionCompletion done)
                   {
                       const auto action  = args.size() > 0 ? args[0].toString() : juce::String();
                       const auto payload = args.size() > 1 ? args[1].toString() : juce::String();
                       done (juce::var (proc.handleRequest (action, payload)));
                   }))
{
    addAndMakeVisible (web);

    setResizable (true, true);
    setResizeLimits (960, 680, 1920, 1200);
    setSize (1180, 800);

    web.goToURL (juce::WebBrowserComponent::getResourceProviderRoot());

    startTimerHz (30);
}

FormeAudioProcessorEditor::~FormeAudioProcessorEditor()
{
    stopTimer();
}

void FormeAudioProcessorEditor::paint (juce::Graphics& g)
{
    g.fillAll (juce::Colour (0xff111416));
}

void FormeAudioProcessorEditor::resized()
{
    web.setBounds (getLocalBounds());
}

void FormeAudioProcessorEditor::timerCallback()
{
    web.emitEventIfBrowserIsVisible ("forme.telemetry", proc.buildTelemetry());

    // Push parameter values only when the host moved something, so automation
    // and UI drags stay reconciled without streaming 30 times a second.
    float hash = 0.0f;
    int i = 0;

    for (int p = 0; p < numParams; ++p)
        if (auto* param = proc.apvts.getParameter (paramDesc (p).id))
            hash += param->getValue() * (float) (++i);

    if (std::abs (hash - lastParamHash) > 1.0e-7f)
    {
        lastParamHash = hash;
        web.emitEventIfBrowserIsVisible ("forme.params",
                                         juce::var (proc.buildSnapshot()));
    }
}

} // namespace forme
