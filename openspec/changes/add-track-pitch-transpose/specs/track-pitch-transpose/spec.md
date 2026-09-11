## Purpose

Lets each person listening to a track choose a different key live, per
channel eligibility, so the pitch of drums/click-style channels never
changes while everything else can be auditioned in another key — without
permanently altering the track for anyone else unless that person
explicitly chooses to.

## ADDED Requirements

### Requirement: Track metadata controls are visually prominent
The player header's BPM and tonality controls SHALL share a consistent,
moderately larger and more emphasized visual treatment than other badges
in the header.

#### Scenario: Viewing BPM and tonality together
- **WHEN** a track with both a BPM and a tonality is open in the player
- **THEN** both controls are shown with the same larger, emphasized
  styling, visually distinguishable from other header badges

### Requirement: Tonality control opens a transpose selector
Clicking the tonality control SHALL open a selector letting the user
choose a note from the twelve-note enum (C, C#, D, D#, E, F, F#, G, G#,
A, A#, B) and an octave shift of one octave up, one octave down, or no
shift, relative to the track's original tonality.

#### Scenario: Opening the selector
- **WHEN** the user clicks the tonality control while a track is open
- **THEN** the transpose selector opens, showing the track's current
  effective note and octave shift

#### Scenario: Octave shift bounded to one octave each direction
- **WHEN** the user is choosing an octave shift in the selector
- **THEN** the only available options are one octave down, no shift, or
  one octave up — no wider shift is offered

#### Scenario: Selector only offers valid notes
- **WHEN** the user is choosing a note in the selector
- **THEN** the only selectable values are the twelve chromatic notes, with
  no way to enter an arbitrary value

### Requirement: Transposing re-pitches only pitch-editable channels live
Changing the tonality selector while a track is loaded SHALL shift, in
real time, the pitch of every channel marked pitch-editable by the
interval between the selected note/octave and the track's original
tonality, while every channel not marked pitch-editable SHALL keep
playing at its original pitch. Every channel SHALL remain synchronized in
playback position with the others regardless of any pitch shift applied
to it.

#### Scenario: Transposing while editable and non-editable channels play together
- **WHEN** the user selects a different note or octave while a track with
  both pitch-editable and non-editable channels is playing
- **THEN** the pitch-editable channels' audible pitch shifts by the
  selected interval, the non-editable channels' pitch is unchanged, and
  every channel stays in sync with the others for the rest of playback

#### Scenario: Transposing a track with no pitch-editable channels
- **WHEN** the user selects a different note or octave on a track where no
  channel is marked pitch-editable
- **THEN** the selector still updates to reflect the new selection, but no
  channel's audible pitch changes

### Requirement: Tonality edits are local to the browser by default
Changing the tonality selector SHALL immediately store the new note and
octave shift for that track in the browser's local storage, scoped to
that specific track, without prompting the user for confirmation. It
SHALL NOT modify the track's tonality on the backend.

#### Scenario: Editing tonality writes a local-only override
- **WHEN** the user changes the tonality selector for a track
- **THEN** the new note and octave shift are saved to that browser's local
  storage for that track immediately, with no confirmation prompt, and the
  track's backend-stored tonality is unchanged

#### Scenario: Reopening the same track in the same browser
- **WHEN** the user who made a local tonality edit reopens the same track
  later in the same browser
- **THEN** the player loads with that local override applied, instead of
  the track's original tonality

#### Scenario: Another browser sees the original tonality
- **WHEN** a different person, or the same person in a different browser
  or machine, opens the same track
- **THEN** the player loads with the track's original server-stored
  tonality, unaffected by any local override saved elsewhere

### Requirement: Explicit sync persists a local edit as the track's tonality
Whenever the browser's local tonality override for a track differs from
that track's server-stored tonality, the player SHALL show a sync
control. Activating it SHALL update the track's tonality on the backend
to match the local override and SHALL clear the local "unsynced"
indicator.

#### Scenario: Sync control appears after a local edit
- **WHEN** the user's local tonality override for a track differs from
  the track's server-stored tonality
- **THEN** the player shows a sync control

#### Scenario: Activating sync persists the override
- **WHEN** the user activates the sync control
- **THEN** the track's tonality on the backend is updated to match the
  local override, and the sync control no longer indicates an unsynced
  state

#### Scenario: No sync control when there is nothing to sync
- **WHEN** the user has no local override for a track, or the local
  override already matches the track's server-stored tonality
- **THEN** the player does not show the sync control
