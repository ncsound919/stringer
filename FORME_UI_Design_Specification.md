# FORMÉ — Three-Part Guitar Instrument Plugin UI Specification

**Document type:** Product / UX / UI engineering specification  
**Status:** Design direction for implementation  
**Product:** FORMÉ (working product name)  
**Instrument models:** Steel-string acoustic guitar, Strat-style electric guitar, Precision-style electric bass  
**Primary workspaces:** Instrument, Performance, Output  
**Reference viewport:** 1180 × 800 px  
**Minimum target viewport:** 960 × 680 px  

---

## 1. Product vision

FORMÉ is a premium virtual guitar instrument built around physically informed string synthesis. Its interface must communicate the character of a real instrument while making advanced synthesis controls accessible to sound designers and engineers.

The interface is organized around one central principle:

> **Three workspaces. One instrument engine. Clear control at every level.**

The three primary workspaces have distinct responsibilities:

1. **Instrument** — configure the physical instrument and its sound-generating components.
2. **Performance** — configure how the instrument is played, articulated, and controlled by MIDI/MPE.
3. **Output** — configure how the instrument is captured and delivered to the DAW.

All three workspaces operate on the same active instrument state. Changing pages must never silently reset the instrument, performance mapping, calibration, or output configuration.

The interface should feel like refined studio hardware rather than a generic synthesizer. It should be precise, restrained, tactile, and visually rich without being crowded.

### 1.1 Product principles

- Physical behavior is represented honestly. A control labeled *string stiffness* must affect the string model, not an unrelated tone filter.
- Instrument models have distinct control layouts where their physical systems differ.
- Common controls and interaction patterns remain consistent across all three instruments.
- Basic musical controls are immediately accessible; scientific and engineering parameters live in the advanced layer.
- The instrument visualization is functional, not decorative.
- No visible control may be inert or disconnected from the synthesis engine.
- Defaults should produce musically useful results without requiring users to understand physical modeling.
- Advanced users must be able to inspect, edit, save, and compare instrument parameters.
- UI activity must not compromise the real-time audio thread.

---

## 2. Global application architecture

### 2.1 Persistent application shell

The application shell remains visible in all three workspaces.

**Header — approximately 72 px high**

Contains:

- FORMÉ wordmark and product identity.
- Active instrument name and active instrument profile.
- Preset browser access.
- Undo and redo.
- Save / Save As.
- Global settings.

**Primary navigation — approximately 48 px high**

Three always-visible workspace tabs:

- `01 / INSTRUMENT`
- `02 / PERFORMANCE`
- `03 / OUTPUT`

The active workspace is identified through a restrained accent treatment, clear text contrast, and a subtle surface change. Do not rely on color alone.

**Workspace canvas — flexible central area**

Displays the selected workspace while retaining the active instrument context.

**Footer / status strip — approximately 32 px high**

Displays live technical status:

- MIDI input state.
- Active voice count / voice limit.
- DSP load or processing indicator.
- Current quality mode.
- Optional audio-engine warning state.

Status values must be derived from the actual audio engine. Do not display simulated or hardcoded runtime values.

### 2.2 Global instrument context

The following state is shared across all workspaces:

- Selected instrument family.
- Selected instrument profile / model.
- Selected preset.
- String configuration and tuning.
- Active articulation profile.
- MIDI and MPE configuration.
- String assignment mode.
- Output configuration.
- Advanced-model settings.
- Current unsaved-change state.

Workspace navigation must not instantiate a new instrument or reset voice state. Changes to controls should be applied through the shared parameter/state model.

### 2.3 Preset system

Presets represent complete, versioned instrument configurations rather than collections of knob values alone.

A preset may contain:

- Instrument family and model identifier.
- Instrument profile and calibration reference.
- String construction, gauge, tuning, and per-string parameters.
- Acoustic body / bridge data or electric pickup / circuit data.
- Performance style and articulation settings.
- Fretboard assignment rules.
- MIDI / MPE mappings.
- Output and capture settings.
- User parameter overrides.

Preset browser requirements:

- Search by name and tag.
- Filter by instrument family, playing style, and category.
- Favorites and recent presets.
- Factory and user preset separation.
- Save, Save As, rename, duplicate, and delete user presets.
- Clearly indicate unsaved edits.
- Warn before destructive replacement or deletion.
- Support parameter locking during preset browsing.

**Parameter Locking:** users can protect selected settings while auditioning presets. Examples include tuning, string gauge, MIDI mapping, pickup selection, or output level. Locked parameters must be visibly identified and must not be overwritten by preset changes.

### 2.4 Undo / redo

Undo and redo should cover user-editable parameter changes, component selection changes only where meaningful, performance configuration, routing/mapping edits, and preset edits. Avoid creating hundreds of undo entries from continuous drag gestures; coalesce a drag into one edit transaction.

---

## 3. Visual design system

### 3.1 Design intent

**Aesthetic:** contemporary professional audio hardware; dark anodized surfaces; warm, understated material accents; precision labels; high-quality instrument imagery.

Avoid:

- Neon gradients.
- Excessive glow effects.
- Large decorative shadows.
- Overuse of cards and floating panels.
- Dense arrays of identical knobs.
- Gaming-style meters or visual effects.
- Decorative animations that compete with the instrument.

### 3.2 Core palette

