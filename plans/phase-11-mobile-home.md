# Phase 11 — Mobile home

**Goal:** On a phone, Start looks as deliberate as on desktop: the same 3D grid scene, near the top, a big DETOUR plate and a balanced layout.
**Brief requirements covered:** `[HACK-16]` mobile must not look broken (judges open links on phones), `[HACK-18]` README live link.
**Depends on:** Phase 10 (home launcher).

## Findings (390×844, before)

- Under 768px `GridSceneHelper.canUseDeck()` returns false, so the hero falls back to the flat SVG plant map
- `.home__scene` gets `order: 3`, so that different map lands under the tiles at the bottom
- The DETOUR plate is 21px and the tagline is hidden under 600px
- `$16.84 vs 3.1¢` stacks into one long column, pushing the tiles off the first screen

## Checklist

- [x] `canUseDeck(allowNarrow)`: only the home hero (`fill`) opts into the deck on narrow screens; Forecast keeps its SVG map on phones
- [x] Grid scene: under 768px the home fit drops the 30% left padding and uses `HOME_NARROW_ZOOM_TRIM` so all of Utah fits
- [x] Hide the legend card in the home band on phones
- [x] Mobile order: brand → map band (fade to paper top and bottom) → figures → hook → tiles → How DETOUR works
- [x] Plate at `--dt-text-42` with a 26px mark, tagline back on one line under it
- [x] Figures side by side with "vs" between them under 600px
- [x] Full-width How DETOUR works button
- [x] Desktop (≥768px) unchanged
- [x] README live link

## Done when

- [x] Screenshots at 375, 390 and 1440 checked (`docs/ui-audit/mobile-home/`)
- [x] Committed and PR opened
