## ADDED Requirements

### Requirement: Player shows centered loading progress while audio loads
While a track's details are being fetched and its channels' audio is being
downloaded and decoded, the player screen SHALL show a centered,
full-screen loading state with a percentage that increases from 0% to
100% as the channels' audio downloads, instead of a static message with
no indication of progress.

#### Scenario: Opening a track shows increasing progress
- **WHEN** the user opens a track whose channels are not yet cached in
  the browser
- **THEN** the player screen shows a centered loading state whose
  percentage increases over time as the channels' audio downloads,
  reaching 100% before the player becomes interactive

#### Scenario: Loading state clears once ready
- **WHEN** every channel has finished downloading and decoding
- **THEN** the loading state is replaced by the interactive player

### Requirement: Previously loaded channel audio is cached in the browser
Once a channel's audio has been downloaded in the browser, it SHALL be
cached so that reopening the same track does not re-download that
channel's audio over the network again.

#### Scenario: Reopening a track uses cached audio
- **WHEN** the user opens a track whose channels were already downloaded
  earlier in the same browser
- **THEN** the player loads using the cached audio without issuing a new
  network request for those channels' content

#### Scenario: Cache survives a signed URL changing
- **WHEN** the track is opened again and the backend issues a new signed
  URL for a channel (as it does on every request)
- **THEN** the cached audio for that channel is still recognized and
  reused, because it is keyed by the channel's identity, not by the URL

#### Scenario: A not-yet-cached channel is still fetched and then cached
- **WHEN** a track has a mix of cached and never-before-downloaded
  channels
- **THEN** only the uncached channels are fetched over the network, and
  they are added to the cache once downloaded so the next open of that
  track uses the cache for them too

### Requirement: A stalled channel download fails with a clear error
If a channel's audio download does not complete within a bounded time,
loading the track SHALL fail with a specific, actionable error message
instead of leaving the loading percentage frozen indefinitely with no
further feedback.

#### Scenario: One channel's download stalls
- **WHEN** one channel's audio download does not complete within the
  timeout, while other channels may have already finished
- **THEN** loading the track fails and the player shows a specific error
  message indicating the download didn't complete, instead of remaining
  on the loading percentage forever

#### Scenario: A channel fetch fails outright
- **WHEN** a channel's audio request fails (network error, non-2xx
  response)
- **THEN** loading the track fails the same way as a stalled download —
  with a specific error, not a silent hang