| Token | Suggested value | Usage |
|---|---|---|
| `color.background` | `#111416` | Main application background |
| `color.surface` | `#202427` | Main panels |
| `color.surfaceRaised` | `#292E31` | Controls and secondary panels |
| `color.surfaceInset` | `#171A1D` | Recessed areas and instrument canvas |
| `color.border` | `#414548` | Subtle separators and panel edges |
| `color.textPrimary` | `#F0EBE1` | Main labels and values |
| `color.textSecondary` | `#B8B8B2` | Secondary labels |
| `color.textMuted` | `#92999B` | Metadata and inactive labels |
| `color.accentPrimary` | `#B99D75` | Active controls, focus, and selected states |
| `color.success` | `#9DBB9A` | Valid/ready states |
| `color.warning` | `#C5A477` | Caution and profile deviation |
| `color.error` | `#C87970` | Errors and invalid configurations |

Instrument accent colors are secondary identifiers and should not replace the shared palette:

| Instrument | Accent | Intent |
|---|---|---|
| Acoustic | `#B8956A` | Warm timber |
| Strat | `#8BABB3` | Cool steel |
| P Bass | `#AD866E` | Oxidized copper |

Use instrument accents sparingly for active selection, small indicators, and contextual highlights. Keep the primary application identity consistent.

### 3.3 Typography

Use a highly legible modern sans-serif for the interface, with a restrained display face for major instrument names and section titles.

Guidance at the reference viewport:

- Major product / instrument title: 24–30 px.
- Workspace title: 18–22 px.
- Panel title: 13–15 px.
- Control label: 11–13 px.
- Technical metadata: 10–12 px, never below accessible legibility.
- Parameter values: tabular numerals.

Do not use all-caps for long descriptive text. Reserve uppercase for short labels, section markers, and metadata.

### 3.4 Spacing and geometry

Use a consistent spacing scale based on 4 px increments. Panels should have sufficient internal spacing and clear grouping. Corners should be restrained: medium radius for panels, smaller radius for controls, and circular geometry only for rotary controls and status indicators.

Avoid turning every component into a separate card. Use subtle background and border changes to establish hierarchy.

### 3.5 Motion

Animations must be short, subtle, and informative.

Permitted examples:

- Smooth workspace transition.
- Short active-tab transition.
- Subtle string vibration visualization while notes sound.
- Meter movement and selection feedback.

Do not animate static instrument artwork continuously. Provide a reduced-motion option. UI animation must be independent of the audio thread and must not be used as a proxy for sound generation.

---

## 4. Main layout and responsive behavior

### 4.1 Reference dimensions

Target working size: **1180 × 800 px**.  
Minimum target size: **960 × 680 px**.

Suggested vertical allocation at reference size:

| Region | Approximate height |
|---|---:|
| Header | 72 px |
| Main navigation | 48 px |
| Workspace | 624 px |
| Footer / status | 32 px |
| Remaining area | Outer margins and spacing |

Suggested three-column workspace grid:

| Region | Approximate width | Function |
|---|---:|---|
| Left selector / context | 210 px | Instrument family, component list, contextual options |
| Main canvas | 530 px | Instrument, fretboard, or signal visualization |
| Right inspector | 370 px | Selected component's editable controls |
| Gaps / margins | Flexible | Separation and breathing room |

These are design targets, not rigid dimensions. Use a responsive grid that preserves usability.

### 4.2 Responsive rules

At narrower sizes:

- Collapse the left selector into a compact rail or dropdown.
- Preserve the central canvas as the dominant element.
- Convert the right inspector into a slide-out drawer or contextual panel.
- Keep the three primary workspace tabs accessible.
- Do not hide critical status or clipping/error indicators.
- Avoid horizontal scrolling for core workflows.

At larger sizes:

- Increase canvas space before enlarging every control.
- Allow the inspector to show more advanced details.
- Preserve readable control density and consistent hierarchy.

The UI must support host resizing and sensible minimum dimensions.

---

# PART 01 — INSTRUMENT WORKSPACE

## 5. Purpose and information hierarchy

The Instrument workspace is the visual centerpiece. It is where users select and configure the physical instrument and its sound-generating components.

The layout has three primary regions:

1. **Instrument selector** — Acoustic, Strat, P Bass and available profiles.
2. **Interactive instrument canvas** — visual representation of the selected instrument and selectable physical components.
3. **Contextual inspector** — controls for whichever component is selected.

### 5.1 Instrument family selector

Show three instrument families as clear, image-led selection tiles:

- **ACOUSTIC** — steel-string acoustic guitar.
- **STRAT** — Strat-style SSS electric guitar.
- **P BASS** — Precision-style four-string bass.

Each tile should include:

- Accurate instrument artwork.
- Instrument name.
- Short model descriptor.
- Active selection indicator.

Changing family loads the relevant model and its default profile. The user must be warned before discarding unsaved changes if the change would replace the current editable state.

### 5.2 Instrument canvas

The canvas must be a functional component-selection and feedback area, not a static product image.

Required behavior:

- Select physical components by clicking or keyboard navigation.
- Highlight the selected component.
- Show active strings during MIDI playback.
- Show string/fret assignment when relevant.
- Display subtle vibration feedback while notes are active.
- Show pickup position or bridge excitation where relevant.
- Support clean presentation mode and technical inspection mode.
- Provide tooltips for selectable regions.

