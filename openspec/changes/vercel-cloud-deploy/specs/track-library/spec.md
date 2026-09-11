## ADDED Requirements

### Requirement: Imported tracks are stored in the cloud
Imported track data (each channel's audio file and the track's metadata)
SHALL be persisted by the app's own backend in managed cloud services —
audio files in object storage and metadata in a managed database — so it
survives the app being redeployed, and so it is reachable by anyone with
access to the deployed app rather than being confined to one machine.

#### Scenario: Track survives a reload
- **WHEN** the frontend and backend are restarted after a track was
  successfully imported
- **THEN** the track still appears in the library and can be opened
  without re-uploading the `.zip`

#### Scenario: Track is reachable by a different person
- **WHEN** a person other than the one who imported a track opens the
  deployed app
- **THEN** that track appears in their library and its channels can be
  played back

## MODIFIED Requirements

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
- **THEN** no track is created, and none of the parsed channels' audio
  remains in storage

## REMOVED Requirements

### Requirement: Imported tracks are stored locally
**Reason**: Track data must be reachable by anyone using the publicly
deployed app, not confined to the machine that imported it. Replaced by
"Imported tracks are stored in the cloud".
**Migration**: None. This targets a fresh deployment; the existing local
SQLite/disk test data is not carried over (see design.md Non-Goals).
