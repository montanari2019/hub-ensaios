## Purpose
Defines how the hub de ensaios is deployed as a publicly reachable app on
Vercel — the frontend and backend working together over the internet
instead of only on one machine — so anyone with the deployed URL can use
it, not just the person running it locally.

## ADDED Requirements

### Requirement: The deployed app is publicly accessible end-to-end
A person visiting the deployed frontend URL SHALL be able to view the
track library, import a `.zip`, and play back channels, without running
anything locally themselves.

#### Scenario: First-time visitor uses the deployed app
- **WHEN** a person who has never run the project locally opens the
  deployed frontend URL
- **THEN** the track library loads, showing tracks imported by anyone
  using the deployed app

#### Scenario: Import works against the deployed backend
- **WHEN** a person on the deployed frontend imports a `.zip`
- **THEN** the import is parsed, reviewed, and saved by the deployed
  backend, with no local backend involved

### Requirement: Client-side routes work on direct load and refresh
Any URL the frontend router exposes (for example a specific track's player
screen or the import review screen) SHALL load correctly when requested
directly or refreshed, not only when reached by client-side navigation
from the home page.

#### Scenario: Refreshing a track's player page
- **WHEN** a person refreshes the browser while on a specific track's
  player URL
- **THEN** the frontend loads and shows that same track's player, instead
  of a 404 or a blank page

#### Scenario: Opening a deep link directly
- **WHEN** a person opens a track's player URL directly (for example from
  a shared link), without having navigated there from the home page first
- **THEN** the frontend loads and shows that track's player
