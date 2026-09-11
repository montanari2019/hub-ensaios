# design-system Specification

## Purpose
Provides the shared visual language — centralized theme tokens, the app
shell/layout, and reusable UI primitives — so every screen in the hub looks
and behaves consistently and matches the reference visual identity.

## Requirements

### Requirement: Centralized theme tokens
Colors, fonts, spacing, and border radii SHALL be defined as CSS custom
properties in one global location, and every component SHALL consume them
by reference instead of hardcoded values.

#### Scenario: Inspecting a component stylesheet
- **WHEN** any component's stylesheet is inspected
- **THEN** it references visual values only via `var(--token-name)`, with no
  hardcoded hex colors, literal pixel font sizes, or literal border-radius
  values that duplicate the theme scale

#### Scenario: Changing a token updates every consumer
- **WHEN** a theme token's value is changed in the central token file
- **THEN** every component using that token reflects the new value without
  requiring per-component edits

### Requirement: CSS Modules styling with no inline styles
Every component SHALL be styled through a co-located CSS Module file.
Inline `style` attributes SHALL be used only to pass a dynamically computed
value as a CSS custom property consumed by a rule in that component's CSS
Module — never to set visual properties directly inline.

#### Scenario: Static component styling
- **WHEN** a component has no runtime-computed visual values
- **THEN** it carries no `style` attribute at all; all appearance comes from
  its CSS Module classes

#### Scenario: Dynamic value such as a fader position
- **WHEN** a component needs a runtime-computed visual value (for example, a
  channel fader's vertical position or a level meter's height)
- **THEN** that value is passed to the DOM element as a CSS custom property
  and a rule in the component's CSS Module reads it via `var(...)`, rather
  than the component setting the CSS property directly inline

### Requirement: Dark glass-morphism visual identity
The app shell SHALL render with the reference's dark, glass-morphism
identity: near-black background, a floating translucent pill-shaped primary
navigation bar, and glass-panel cards for grouped content.

#### Scenario: Loading any screen
- **WHEN** the app loads any screen
- **THEN** the page background uses the theme's dark background token, and
  primary navigation renders as a centered, blurred, translucent floating
  pill bar fixed near the top of the viewport

#### Scenario: Grouped content uses glass cards
- **WHEN** the UI groups related content (a track entry, a channel strip, a
  settings panel)
- **THEN** that group renders inside a glass-panel card using the theme's
  border, background, and radius tokens rather than a plain box

### Requirement: Responsive layout
The layout SHALL adapt for narrower viewports so no screen requires
horizontal scrolling to read primary content, mirroring the reference's
responsive behavior.

#### Scenario: Narrow viewport navigation
- **WHEN** viewport width is below the app's small-screen breakpoint
- **THEN** the primary navigation's link list collapses or hides per the
  reference's pattern, and remaining navigation stays usable

#### Scenario: Narrow viewport content stacking
- **WHEN** viewport width is below the small-screen breakpoint
- **THEN** multi-column grids (track library grid, channel strip rows)
  reflow to fit the viewport without causing page-level horizontal overflow

### Requirement: Shared UI primitives
A small set of reusable UI primitives — a pill Button (primary and ghost
variants), a pill Badge (color-coded by category), and a glass-panel Card —
SHALL exist and be used by every screen instead of one-off styled elements.

#### Scenario: Primary action button anywhere in the app
- **WHEN** a primary call-to-action button appears on any screen (e.g.,
  "Importar track", "Tocar")
- **THEN** it uses the shared Button component's primary variant: pill
  shape, solid fill, styled from theme tokens

#### Scenario: Secondary action button anywhere in the app
- **WHEN** a secondary action button appears on any screen
- **THEN** it uses the shared Button component's ghost variant: pill shape,
  translucent glass background, bordered, styled from theme tokens

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
