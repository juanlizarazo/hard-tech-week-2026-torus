# SCSS & Styling Rules

## SCSS Conventions

- `[SCSS-01]` Use component-scoped styles
- `[SCSS-02]` Do NOT style native HTML elements directly (p, h1, div, etc.) — use classes instead
- `[SCSS-03]` Mobile breakpoint: `max-width: 599.98px`
- `[SCSS-04]` Tablet breakpoint: `max-width: 959.98px`
- `[SCSS-05]` Use flexbox and grid for layouts
- `[SCSS-06]` Radii: `var(--dt-radius-tag)` 2px for tags and labels, `var(--dt-radius-control)` 4px for controls, `var(--dt-radius-frame)` 6px for instrument frames and panels. No pills (`999px`) and no 12px cards
- `[SCSS-08]` Motion uses the tokens `--dt-motion-1` (120 ms, hover/press), `--dt-motion-2` (220 ms, cursors, panels, route change), `--dt-motion-3` (420 ms, data changes), `--dt-motion-4` (700 ms, first reveal) with `--dt-ease`. Animate only opacity, transform, clip-path or SVG stroke properties, never layout. Use CSS transitions so rapid input retargets instead of queuing. The global reduced-motion rule zeroes durations and delays, so the final state must be correct at zero duration
- `[SCSS-09]` Numbers, timestamps, axes, table heads, tariffs and solver output use `var(--dt-mono)` (Overpass Mono). Prose stays in `var(--dt-font)` (Overpass)
- `[SCSS-10]` Rush orange (`--dt-rush`) means rush hour only. Spin is `--dt-spin`, Pulse is `--dt-pulse`, savings and "on" states are `--dt-clear`
- `[SCSS-07]` Tailwind (v3) is available for layout and spacing utilities in templates. Theme colors are mapped in `app/tailwind.config.js` (`text-asphalt`, `bg-clear-bg`, `text-congestion`, `text-rush`, `bg-surface`, `border-line`). Use component SCSS for anything Tailwind makes awkward, such as Material overrides

## CSS Theme Variables

Use CSS variables defined in `styles.scss` for consistent theming. The look is a cool utility control room: paper `--dt-paper` (#eef1f0) with a faint drawing grid, white instruments `--dt-panel`, ink `--dt-ink` (#17202b), rules `--dt-line` / `--dt-line-soft` / `--dt-line-strong`, rush `--dt-rush` (#f28500), clear `--dt-clear` (#0e6b4e), Spin `--dt-spin` (#1495c7), Pulse `--dt-pulse` (#6a4bd6). The legacy `--dt-theme--*` aliases below map onto these.

```scss
var(--dt-theme--primary, #1f2a37)      // Primary brand color (asphalt)
var(--dt-theme--tertiary, #1f9d55)     // Clear road / savings (green)
var(--dt-theme--tertiary-bg, #e6f6ec)  // Clear road background (light green)
var(--dt-theme--accent, #e3a008)       // Congestion building / warning (amber)
var(--dt-theme--error, #d63c3c)        // Rush hour / error (red)
var(--dt-theme--error-dark, #a82828)   // Dark error color
var(--dt-theme--error-bg, #fdecec)     // Rush hour background (light red)
var(--dt-theme--surface, #f7f8fa)      // Card/surface background (light gray)
var(--dt-theme--border, #e2e5ea)       // Border color (gray)
```
