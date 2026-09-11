## MODIFIED Requirements

### Requirement: Optional BPM and tonality at import
The import review SHALL let the user optionally enter a BPM and select a
tonality for the track from a fixed set of the twelve chromatic notes (C,
C#, D, D#, E, F, F#, G, G#, A, A#, B), saved with it when provided. The
tonality field SHALL NOT accept any value outside that set.

#### Scenario: Entering BPM and tonality
- **WHEN** the user fills in a BPM and/or selects a tonality from the
  offered notes during review and confirms
- **THEN** the saved track includes those values

#### Scenario: Leaving BPM and tonality blank
- **WHEN** the user leaves BPM and tonality blank and confirms
- **THEN** the track is saved successfully without them — both fields are
  optional

#### Scenario: Rejecting a non-numeric BPM
- **WHEN** the user enters a non-numeric value into the BPM field
- **THEN** the field does not accept it, so a saved track's BPM is always
  either a valid number or absent

#### Scenario: Tonality field only offers the twelve notes
- **WHEN** the user opens the tonality field during import review
- **THEN** the only selectable values are the twelve chromatic notes, and
  there is no way to type or submit an arbitrary tonality value

## ADDED Requirements

### Requirement: Per-channel pitch-editable flag at import
The import review SHALL let the user mark, per channel, whether that
channel's pitch is allowed to be transposed later during playback. Each
channel SHALL default to pitch-editable when the review screen first
opens, and confirming the review SHALL save each channel's flag as shown
at confirmation time.

#### Scenario: Unmarking a percussive channel
- **WHEN** the user unchecks the pitch-editable flag for a channel (for
  example, a drums or click channel) during review and confirms
- **THEN** the saved channel is recorded as not pitch-editable

#### Scenario: Leaving a channel's default flag unchanged
- **WHEN** the user confirms review without touching a channel's
  pitch-editable flag
- **THEN** that channel is saved as pitch-editable, since it defaults to
  on

#### Scenario: Flag is saved per channel independently
- **WHEN** a track has multiple channels with different pitch-editable
  flags set during review
- **THEN** each channel is saved with its own flag value, independent of
  the others
