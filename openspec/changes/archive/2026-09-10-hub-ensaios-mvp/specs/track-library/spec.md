## Purpose

Lets a user import a track's channels from a `.zip` file, keeps imported
tracks stored locally in the browser, and lets the user browse and pick
which track to open for rehearsal.

## ADDED Requirements

### Requirement: Zip upload creates a track
The user SHALL be able to select or drop a `.zip` file containing audio
files that represent one track's channels, and the system SHALL extract it
into a new track entry with one channel per recognized audio file.

#### Scenario: Valid zip upload
- **WHEN** the user selects a `.zip` file containing one or more supported
  audio files
- **THEN** the system extracts each supported audio file as a channel and
  creates a new track in the library containing those channels

#### Scenario: Rejecting a non-zip file
- **WHEN** the user selects a file that is not a `.zip` archive
- **THEN** the system rejects the upload with a clear error message and
  does not create a track

#### Scenario: Zip with no audio files
- **WHEN** the selected `.zip` contains no recognizable audio files
- **THEN** the system shows an error explaining that no channels were found
  and does not create a track

### Requirement: Non-audio files inside the zip are ignored
Files inside the uploaded `.zip` that are not a supported audio format
SHALL be ignored and SHALL NOT become channels.

#### Scenario: Zip with an extra non-audio file
- **WHEN** a `.zip` contains valid audio files alongside a non-audio file
  (for example, a `.txt` or image file)
- **THEN** the system creates channels only for the audio files and the
  non-audio file is ignored, without failing the import

### Requirement: Channel naming derived from filename
Each extracted channel's display name SHALL be derived from its source
filename with the file extension removed.

#### Scenario: Deriving a channel name
- **WHEN** a `.zip` contains an audio file named `Bateria.wav`
- **THEN** the resulting channel's display name is `Bateria`

### Requirement: Imported tracks are stored locally
Imported track data (channel audio and track metadata) SHALL be persisted
in the browser's local storage so it survives page reloads, with no network
request involved in storing or retrieving it.

#### Scenario: Track survives a reload
- **WHEN** the browser is reloaded after a track has been successfully
  imported
- **THEN** the track still appears in the library and can be opened without
  re-uploading the `.zip`

### Requirement: Library lists imported tracks
The library screen SHALL list every track currently stored locally,
showing at least the track's name, its channel count, and its import date,
ordered most-recently-imported first.

#### Scenario: Viewing the library with tracks
- **WHEN** the user opens the library screen and one or more tracks were
  previously imported
- **THEN** each track is listed with its name, channel count, and import
  date, with the most recently imported track listed first

#### Scenario: Viewing an empty library
- **WHEN** the user opens the library screen and no track has been
  imported yet
- **THEN** the screen shows an empty-state message inviting the user to
  import a `.zip`, instead of an empty list

### Requirement: Selecting a track opens the player
Selecting a track from the library SHALL open the player loaded with that
track's channels.

#### Scenario: Opening a track from the library
- **WHEN** the user selects a track from the library
- **THEN** the system opens the player screen with that track's channels
  loaded and ready to play

### Requirement: Deleting a track removes it from local storage
The user SHALL be able to delete an imported track, which removes both its
library entry and its stored audio data.

#### Scenario: Deleting a track
- **WHEN** the user confirms deletion of a track
- **THEN** the track no longer appears in the library and its audio data is
  removed from local storage

### Requirement: Import shows progress feedback
While a `.zip` is being extracted and stored, the UI SHALL show a
loading/progress state until the track is ready to appear in the library.

#### Scenario: Feedback during import
- **WHEN** a `.zip` upload is being extracted and its channels are being
  stored
- **THEN** the UI displays a loading/progress indicator until the track
  finishes importing and appears in the library