The canvas should use custom vector or 3D artwork that accurately reflects the selected instrument. Placeholder imagery is acceptable during prototyping but not for final production.

The visualization must not imply physical measurements that the engine does not actually calculate. For example, a vibration animation should represent the active string state or a clearly labeled visualization, not an unverified simulation of exact displacement.

### 5.3 Contextual inspector

The inspector changes based on the selected component. It should present musical controls first and advanced physical controls second.

Suggested inspector tabs are instrument-specific rather than forced into one generic layout.

---

## 6. Acoustic instrument UI

**Instrument definition:** six-string steel-string acoustic guitar. The initial factory model may use a dreadnought profile; additional body shapes can be introduced as separate measured profiles.

### 6.1 Acoustic canvas components

Selectable regions:

- Strings and fretboard.
- Bridge and saddle.
- Soundboard / body.
- Soundhole / air cavity representation.
- Optional microphone capture points (also visible in Output workspace).

### 6.2 Inspector tabs

#### A. STRINGS

Musical controls:

- String set / material profile.
- String gauge preset.
- Tuning.
- Individual string enable and mute.
- Per-string level or response trim where supported.

Advanced controls:

- Linear density.
- Tension.
- Bending stiffness.
- Frequency-dependent damping.
- Dispersion parameters.
- Boundary / termination properties.

Per-string editing should be available without forcing users to configure six strings individually. Provide a set-level control plus optional per-string overrides.

#### B. BODY

Musical controls:

- Body profile / shape.
- Body resonance character.
- Resonance amount.
- Natural decay character.
- Low-frequency body response.

Advanced controls:

- Modal frequencies.
- Modal amplitudes.
- Modal damping / Q.
- Soundboard stiffness parameters.
- Body coupling parameters.
- Air-cavity resonance parameters.

Do not expose a large bank of independent modal sliders in the default view. Use a simplified body-character control with an advanced modal editor available on demand.

#### C. BRIDGE

Controls:

- Bridge compliance profile.
- Energy transfer / coupling.
- Saddle profile.
- String termination behavior.
- Bridge damping.

Advanced controls should be constrained to validated parameter ranges and should indicate when the user deviates from a measured profile.

#### D. RESONANCE

Controls:

- Body resonance balance.
- Air cavity contribution.
- Modal balance.
- Sympathetic string response.
- Resonance decay.

### 6.3 Acoustic performance-related instrument controls

Pluck position, excitation type, and excitation strength belong primarily in Performance. The Instrument workspace may expose a default or calibration value, but should not duplicate the full articulation editor.

---

## 7. Strat-style electric guitar UI

**Instrument definition:** six-string, three-single-coil Strat-style electric guitar with a five-way selector and passive electrical controls.

### 7.1 Strat canvas components

Selectable regions:

- Six strings and fretboard.
- Neck pickup.
- Middle pickup.
- Bridge pickup.
- Five-way selector.
- Volume and tone controls.
- Bridge / string termination.

### 7.2 Pickup selector

The five-way selector must be a prominent interactive component with five positions:

1. Bridge.
2. Bridge + Middle.
3. Middle.
4. Middle + Neck.
5. Neck.

The selector must route the modeled pickup outputs and preserve relevant phase, polarity, loading, and combination behavior. It must not simply choose five EQ presets.

### 7.3 Inspector tabs

#### A. PICKUPS

For each pickup independently:

- Physical position.
- Pickup height / string distance.
- Magnetic field strength or validated equivalent control.
- Aperture / sensing width.
- Coil profile.
- Resistance.
- Inductance.
- Output level calibration.

The interface should make the three pickups easy to compare. Use a compact pickup comparison view where useful.

#### B. SELECTOR

- Five-way position.
- Pickup combination state.
- Phase / polarity diagnostic where supported.
- Optional advanced pickup combination settings.

#### C. CONTROLS

Traditional instrument controls:

- Master volume.
- Tone control(s), according to the modeled circuit.
- Tone capacitor profile.
- Potentiometer profile.

Advanced electrical parameters:

- Pickup coil resistance and inductance.
- Cable capacitance.
- Input loading / impedance.
- Circuit topology.
- Optional treble-bleed network.

Use authentic hardware-inspired knobs for volume and tone. Knob position and displayed value must remain synchronized.

#### D. RESPONSE

- Pickup response visualization.
- Position-dependent sensing comparison.
- Frequency response display.
- Optional magnetic interaction / pickup-height diagnostics when actually supported by the model.

### 7.4 Output distinction

The Strat output in the Output workspace should default to instrument-level electrical DI. Amplifier simulation and post-instrument effects are deliberately outside this instrument UI specification.

---

## 8. Precision-style bass UI

**Instrument definition:** four-string, 34-inch-scale Precision-style bass with a split-coil pickup and passive volume/tone controls.

### 8.1 Bass canvas components

Selectable regions:

- Four strings and fretboard.
- Split-coil pickup halves.
- Bridge / string termination.
- Volume control.
- Tone control.

### 8.2 Inspector tabs

#### A. STRINGS

- String set and construction profile.
- Winding / core profile where modeled.
- Gauge.
- Tuning.
- Per-string tension.
- Per-string damping profile.
- Fret-dependent decay profile.

