## MODIFIED Requirements

### Requirement: Per-channel volume control
Each channel SHALL have an independent volume control, adjustable from 0%
to 120%, applied live during playback. Values above 100% SHALL boost that
channel's audible level above its original recorded level by increasing
its actual audio gain, not by any purely visual scaling.

#### Scenario: Lowering one channel's volume during playback
- **WHEN** the user lowers a channel's volume control while the track is
  playing
- **THEN** that channel's audible level decreases immediately, other
  channels' levels are unaffected, and playback is not interrupted

#### Scenario: Boosting a channel above 100%
- **WHEN** the user raises a channel's volume control above 100%, up to
  its 120% maximum, while the track is playing
- **THEN** that channel's audible level increases above its original
  recorded level immediately, other channels' levels are unaffected, and
  playback is not interrupted

## ADDED Requirements

### Requirement: Playback resets to start when a track ends
When every channel of the open track finishes playing to its end, the
shared playback position SHALL return to 0 so the user can press play
again without first repositioning it manually.

#### Scenario: Track plays to completion
- **WHEN** the open track plays uninterrupted to its end
- **THEN** playback stops, the shared playback position resets to 0, and
  pressing play again starts playback from the beginning

### Requirement: Resetting a channel's volume to its default
Double-clicking a channel's volume control SHALL reset that channel's
volume to the 80% default it starts at when the track is opened, without
affecting any other channel's volume, mute, or solo state.

#### Scenario: Double-clicking a channel's fader after adjusting it
- **WHEN** the user has changed a channel's volume away from 80% and then
  double-clicks that channel's volume control
- **THEN** that channel's volume returns to 80% immediately, other
  channels are unaffected, and playback is not interrupted if playing

### Requirement: Player screen displays track BPM and tonality
When the open track has a BPM and/or a tonality saved, the player screen
SHALL display those values. When a value is absent, the player screen
SHALL omit it rather than showing a placeholder.

#### Scenario: Opening a track with BPM and tonality set
- **WHEN** the user opens a track that has a BPM and/or a tonality saved
- **THEN** the player screen displays those values

#### Scenario: Opening a track without BPM or tonality
- **WHEN** the user opens a track that has neither BPM nor tonality saved
- **THEN** the player screen shows no placeholder for them — it simply
  omits those values
