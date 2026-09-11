## ADDED Requirements

### Requirement: Selecting a track gives immediate navigation feedback
When the user selects a track from the library (click or keyboard
activation), the UI SHALL immediately show visual feedback on that track's
card that a navigation to the player is starting, instead of the card
appearing unresponsive until the player screen has taken over.

#### Scenario: Clicking a card shows immediate feedback
- **WHEN** the user clicks a track card
- **THEN** that card immediately shows a visual indication that it was
  selected and a navigation is starting, before the player screen appears

#### Scenario: Keyboard activation shows the same feedback
- **WHEN** the user activates a focused track card with Enter or Space
- **THEN** the same immediate visual feedback appears as for a mouse click

#### Scenario: Other cards don't trigger a second navigation mid-transition
- **WHEN** a navigation to a track's player is already starting
- **THEN** clicking another card (or the same one again) during that brief
  transition does not start a second, conflicting navigation
