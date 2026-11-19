cmake_minimum_required(VERSION 3.22)

project(Forme VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

# ---------------------------------------------------------------------------
# JUCE
# ---------------------------------------------------------------------------
if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/third_party/JUCE/CMakeLists.txt")
    add_subdirectory(third_party/JUCE EXCLUDE_FROM_ALL)
else()
    include(FetchContent)
    FetchContent_Declare(JUCE
        GIT_REPOSITORY https://github.com/juce-framework/JUCE.git
        GIT_TAG 8.0.6
        GIT_SHALLOW TRUE)
    FetchContent_MakeAvailable(JUCE)
endif()

# ---------------------------------------------------------------------------
# React UI bundle (single self-contained index.html)
# ---------------------------------------------------------------------------
set(FORME_UI_HTML "${CMAKE_CURRENT_SOURCE_DIR}/ui/dist/index.html")

if(NOT EXISTS "${FORME_UI_HTML}")
    message(STATUS "Forme: ui/dist/index.html missing - writing placeholder.")
    file(MAKE_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/ui/dist")
    file(WRITE "${FORME_UI_HTML}"
        "<!doctype html><html><body style=\"background:#111416;color:#F0EBE1;"
        "font:14px system-ui;padding:48px;letter-spacing:.04em\">"
        "FORM&#201; &#183; UI bundle not built. Run <code>npm install &amp;&amp; npm run build</code> in <code>ui/</code>."
        "</body></html>")
endif()

juce_add_binary_data(FormeUI SOURCES "${FORME_UI_HTML}")

# ---------------------------------------------------------------------------
# Plugin target
# ---------------------------------------------------------------------------
juce_add_plugin(Forme
    COMPANY_NAME              "Forme Audio"
    BUNDLE_ID                 "com.formeaudio.forme"
    PLUGIN_MANUFACTURER_CODE  Frme
    PLUGIN_CODE               Frm1
    FORMATS                   VST3
    PRODUCT_NAME              "Forme"
    DESCRIPTION               "Physically modelled guitar instrument"
    IS_SYNTH                  TRUE
    NEEDS_MIDI_INPUT          TRUE
    NEEDS_MIDI_OUTPUT         FALSE
    IS_MIDI_EFFECT            FALSE
    EDITOR_WANTS_KEYBOARD_FOCUS FALSE
    COPY_PLUGIN_AFTER_BUILD   FALSE
    VST3_CATEGORIES           "Instrument"
    NEEDS_WEB_BROWSER         TRUE
    NEEDS_WEBVIEW2            TRUE)

target_sources(Forme PRIVATE
    src/PluginProcessor.cpp
    src/PluginEditor.cpp)

target_include_directories(Forme PRIVATE src)

target_compile_definitions(Forme PUBLIC
    JUCE_WEB_BROWSER=1
    JUCE_USE_WIN_WEBVIEW2=1
    JUCE_DISPLAY_SPLASH_SCREEN=0
    JUCE_REPORT_APP_USAGE=0
    JUCE_VST3_CAN_REPLACE_VST2=0
    JUCE_STRICT_REFCOUNTEDPOINTER=1)

target_link_libraries(Forme PRIVATE
    FormeUI
    juce::juce_audio_utils
    juce::juce_gui_extra
    PUBLIC
    juce::juce_recommended_config_flags
    juce::juce_recommended_lto_flags
    juce::juce_recommended_warning_flags)

# ---------------------------------------------------------------------------
# Optional offline DSP tests (engine only, no editor)
#   cmake -S . -B build_tests -DFORME_BUILD_TESTS=ON
#   cmake --build build_tests --config Release --target FormeDSPTests
# ---------------------------------------------------------------------------
option(FORME_BUILD_TESTS "Build Forme offline DSP tests" OFF)

if(FORME_BUILD_TESTS)
    juce_add_console_app(FormeDSPTests PRODUCT_NAME "FormeDSPTests")
    target_sources(FormeDSPTests PRIVATE tests/dsp_test.cpp)
    target_include_directories(FormeDSPTests PRIVATE src)
    target_compile_definitions(FormeDSPTests PRIVATE JUCE_STANDALONE_APPLICATION=1)
    target_link_libraries(FormeDSPTests PRIVATE juce::juce_audio_basics)
endif()
