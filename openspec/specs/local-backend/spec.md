# local-backend Specification

## Purpose
A local backend service owns all persistence for the hub — track and
channel metadata in a database, imported audio files on disk — and serves
it to the frontend, so data survives as real files/records instead of
living only inside the browser, while staying private to the user's own
machine.

## Requirements

### Requirement: Backend is reachable only locally
The backend SHALL listen only on the local machine's loopback interface,
not on any network-reachable address, by default.

#### Scenario: Frontend on the same machine can reach it
- **WHEN** the frontend, running on the same machine, makes a request to
  the backend
- **THEN** the backend responds normally

#### Scenario: Another machine on the network cannot reach it
- **WHEN** a device other than the host machine attempts to reach the
  backend's address over the local network
- **THEN** the connection is refused or times out, because the backend
  only bound to the loopback interface

### Requirement: Track and channel metadata persists across restarts
Track and channel metadata (track name, BPM, tonality, and the list of
channels) SHALL be stored in a database that survives the backend process
restarting.

#### Scenario: Metadata survives a restart
- **WHEN** the backend process is stopped and started again
- **THEN** every track imported before the restart still appears with its
  stored metadata intact

### Requirement: Imported audio files persist on disk across restarts
Each imported channel's audio file SHALL be stored on disk and SHALL
remain available after the backend process restarts.

#### Scenario: Audio survives a restart
- **WHEN** the backend process is stopped and started again
- **THEN** every previously imported track's channels can still be played
  back, without the user needing to re-upload the `.zip`

### Requirement: Backend serves channel audio to the player
The backend SHALL expose a way for the frontend to retrieve a channel's
audio content for playback.

#### Scenario: Fetching a channel's audio
- **WHEN** the player requests a channel's audio from the backend
- **THEN** the backend returns that channel's audio content

### Requirement: Frontend reports when the backend is unreachable
The frontend SHALL show a clear message when it cannot reach the backend,
instead of failing silently or hanging indefinitely.

#### Scenario: Backend down while loading the library
- **WHEN** the user opens the app and the backend does not respond
- **THEN** the library screen shows a clear error state explaining that
  the backend isn't reachable, instead of an empty or blank screen