Advanced controls:

- Linear density.
- Stiffness / inharmonicity.
- Frequency-dependent damping.
- Fret-indexed damping parameters.
- String termination properties.

Because bass-string damping can vary by string, frequency, and fret, the UI should support calibrated per-string and fret-dependent profiles. Do not imply that one global decay slider fully describes the bass string behavior.

#### B. PICKUP

Model the split-coil pickup as two sensing assemblies with their correct relative positions and electrical relationships.

Controls:

- Pickup position.
- Pickup height / string spacing.
- Coil response profile.
- Magnetic response parameters.
- Coil resistance and inductance.
- Relative phase / polarity diagnostics where supported.

Do not add a pickup-blend control to the standard Precision configuration unless a different pickup system is explicitly selected.

#### C. CONTROLS

- Master volume.
- Tone.
- Potentiometer profile.
- Tone capacitor profile.
- Cable loading and output impedance in advanced mode.

#### D. RESPONSE

- Low-frequency response.
- Partial decay profile.
- Pickup response.
- String-to-pickup interaction diagnostics.

### 8.3 Bass-specific visual language

The bass panel should feel substantial and uncluttered. Emphasize the four string lanes, split-coil pickup geometry, and low-frequency response rather than replicating the Strat panel with fewer strings.

---

# PART 02 — PERFORMANCE WORKSPACE

## 9. Purpose and information hierarchy

The Performance workspace determines how MIDI notes and expression input become plausible physical playing actions.

Its four primary regions are:

1. Playing style.
2. Articulation matrix and articulation editor.
3. Fretboard intelligence / string assignment.
4. Expression and MIDI/MPE routing.

This workspace must treat articulations as physical events and state transitions, not simply as alternate samples or static sound presets.

## 10. Playing style

Playing-style choices are instrument-dependent.

### Acoustic

- Fingerstyle.
- Fingernail.
- Pick.
- Strumming.
- Hybrid picking.

### Strat

- Finger.
- Pick.
- Alternate picking.
- Palm-muted picking.
- Legato-oriented playing.

### P Bass

- Fingerstyle.
- Pick.
- Slap.
- Pop.
- Muted / ghost-note playing.

Selecting a style changes the default excitation and articulation behavior. It must not merely load an EQ or volume preset.

Depending on the physical model, style selection may adjust:

- Contact material / compliance profile.
- Excitation location.
- Excitation force response.
- Release behavior.
- Finger alternation behavior.
- Articulation availability and mapping defaults.

The user must be able to override style defaults.

## 11. Articulation matrix

Provide a clear matrix of instrument-appropriate techniques. Each technique opens a contextual articulation editor.

### 11.1 Shared articulation categories

- Finger / pick excitation.
- Hammer-on.
- Pull-off.
- Slide.
- Bend.
- Vibrato.
- Palm mute / damping.
- Dead note.
- Natural harmonic.
- Artificial harmonic where supported.
- Fret / string noise.

### 11.2 Acoustic-specific articulations

- Fingerstyle.
- Fingernail.
- Pick downstroke / upstroke.
- Strum down / up.
- Hybrid picking.
- Palm mute.
- Natural harmonics.
- Artificial harmonics.
- Dead notes.
- Fret noise.
- Slides.
- Hammer-ons / pull-offs.

### 11.3 Strat-specific articulations

- Finger picking.
- Pick attack.
- Alternate picking.
- Palm mute.
- Hammer-on / pull-off.
- Slide.
- Bend.
- Vibrato.
- Natural / artificial / pinch harmonic.
- String release / pick scrape / fret noise.
- Tremolo-arm pitch movement if supported by the performance model.

### 11.4 Bass-specific articulations

- Fingerstyle.
- Thumb slap.
- Pop.
- Pick.
- Ghost note.
- Palm mute.
- Slide.
- Hammer-on / pull-off.
- Vibrato.
- Harmonics.
- Dead note.

### 11.5 Articulation editor fields

Every articulation should expose a consistent editor structure where relevant:

| Field | Purpose |
|---|---|
| Enable | Enable or disable the articulation |
| Trigger | Key switch, MIDI note, CC, velocity range, legato, or MPE condition |
| Physical action | Excitation, contact, damping, collision, or state modification |
| Response | Intensity or physical response scaling |
| Transition | Behavior relative to the previous note or active string state |
| Noise | Incidental physical noise level, if modeled |
| Mapping | MIDI assignment and learn status |

The editor should show only parameters relevant to the selected articulation. Do not show a universal wall of controls that are meaningless for certain techniques.

Examples:

- A hammer-on modifies an already vibrating string through fret/finger contact and should preserve the existing string state.
- A slide changes the stopping position continuously rather than triggering a newly picked sample.
- A bend modifies pitch through a continuous physical or modeled string-bending process.
- A pull-off has its own release excitation behavior.
- Slap/pop involve specific displacement and collision behavior, not just an added transient sample.

### 11.6 Trigger mapping

Support:

- Key switches.
- MIDI CC.
- Velocity ranges.
- Legato detection.
- MPE per-note expression.
- User-defined articulation maps.

Provide mapping conflict warnings and a visual indication when two articulations share a trigger.

## 12. Fretboard intelligence and string assignment

The fretboard visualization is a core performance feature.

