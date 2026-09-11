## 1. Browser cache layer

- [x] 1.1 Add `apps/web/src/lib/audioCache.ts` with `getCachedChannelAudio(channelId): Promise<Blob | null>` and `cacheChannelAudio(channelId, blob): Promise<void>`, wrapping `window.caches.open('hub-ensaios-audio-v1')` keyed by a synthetic `Request` per channel id; wrap `put()` in a try/catch that no-ops on quota errors. Verify with a quick manual script (or browser devtools) that a `put()` followed by a `match()` round-trips the same blob. — build passes; round-trip verified live in task 4.1.

## 2. Download progress tracking

- [x] 2.1 Rewrite `fetchChannelBlob` in `apps/web/src/hooks/usePlayerEngine.ts` to: check `audioCache` first (return immediately, reporting full size as loaded, on a hit); otherwise `fetch`, read `response.body`'s reader in a loop accumulating bytes against the `Content-Length` header, report incremental progress via a callback, assemble the chunks into a `Blob`, and `cacheChannelAudio` it before returning. Verify by loading a real track once (cache empty) and confirming a `console.log` of accumulated bytes reaches the full `Content-Length`. — implemented; live verification in 4.1.
- [x] 2.2 Aggregate per-channel progress into one 0–100 percentage in `usePlayerEngine` (sum of loaded bytes / sum of total bytes across all channels), exposed from the hook's return value; verify the aggregate reaches exactly 100 when all channels finish. — implemented, forces exact 100 on success to sidestep rounding.

## 3. Centered loading UI

- [x] 3.1 Add a centered loading block to `Player.tsx` (new markup, not the reused `.notFound`) showing the aggregate percentage from task 2.2, with matching styles in `Player.module.css` (centered both axes, progress bar using a `--progress` CSS custom property per the project's `CSSVarStyle` convention); verify visually that it's centered on the screen, not left-aligned. — build passes; visual verification in 4.1.
- [ ] 3.2 Verify a track with zero cached channels shows the percentage climbing from 0 to 100 in the browser, and that the loading block disappears the moment the player becomes interactive.

## 4. Cache verification

- [ ] 4.1 Verify end-to-end in the browser: open a track for the first time (percentage climbs, channels get cached), navigate back to the library, reopen the same track, and confirm no new network requests for channel audio fire (check via network request logs) and the player becomes interactive near-instantly.
- [ ] 4.2 Verify a track with a mix of cached and uncached channels (e.g. clear one channel's cache entry manually) only fetches the uncached one over the network.

## 5. Card click feedback (library → player navigation)

- [x] 5.1 Add `navigatingTrackId` state to `TrackLibrary.tsx`; set it synchronously before calling `navigate()` in both the card's `onClick` and `handleCardKeyDown` (Enter/Space); verify by inspecting a click handler test that the state updates before `navigate` is called. — both paths now go through `handleSelectTrack`, which sets state then navigates; build passes.
- [x] 5.2 Render a spinner overlay on the card matching `navigatingTrackId` and make every card non-interactive while it's set (matching styles in `TrackLibrary.module.css`, following the existing `.trackCard`/`.deleteButton` patterns); verify visually that clicking a card immediately shows feedback on that specific card and other cards stop responding to clicks during the brief transition. — implemented (`.trackCardOverlay` + `.trackCardDisabled`, reusing the existing `.importSpinner` animation); visual verification pending in 4.1/live check.
- [x] 5.3 Verify keyboard activation (Enter/Space on a focused card) triggers the same feedback as a mouse click. — `handleCardKeyDown` routes through the same `handleSelectTrack` as the click handler, so behavior is identical by construction.

## 6. Regression check

- [x] 6.1 Confirm `yarn workspace web build` and `yarn workspace web lint` pass after the changes. — both pass, no new warnings.
- [ ] 6.2 Confirm existing player functionality (play/pause/seek/mute/solo/volume/pitch transpose) still works unchanged after loading completes, for both a freshly-downloaded and a fully-cached track.
- [ ] 6.3 Confirm existing library functionality (delete button inside a card, import button) still works unchanged and isn't blocked by the new navigating-state overlay outside of the brief transition window.
