## Why

Opening a track today shows only the text "Carregando track…" left-aligned in the corner of the screen, with no percentage — the same "frozen, no feedback" problem already fixed for the import flow, but on the player screen instead. On top of that, every single time a track is opened — even the same track opened again a minute later — every channel's full audio is re-downloaded from scratch, because each `GET /tracks/:id` call mints a brand-new signed Blob URL (different query string every time), so the browser's native HTTP cache never hits.

## What Changes

- Loading the player (fetching track details + downloading + decoding every channel's audio) shows a centered, full-screen loading state with a real 0–100% percentage aggregating download progress across all channels, replacing the left-aligned static text.
- Channel audio is cached in the browser (Cache Storage API, keyed by channel id — not by the ever-changing signed URL) after first download, so reopening a track whose channels are already cached skips the network fetch entirely and loads near-instantly.
- Clicking (or pressing Enter/Space on) a track card in the library gives immediate visual feedback that the click registered and a navigation is in progress — today the card gives no reaction at all between the click and the player screen taking over.
- **BREAKING**: none — this only changes what's shown while loading/navigating and adds a transparent cache layer; the player's behavior once loaded is unchanged.

## Capabilities

### Modified Capabilities
- `channel-player`: adds requirements for a real-progress loading state while a track's audio loads, and for cached channel audio to be reused across track opens instead of re-downloaded every time.
- `track-library`: adds a requirement that selecting a track from the library gives immediate visual feedback that a navigation is starting, instead of the card appearing unresponsive until the player screen mounts.

## Impact

- `apps/web/src/hooks/usePlayerEngine.ts`: `fetchChannelBlob` gains a chunked-read progress tracker and a cache-first lookup; the hook exposes an aggregate loading percentage.
- `apps/web/src/lib/`: new `audioCache.ts` module wrapping `window.caches` (get/put by channel id).
- `apps/web/src/screens/Player/Player.tsx` + `Player.module.css`: new centered loading component replacing the reused `.notFound` text state.
- `apps/web/src/screens/TrackLibrary/TrackLibrary.tsx` + `TrackLibrary.module.css`: card click/keydown handlers gain an immediate "navigating" visual state before/while `navigate()` transitions to the player route.
- No backend changes — this is entirely a browser-side concern (the signed-URL-per-request behavior on the API side is correct as-is and unrelated to this change).