It must display:

- Four or six strings according to instrument.
- Fret positions.
- Active notes.
- Assigned string and fret for each note.
- Current note transitions.
- Optional finger assignments.
- Open-string assignments.
- Impossible or conflicting assignments.

The fretboard should update in real time from incoming MIDI and the current string-assignment engine.

### 12.1 Assignment modes

| Mode | Behavior |
|---|---|
| Automatic | Select a plausible string/fret assignment |
| Lowest position | Prefer the lowest practical fret position |
| Nearest position | Favor continuity from the previous position |
| String locked | Keep notes on selected strings where feasible |
| Manual | User supplies or edits string/fret assignments |

### 12.2 Assignment constraints

- Maximum fret span.
- Preferred fret range.
- Open-string preference.
- String-specific restrictions.
- Note overlap handling.
- Alternate tuning support.
- Finger-position preferences.
- Chord voicing constraints.
- Legato continuity preferences.

### 12.3 Voicing inspector

Provide a compact inspector that shows how incoming MIDI notes will be assigned to strings and frets. Include warnings for physically implausible or impossible shapes, with an option to override automatic assignment.

The system must not falsely claim to infer real guitarist fingering from ordinary MIDI. It is a configurable assignment engine unless additional performance input provides actual fingering information.

## 13. Expression and MIDI/MPE routing

Use a source-to-destination routing layout.

Potential default mappings:

| Source | Possible destination |
|---|---|
| Velocity | Excitation force, attack character, brightness |
| Pitch bend | String bend / pitch movement |
| Channel aftertouch | Global pressure or selected performance response |
| Polyphonic aftertouch / MPE pressure | Per-note pressure response |
| Mod wheel / CC1 | Vibrato depth |
| Expression / CC11 | Performance dynamics |
| CC74 | Pluck position or timbral expression |

These are suggested mappings, not mandatory hardcoded behavior. Users must be able to edit, save, and recall routing.

### 13.1 Mapping editor

Each route should display:

- Input source.
- Destination parameter.
- Minimum and maximum range.
- Response curve.
- Polarity / direction.
- Smoothing behavior.
- MIDI learn status.
- Conflict indication.

Provide a curve editor for velocity and other continuous sources. Allow the user to route one source to multiple destinations with independent depth and curve settings.

### 13.2 MPE support

Provide a distinct MPE mode with:

- Per-note pitch movement.
- Per-note pressure.
- Per-note timbral expression where available.
- Configurable pitch-bend range.
- MPE zone configuration.
- Clear display of per-note versus channel-wide controls.

The UI must clearly explain when a MIDI source acts globally and when it acts independently per note.

## 14. Humanization and repeatability

Do not rely on a single generic Humanize knob.

Provide separate controls for:

- Timing variation.
- Excitation variation.
- String-selection variation.
- Finger alternation behavior.
- Articulation variation where supported.

Humanization must be bounded and musically meaningful. Include:

- Amount / depth per category.
- Deterministic seed.
- Deterministic mode.
- Reset / regenerate behavior.
- Project recall and offline-render consistency.

Deterministic mode must produce repeatable results for the same input, seed, state, and render conditions.

---

# PART 03 — OUTPUT WORKSPACE

## 15. Purpose and information hierarchy

The Output workspace determines how the modeled instrument is captured and delivered to the DAW.

It is not a generic effects-chain page. Amplifier simulation and post-instrument effects are outside the core scope. The instrument should provide a convincing acoustic capture or electrical DI signal that can be processed by external plugins.

The workspace contains:

1. Instrument-specific capture configuration.
2. Signal and metering.
3. Engine quality and resource controls.
4. Calibration and profile status.

## 16. Acoustic output

Provide an interactive microphone/capture-position diagram with selectable perspectives.

Capture choices:

- Soundhole perspective.
- Bridge perspective.
- Neck perspective.
- Stereo body capture.

Controls, where implemented:

- Microphone/capture position.
- Distance.
- Perspective blend.
- Stereo width.
- Phase alignment.
- Output level.

The controls must be backed by measured or modeled capture responses. Do not present a generic EQ preset as a physically positioned microphone.

The capture visualization should make the chosen perspective clear and provide a concise signal-path summary.

## 17. Strat output

Default signal is instrument-level electrical DI.

Controls:

- Active pickup / selector state summary.
- Volume circuit response.
- Tone circuit response.
- Cable capacitance / loading in advanced mode.
- Output impedance where modeled.
- Output trim.
- Mono DI output.

Pickup position and circuit settings should remain consistent with the Instrument workspace. Avoid duplicating controls in ways that create conflicting parameter values; provide linked controls or shortcuts to the owning inspector.

## 18. Precision Bass output

Default signal is instrument-level electrical DI.

Controls:

- Split-coil pickup configuration summary.
- Volume circuit response.
- Tone circuit response.
- Cable loading / output impedance in advanced mode.
- Output trim.
- Mono DI output.

Keep standard Precision-style pickup architecture authentic. Do not introduce pickup blend controls unless the selected model explicitly includes multiple independently selectable pickup systems.

## 19. Shared signal and metering

Show:

- Output level meter.
- Peak indicator.
- Clipping state.
- Polarity status where appropriate.
- Mono/stereo output status.
- Output trim.
- Optional peak hold and meter reset.

