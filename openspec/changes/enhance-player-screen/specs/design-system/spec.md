## ADDED Requirements

### Requirement: Touch-friendly controls on the player screen
On narrow viewports (below the app's small-screen breakpoint), the player
screen's interactive controls — each channel's fader, mute button, and
solo button — SHALL present a touch target of at least 44x44 CSS pixels,
so they remain comfortably operable by touch without shrinking below a
usable size.

#### Scenario: Operating channel controls on a narrow viewport
- **WHEN** the player screen is viewed on a viewport narrower than the
  small-screen breakpoint
- **THEN** each channel's fader, mute button, and solo button present a
  touch target of at least 44x44 CSS pixels
