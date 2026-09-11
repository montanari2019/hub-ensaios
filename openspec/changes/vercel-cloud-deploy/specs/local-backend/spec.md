## ADDED Requirements

### Requirement: Backend is publicly reachable
The backend SHALL be reachable over the public internet via HTTPS, so people
other than the one who imported a track can open the app and listen to it.

#### Scenario: A different person can reach it
- **WHEN** a person other than the one running the deployment makes a
  request to the backend's public URL
- **THEN** the backend responds normally

#### Scenario: Backend is served over HTTPS
- **WHEN** any client makes a request to the backend's public URL
- **THEN** the connection is encrypted (HTTPS), not plain HTTP

### Requirement: Imported audio files persist in managed storage
Each imported channel's audio file SHALL be stored in managed object
storage reachable over the network, and SHALL remain available after the
backend process restarts or is redeployed.

#### Scenario: Audio survives a restart
- **WHEN** the backend process is stopped and started again
- **THEN** every previously imported track's channels can still be played
  back, without the user needing to re-upload the `.zip`

#### Scenario: Audio survives a redeploy
- **WHEN** a new deployment of the backend replaces the running one
- **THEN** every previously imported track's channels can still be played
  back, because the audio files live in storage outside the deployed
  instance itself

### Requirement: Local development runs against the same database engine as production
Running the backend locally for development SHALL use the same database
engine as the deployed backend (Postgres), started via a Docker Compose
service, instead of a different local-only engine.

#### Scenario: Starting local Postgres for development
- **WHEN** a developer runs the project's Docker Compose service for the
  database
- **THEN** a Postgres instance starts locally and the backend can connect
  to it using the same connection mechanism it uses against the deployed
  database

#### Scenario: Migrations run the same way locally and in production
- **WHEN** a developer runs the project's migration command against the
  local Docker Compose Postgres instance
- **THEN** the same migration files that run against the production
  database apply successfully, with no SQLite-specific behavior

## MODIFIED Requirements

### Requirement: Track and channel metadata persists across restarts
Track and channel metadata (track name, BPM, tonality, and the list of
channels) SHALL be stored in a managed, network-reachable database that
survives the backend process restarting or being redeployed.

#### Scenario: Metadata survives a restart
- **WHEN** the backend process is stopped and started again
- **THEN** every track imported before the restart still appears with its
  stored metadata intact

#### Scenario: Metadata survives a redeploy
- **WHEN** a new deployment of the backend replaces the running one
- **THEN** every track imported before the redeploy still appears with its
  stored metadata intact, because the database lives outside the deployed
  instance itself

## REMOVED Requirements

### Requirement: Backend is reachable only locally
**Reason**: The goal of this change is for people other than the one
running the deployment to access the app, which requires the backend to be
publicly reachable. Replaced by "Backend is publicly reachable".
**Migration**: None for end users. Operators who want to restrict access
should use Vercel's deployment protection features rather than relying on
loopback binding, since the backend no longer runs as a single
long-lived local process with a bindable network interface.

### Requirement: Imported audio files persist on disk across restarts
**Reason**: Audio files no longer live on local disk — they move to
managed object storage (Vercel Blob) so they stay reachable from a
publicly deployed backend, not just the machine that imported them.
Replaced by "Imported audio files persist in managed storage".
**Migration**: None. This targets a fresh deployment; the local test data
in the existing SQLite/disk setup is not carried over (see design.md
Non-Goals).