Meters must reflect the actual output signal and use clear clipping indicators. Do not normalize or silently alter output level to conceal clipping.

## 20. Engine quality modes

Provide three user-facing modes:

| Mode | Intended use |
|---|---|
| Efficient | Lower processing demand for live playing and dense sessions |
| Studio | High-quality real-time performance; recommended default |
| Maximum | Highest-quality supported rendering, including offline rendering where available |

Quality mode must correspond to real engine configurations. It must not simply multiply the output or toggle an arbitrary oversampling value.

Display:

- Selected mode.
- Estimated or measured resource use where meaningful.
- Any limitations of the selected mode.
- Whether the host is rendering offline or in real time, if available.

The UI must not promise zero latency or fixed CPU usage across all systems.

## 21. Calibration and profile status

Display:

- Active instrument profile.
- Calibration source or profile name.
- Calibration version.
- Modified / factory state.
- Measured versus modeled parameter indicators where known.
- Reset to calibrated profile action.
- Save as custom profile action.

Provide clear differentiation between:

- Factory profile values.
- User overrides.
- Measured data.
- Estimated or modeled parameters.

Do not imply that a profile has been physically measured if it is based on an estimated or generic model.

---

## 22. Advanced Model Lab

The Model Lab is an advanced engineering layer, not a fourth primary workspace. It is accessible from relevant sections of Instrument, Performance, and Output through a consistent **Advanced** entry point.

It exposes deeper physical and diagnostic parameters without overwhelming the primary interface.

### 22.1 Model Lab sections

- String Model.
- Solver / Resolution.
- Damping.
- Contact and Collision.
- Resonance / Coupling.
- Pickup / Circuit (electric models).
- Calibration.
- Diagnostics.

### 22.2 Parameter visualization

Where supported, show:

- String decay curves.
- Partial decay behavior.
- Modal frequency and damping displays.
- Frequency response.
- Pickup response comparison.
- Excitation profile.
- Contact/collision diagnostics.
- Calibration fit or deviation display.

Every graph must identify its axes, units, parameter source, and whether values are measured, estimated, or modeled.

### 22.3 Reference comparison

Allow an authorized reference recording/profile to be compared against the current model.

Potential displays:

- Pitch deviation.
- Attack envelope comparison.
- Spectral difference.
- Partial decay comparison.
- Modal frequency / Q comparison.

Do not label an internal visualization as a validated scientific measurement unless its method and inputs are defined.

### 22.4 Calibration management

- Load a compatible calibration profile.
- Save a user calibration as a new profile.
- Duplicate profiles.
- Compare factory and user values.
- Reset individual components or the full profile.
- Validate parameter ranges before activation.
- Preserve provenance and calibration version metadata.

### 22.5 Safety and stability

Advanced parameter editing must use validated ranges. Invalid or unstable values should be rejected or constrained before reaching the real-time DSP engine.

Provide a clear recovery action to restore the last valid state or factory calibration.

---

## 23. Control component library

All controls should use a consistent interaction model.

### 23.1 Precision rotary controls

Use for continuous parameters such as:

- Resonance amount.
- Damping amount.
- Pickup height.
- Volume and tone.
- Excitation intensity.

Behavior:

- Drag to adjust.
- Double-click to enter a precise value or reset to default.
- Modifier-drag for fine adjustment.
- Display units where applicable.
- Right-click for MIDI learn, reset, parameter information, and supported copy/paste actions.
- Provide keyboard accessibility.

### 23.2 Sliders

Use for continuous ranges and balances where direct value comparison is useful.

Requirements:

- Visible label and value.
- Clear minimum/maximum behavior.
- Correct logarithmic or perceptual scaling where required.
- Optional numeric entry.
- Reset and MIDI learn access.

### 23.3 Mechanical selectors

Use for discrete configurations:

- Pickup position.
- String set.
- Body profile.
- Playing style.
- Quality mode.
- Assignment mode.

Selectors must clearly show the selected state and all available options.

### 23.4 Analytical displays

Use for measured or computed response visualization. These are read-only unless the specific graph supports editing.

Interactive graphs must distinguish editable handles from display-only data.

### 23.5 Parameter states

Every control should support:

- Normal.
- Hover.
- Focus.
- Active / dragging.
- Modified from profile.
- Locked.
- Disabled / unavailable.
- Invalid / out of range.
- Automation-controlled, where the host exposes that information.

### 23.6 Tooltips and help

Tooltips should explain:

1. What the parameter controls.
2. What changing it generally does to the sound or physical model.
3. Units and valid range where relevant.
4. Whether the value is measured, modeled, or a musical macro.

Keep tooltips concise. Provide deeper technical documentation through a help panel or reference manual.

---

## 24. Global professional features

The following features should be designed into the interface from the beginning, even if some are delivered after the first release.

| Feature | Requirement |
|---|---|
| A/B comparison | Compare two complete instrument states, with level-matched audition option |
| Preset browser | Search, tags, categories, favorites, recent |
| Quick save | Save current user configuration |
| Undo / redo | Coalesced parameter and mapping edits |
| MIDI learn | Assign supported parameters and triggers |
| Parameter locking | Protect selected values during preset changes |
| Randomization | Bounded physical variation with exclusions and repeatable seed |
| Advanced mode | Access physical and diagnostic settings |
| Reset to profile | Restore calibrated/factory values at selected scope |
| Parameter search | Find controls by name, category, or description |
| Accessibility | Keyboard navigation, readable contrast, focus states |
| State recall | Correct DAW project/session restoration |
| Automation | Stable host parameter IDs and useful parameter names |

