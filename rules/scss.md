# SCSS & Styling Rules

## SCSS Conventions

- `[SCSS-01]` Use component-scoped styles
- `[SCSS-02]` Do NOT style native HTML elements directly (p, h1, div, etc.) — use classes instead
- `[SCSS-03]` Mobile breakpoint: `max-width: 599.98px`
- `[SCSS-04]` Tablet breakpoint: `max-width: 959.98px`
- `[SCSS-05]` Use flexbox and grid for layouts
- `[SCSS-06]` Standard border-radius: `12px` for cards, `8px` for smaller elements
- `[SCSS-07]` Tailwind (v3) is available for layout and spacing utilities in templates. Theme colors are mapped in `app/tailwind.config.js` (`text-asphalt`, `bg-clear-bg`, `text-congestion`, `text-rush`, `bg-surface`, `border-line`). Use component SCSS for anything Tailwind makes awkward, such as Material overrides

## CSS Theme Variables

Use CSS variables defined in `styles.scss` for consistent theming. The palette follows the traffic metaphor: asphalt primary, green for clear roads and savings, amber for building congestion, red for rush hour.

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
