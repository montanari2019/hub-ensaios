## ADDED Requirements

### Requirement: Shared form input styling
Text and number input fields SHALL be styled through the same shared,
token-driven visual language as the rest of the UI (dark glass background,
theme border/radius/font tokens), via a co-located CSS Module, instead of
appearing as unstyled native browser inputs.

#### Scenario: A text or number field appears anywhere in the app
- **WHEN** a text or number input field is rendered on any screen (for
  example, the track name or BPM field in the import review)
- **THEN** it is styled from the shared theme tokens (background, border,
  radius, typography) consistent with every other input in the app, not
  the browser's default unstyled appearance