### 24.1 Controlled randomization

Randomization should create plausible instrument variation, not arbitrary parameter noise.

Support:

- Randomize selected component.
- Randomize selected parameter groups.
- Exclude locked parameters.
- Set intensity / variation range.
- Preserve musical setup such as tuning and MIDI mappings.
- Reproducible seed.
- Undo randomization as one action.

### 24.2 Parameter search

A global search should locate a parameter and open the correct workspace and inspector section. Search results should identify the instrument component and whether the parameter is a basic control or advanced model parameter.

---

## 25. State, parameter, and UI architecture requirements

The UI must be backed by a structured parameter/state model rather than storing values inside individual widgets.

### 25.1 Separation of concerns

Recommended conceptual layers:

1. **Instrument state** — selected model, physical profile, strings, body, bridge, pickups, and circuits.
2. **Performance state** — styles, articulations, assignments, MIDI/MPE routes, and humanization.
3. **Output state** — capture configuration, output level, meters' settings, and quality mode.
4. **Global state** — preset metadata, locks, UI preferences, undo history, and window state.
5. **DSP parameter interface** — validated parameter values delivered to the audio engine through a real-time-safe mechanism.

### 25.2 Parameter metadata

Every exposed parameter should define:

- Stable parameter ID.
- Display name.
- Description.
- Owning instrument/component.
- Data type.
- Units.
- Minimum and maximum.
- Default value.
- Scaling type.
- Formatting rules.
- Automation capability.
- MIDI-learn capability.
- Factory/profile baseline.
- Advanced/basic classification.
- Availability by instrument model.

Parameter IDs must remain stable across UI revisions to protect DAW automation and saved sessions.

### 25.3 Real-time safety

The UI must not:

- Allocate memory in the audio callback.
- Perform file loading in the audio callback.
- Block on locks held by UI or background threads.
- Run calibration fitting or neural-model initialization in the audio callback.
- Perform expensive graph calculations on the audio thread.

Use prevalidated parameter updates and appropriate lock-free or real-time-safe communication. UI visualization should consume telemetry or snapshots without blocking audio processing.

### 25.4 Preset and session persistence

Persist:

- Instrument and profile identity.
- All user-modified instrument parameters.
- Performance and articulation mappings.
- Fretboard assignment settings.
- MIDI/MPE configuration.
- Output settings.
- Quality preference where appropriate.
- Parameter locks if intended to be session-persistent.
- Calibration profile identity and version.

Do not persist ephemeral display-only state as DSP state. Keep UI layout preferences separate from instrument sound state.

---

## 26. Accessibility and usability

Minimum requirements:

- Keyboard navigation for all primary controls.
- Visible focus indicators.
- Sufficient text and control contrast.
- No information conveyed by color alone.
- Tooltips or accessible descriptions for icon-only actions.
- Support for host window resizing.
- Reduced-motion setting.
- Sensible control hit areas.
- Numeric entry for precision-critical controls.
- Clear error and recovery messages.

The interface should remain usable without relying on hover alone. Important actions must be discoverable through labels, menus, or keyboard navigation.

---

## 27. UX test scenarios

The following scenarios should be included in design review and implementation QA.

### 27.1 Instrument selection

1. Open the plugin.
2. Select Acoustic.
3. Select a factory acoustic profile.
4. Change string tuning.
5. Navigate to Performance and Output.
6. Return to Instrument.
7. Verify that tuning and instrument state are preserved.

### 27.2 Strat pickup selection

1. Select Strat.
2. Choose the bridge pickup.
3. Play a sustained note.
4. Change to neck pickup while the note is active.
5. Verify that the selector, pickup model, and output respond correctly without a UI state reset or unintended click.
6. Verify that the active selector position is saved and recalled.

### 27.3 Bass articulation

1. Select P Bass.
2. Select fingerstyle.
3. Configure slap and pop triggers.
4. Play MIDI notes using each articulation.
5. Verify that the physical excitation behavior changes and that the articulation status is shown accurately.
6. Save and reload the preset.

### 27.4 Fretboard assignment

1. Play a multi-note chord.
2. Inspect the selected string/fret assignments.
3. Switch between Automatic and Nearest Position.
4. Verify that assignments update predictably.
5. Introduce an impossible constraint and verify that the UI reports the conflict rather than silently choosing an invalid assignment.

### 27.5 Parameter locking

1. Lock tuning and MIDI mapping.
2. Audition a different preset.
3. Verify locked settings are preserved.
4. Verify non-locked instrument parameters change as expected.
5. Save the resulting configuration.

### 27.6 Calibration safety

1. Open Model Lab.
2. Edit an advanced parameter.
3. Enter an out-of-range value.
4. Verify validation prevents an unsafe value from reaching the DSP engine.
5. Restore the last valid state.
6. Confirm the calibration state indicator is accurate.

### 27.7 Session recall

1. Configure all three workspaces.
2. Save a DAW project.
3. Close and reopen the project.
4. Verify instrument, performance, routing, output, and preset state are restored.
5. Verify automation IDs remain valid.

