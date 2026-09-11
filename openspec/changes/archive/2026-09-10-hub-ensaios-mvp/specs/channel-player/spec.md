## Purpose

Plays every channel of a selected track from a single synchronized
transport, while letting the user mute, solo, and adjust each channel's
volume in real time so they can isolate individual parts during rehearsal.

## ADDED Requirements

### Requirement: Single transport controls every channel
A single play/pause control SHALL start and stop playback of every channel
of the open track simultaneously.

#### Scenario: Pressing play
- **WHEN** the user presses play
- **THEN** every channel of the open track begins audio playback together,
  starting from the current shared playback position

#### Scenario: Pressing pause
- **WHEN** the user presses pause during playback
- **THEN** every channel stops playback together, all at the same playback
  position

### Requirement: Seeking repositions all channels together
Moving the shared position control SHALL reposition every channel to the
same timestamp.

#### Scenario: Seeking during playback
- **WHEN** the user drags the seek control to a new position while the
  track is playing
- **THEN** playback continues from that new position for every channel, in
  sync with each other

#### Scenario: Seeking while paused
- **WHEN** the user drags the seek control to a new position while the
  track is paused
- **THEN** the shared playback position updates for every channel without
  starting playback

### Requirement: Per-channel volume control
Each channel SHALL have an independent volume control, adjustable from 0%
to 100%, applied live during playback.

#### Scenario: Lowering one channel's volume during playback
- **WHEN** the user lowers a channel's volume control while the track is
  playing
- **THEN** that channel's audible level decreases immediately, other
  channels' levels are unaffected, and playback is not interrupted

### Requirement: Per-channel mute
Each channel SHALL be independently mutable without affecting other
channels.

#### Scenario: Muting a channel
- **WHEN** the user mutes a channel
- **THEN** that channel becomes silent immediately while every other
  channel continues playing at its current level

#### Scenario: Un-muting a channel
- **WHEN** the user un-mutes a previously muted channel
- **THEN** that channel's audio resumes at the volume it had before it was
  muted

### Requirement: Per-channel solo
Soloing one or more channels SHALL silence every non-soloed channel without
discarding their individual mute/volume settings.

#### Scenario: Soloing a single channel
- **WHEN** the user solos exactly one channel
- **THEN** only that channel is audible and every other channel is
  silenced, regardless of those other channels' own mute/volume settings

#### Scenario: Clearing the last solo
- **WHEN** the user un-solos the last currently soloed channel
- **THEN** every channel returns to being audible according to its own
  individually stored mute/volume state

### Requirement: Master volume
A single master volume control SHALL scale the combined output of all
channels together, preserving each channel's relative mix balance.

#### Scenario: Adjusting master volume during playback
- **WHEN** the user adjusts the master volume control while the track is
  playing
- **THEN** overall loudness changes proportionally while every channel's
  individual volume, mute, and solo state stays unchanged

### Requirement: Playback position feedback
The transport SHALL display current elapsed time and total track duration,
updating while the track plays.

#### Scenario: Time display during playback
- **WHEN** the track is playing
- **THEN** the displayed elapsed time updates at least once per second and
  never exceeds the track's total duration

### Requirement: Live channel level meter
Each channel strip SHALL show a level meter reflecting that channel's
current audible signal in near real time.

#### Scenario: Meter reflects an audible channel
- **WHEN** a channel is playing and is audible (not muted, and not
  silenced by another channel's solo)
- **THEN** its level meter visually tracks the signal's amplitude in near
  real time

#### Scenario: Meter reflects a silenced channel
- **WHEN** a channel is muted, or is silenced because another channel is
  soloed
- **THEN** its level meter shows no activity even though the track is
  playing

### Requirement: Channels stay synchronized during playback
All channels SHALL remain audibly synchronized with each other for the
full duration of playback, with no manual re-sync required.

#### Scenario: Extended playback stays in sync
- **WHEN** a track plays continuously from start to end
- **THEN** no channel audibly drifts out of alignment relative to the
  others at any point during playback

### Requirement: Leaving the player stops playback
Navigating away from the player screen SHALL stop all channel playback.

#### Scenario: Navigating back to the library while playing
- **WHEN** the user leaves the player screen while the track is playing
- **THEN** playback of every channel stops immediately
