# Phase 09: coherence, honesty and demo readiness

**Goal:** stop screens contradicting each other, fix the months where DETOUR lost money, and make the spoken script hit every brief §7 beat. No new features.
**Depends on:** 08 merged (#26).

## Checklist

- [x] P0-1 Replay seeds `billedLoadPeakKw` and `facilitiesLoadPeakKw` at 0; spec added; `yarn --cwd app precompute:year` regenerated
- [x] P0-1 Fallback copy "Storage cost money this month" with cause on the gauge and capture tile
- [x] P0-2 Start labels the hook "summer peak"; the season bridge says the winter rate and "still about 550 kWh per kW"
- [x] P0-3 Traffic section renamed "Three signals for {date}"
- [x] P0-4 Plan "Baseline month (July)" label and Prove-aligned wording
- [x] P0-5 Backtest site change switches the tariff schedule
- [x] P1 `docs/demo-script.md` and `docs/qa.md` updated from the regenerated year data
- [x] P2 internal strings, naming (perfect hindsight, 1 Forecast / 2 Decide / 3 Prove), Lattice glossary term, Reset dials, next stops, label/term button fix, 2 p.m. vs 3 p.m. copy, missing period
- [x] P2 unused `ScreenToolbarComponent` removed, `font-weight: 700` mapped to the loaded 800
- [x] P3 Firestore `persistentLocalCache` for offline replay
- [ ] P2.5 Home launcher and deck.gl map (see PR)
- [ ] P3 Private rehearsal deploy, phone walk, two stopwatch runs (manual, not done in this phase)
- [ ] P2 left for later: live-region collapse on Plan, infeasible solve keeps last plan, Backtest layout-shift reservation, pointer-only D1 to D3 tooltips, chart-frame seed from the selected site

## Findings that changed the plan

After the seed fix the lead number holds: airport, Schedule 8, July is still $11,546 and 76%. Other months drop because DETOUR no longer inherits last month's peak as a charging cap (airport Schedule 6 July fell from $10,225 to $1,291). Three ski-resort Schedule 6 cells and cement July Schedule 6 stay slightly negative (-$41 to -$147); the cement cause (CO2 weight on a flat rate) is a hypothesis not yet replayed with weight 0.