---

## 28. UI acceptance criteria

The UI is not ready for release until all applicable criteria pass.

### Visual quality

- [ ] Three workspaces are visually coherent and clearly differentiated.
- [ ] The instrument canvas is accurate, selectable, and responsive.
- [ ] Acoustic, Strat, and P Bass have genuinely instrument-specific inspectors.
- [ ] Visual hierarchy remains clear at minimum and reference window sizes.
- [ ] Typography, contrast, spacing, and control density are consistent.
- [ ] No decorative element obstructs important controls.
- [ ] The interface supports reduced motion.

### Functional correctness

- [ ] All visible controls affect the intended parameter.
- [ ] Parameter values and control positions remain synchronized.
- [ ] Workspace changes preserve instrument state.
- [ ] Preset load/save correctly restores all relevant state.
- [ ] Undo/redo behaves predictably.
- [ ] Parameter locks work during preset browsing.
- [ ] MIDI learn and mapping conflicts are handled correctly.
- [ ] MPE controls distinguish per-note and channel-wide behavior.
- [ ] Instrument-specific articulations are shown appropriately.
- [ ] Fretboard assignment display reflects the actual assignment engine.
- [ ] Output meters display actual engine output.
- [ ] Advanced parameter validation prevents invalid values reaching DSP.

### Performance and stability

- [ ] UI rendering does not block or allocate in the audio callback.
- [ ] Instrument visualizations remain responsive during playback.
- [ ] Heavy graphs and diagnostics run outside the audio callback.
- [ ] Host window resizing is stable.
- [ ] State recall is deterministic within defined project conditions.
- [ ] No stuck controls, stale values, or incorrect status indicators.

### DAW integration

- [ ] Parameter IDs are stable.
- [ ] Automation values restore correctly.
- [ ] Plugin state saves and loads correctly.
- [ ] MIDI and MPE input are handled according to the plugin's supported specification.
- [ ] Real-time and offline rendering do not diverge unexpectedly.

---

## 29. Recommended implementation sequence

The UI should be implemented in parallel with the DSP parameter architecture, but the interface must not invent controls before the underlying engine behavior is defined.

### Stage 1 — UI foundation

- Establish theme, typography, spacing, and control components.
- Build persistent header, navigation, and footer.
- Implement responsive three-column layout.
- Define shared instrument and workspace state.
- Implement preset browser shell and state-change indicators.

**Exit condition:** all three workspaces navigate reliably and preserve a shared mock instrument state.

### Stage 2 — Instrument workspace

- Build instrument family selector.
- Build accurate instrument canvases.
- Implement selectable component regions.
- Build Acoustic, Strat, and P Bass inspectors.
- Bind controls to stable parameter metadata.

**Exit condition:** each model displays only relevant controls and all exposed controls update the correct parameter state.

### Stage 3 — Performance workspace

- Build playing-style selector.
- Build articulation matrix and contextual editor.
- Build fretboard visualization.
- Implement string assignment display.
- Build MIDI/MPE routing editor.
- Build humanization controls and deterministic seed handling.

**Exit condition:** the UI reflects actual performance-engine state and all mappings persist through save/reload.

### Stage 4 — Output workspace

- Build instrument-specific capture layouts.
- Build output meter and signal status.
- Add quality-mode selection.
- Add calibration/profile status.

**Exit condition:** displayed output state and meters reflect the actual DSP engine.

### Stage 5 — Model Lab

- Build advanced parameter inspectors.
- Build diagnostic visualizations.
- Add calibration profile handling.
- Add parameter validation and recovery.

**Exit condition:** advanced parameter editing is safe, reversible, and correctly represented in saved state.

### Stage 6 — Production hardening

- Accessibility review.
- Host resizing review.
- Preset/session recall tests.
- MIDI/MPE mapping tests.
- Automation and parameter-ID validation.
- CPU and UI responsiveness checks.
- Cross-platform visual verification.

**Exit condition:** all release acceptance criteria pass in supported DAWs and standalone mode.

---

## 30. Final design decisions

| Decision | Specification |
|---|---|
| Product name | FORMÉ (working name) |
| Primary navigation | Instrument / Performance / Output |
| Instrument families | Acoustic / Strat / P Bass |
| Main layout | Three-column console with central instrument canvas |
| Reference size | 1180 × 800 px |
| Minimum size target | 960 × 680 px |
| Visual theme | Obsidian / Graphite / Ivory / Champagne |
| Instrument accents | Timber / Steel / Copper |
| Advanced controls | Contextual Model Lab, not a fourth primary workspace |
| Primary visual signature | Interactive physical-instrument canvas |
| Core interaction | Component selection, contextual inspection, continuous performance feedback |
| Output philosophy | Instrument-level acoustic capture or electrical DI; external amp/effects remain separate |

### Final product standard

FORMÉ should feel like a purpose-built professional instrument, not a generic synthesizer with guitar presets. Its visual identity comes from the instrument canvas, its usability comes from the three-workspace structure, and its technical credibility comes from controls that accurately reflect the underlying physical model.

The interface is successful when a musician can get a compelling sound quickly, an experienced producer can shape the instrument in detail, and an advanced user can inspect and calibrate the physical model without compromising the clarity of the main interface.
