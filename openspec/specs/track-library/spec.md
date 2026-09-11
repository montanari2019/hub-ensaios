# track-library Specification

## Purpose
Lets a user import a track's channels from a `.zip` file, keeps imported
tracks stored locally in the browser, and lets the user browse and pick
which track to open for rehearsal.

## Requirements

### Requirement: Zip upload creates a track
The user SHALL be able to select or drop a `.zip` file containing audio
files that represent one track's channels. The system SHALL extract it and
present the parsed channels in an editable review — nothing is created yet
at this point. The track and its channels are only actually created once
the user confirms that review.

#### Scenario: Valid zip upload
- **WHEN** the user selects a `.zip` file containing one or more supported
  audio files
- **THEN** the system extracts each supported audio file as a channel and
  opens the review screen with those channels, without yet creating a
  track

#### Scenario: Rejecting a non-zip file
- **WHEN** the user selects a file that is not a `.zip` archive
- **THEN** the system rejects the upload with a clear error message and
  does not open a review or create a track

#### Scenario: Zip with no audio files
- **WHEN** the selected `.zip` contains no recognizable audio files
- **THEN** the system shows an error explaining that no channels were
  found, and does not open a review or create a track

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
Imported track data (each channel's audio file and the track's metadata)
SHALL be persisted locally by the app's own backend — audio files on disk
and metadata in a local database — so it survives the app being restarted,
with all data staying on the user's own machine.

#### Scenario: Track survives a reload
- **WHEN** the frontend and backend are restarted after a track was
  successfully imported
- **THEN** the track still appears in the library and can be opened
  without re-uploading the `.zip`

### Requirement: Library lists imported tracks
The library screen SHALL list every track currently stored, showing at
least the track's name, its channel count, and its import date, ordered
most-recently-imported first. When a track has a BPM and/or a tonality
saved, those SHALL also be shown on its entry.

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

#### Scenario: Viewing a track with BPM and tonality set
- **WHEN** a listed track has a BPM and/or a tonality saved
- **THEN** its entry displays those values alongside the name, channel
  count, and import date

#### Scenario: Viewing a track without BPM or tonality
- **WHEN** a listed track has neither BPM nor tonality saved
- **THEN** its entry shows no placeholder for them — it simply omits those
  values

### Requirement: Selecting a track opens the player
Selecting a track from the library SHALL open the player loaded with that
track's channels.

#### Scenario: Opening a track from the library
- **WHEN** the user selects a track from the library
- **THEN** the system opens the player screen with that track's channels
  loaded and ready to play

### Requirement: Deleting a track removes it from local storage
The user SHALL be able to delete an imported track, which removes both its
database entry and its audio files on disk.

#### Scenario: Deleting a track
- **WHEN** the user confirms deletion of a track
- **THEN** the track no longer appears in the library, its database entry
  is removed, and its audio files are deleted from disk

### Requirement: Import shows progress feedback
While a `.zip` is being extracted and stored, the UI SHALL show a
loading/progress state until the track is ready to appear in the library.

#### Scenario: Feedback during import
- **WHEN** a `.zip` upload is being extracted and its channels are being
  stored
- **THEN** the UI displays a loading/progress indicator until the track
  finishes importing and appears in the library

### Requirement: Import review before saving
After a `.zip` is parsed, the system SHALL present a review step where the
user can edit the track's name and each channel's name before anything is
saved. Confirming the review creates the track with those names; cancelling
discards the parsed import entirely.

#### Scenario: Review shows editable, pre-filled names
- **WHEN** a `.zip` finishes parsing
- **THEN** the review screen shows the track's name (pre-filled from the
  `.zip` filename) and each channel's name (pre-filled from its audio
  filename), all editable, with nothing saved yet

#### Scenario: Confirming saves the track with edited names
- **WHEN** the user edits the track name and/or one or more channel names
  and then confirms
- **THEN** the track is created using the edited names, not the original
  filenames

#### Scenario: Cancelling discards the import
- **WHEN** the user cancels the review instead of confirming
- **THEN** no track is created, and no audio files from that parse are
  left on disk

### Requirement: Optional BPM and tonality at import
The import review SHALL let the user optionally enter a BPM and a
tonality for the track, saved with it when provided.

#### Scenario: Entering BPM and tonality
- **WHEN** the user fills in a BPM and/or a tonality during review and
  confirms
- **THEN** the saved track includes those values

#### Scenario: Leaving BPM and tonality blank
- **WHEN** the user leaves BPM and tonality blank and confirms
- **THEN** the track is saved successfully without them — both fields are
  optional

#### Scenario: Rejecting a non-numeric BPM
- **WHEN** the user enters a non-numeric value into the BPM field
- **THEN** the field does not accept it, so a saved track's BPM is always
  either a valid number or absent
