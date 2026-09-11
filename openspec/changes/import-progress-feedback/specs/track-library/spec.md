## MODIFIED Requirements

### Requirement: Import shows progress feedback
While a `.zip` is being uploaded and then extracted and stored, the UI
SHALL show a progress state that distinguishes the upload phase (with a
real percentage) from the server-side processing phase (indeterminate),
until the track is ready to appear in the library. If either phase fails,
the UI SHALL show a specific, actionable error instead of remaining in a
loading state indefinitely.

#### Scenario: Feedback during import
- **WHEN** a `.zip` upload is being extracted and its channels are being
  stored
- **THEN** the UI displays a loading/progress indicator until the track
  finishes importing and appears in the library

#### Scenario: Upload percentage during the Blob upload phase
- **WHEN** a `.zip` is being uploaded to storage
- **THEN** the UI shows a percentage that increases from 0% to 100% as
  the upload progresses

#### Scenario: Distinct state during server-side processing
- **WHEN** the upload reaches 100% and the backend is extracting and
  storing the channels
- **THEN** the UI shows a visibly different state than the upload
  percentage (not stuck at "100%" or reverting to a generic label),
  making clear the flow has moved to a new step

#### Scenario: Feedback ends when the track is ready
- **WHEN** the import finishes successfully
- **THEN** the progress state clears and the track appears in the
  library

#### Scenario: Server-side processing fails or times out
- **WHEN** the backend fails to process the uploaded `.zip` (including a
  request that times out without a response)
- **THEN** the UI shows a specific error message describing that the
  processing failed, instead of remaining on a loading state
  indefinitely or showing a message that claims the backend is a local
  process
