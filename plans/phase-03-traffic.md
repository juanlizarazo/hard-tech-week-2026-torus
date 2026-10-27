# Phase 03 — Grid signals + Traffic Report

**Goal:** Tomorrow's PACE rush hour with PACE's own forecast, the EDAM price and marginal CO2 with its interval, plus two credibility numbers: a Siler-Evans MEF and PACE's DF scored against actuals.
**Brief requirements covered:** §6 must-have 6 (marginal emissions regression) and 7 (Traffic Report screen); rubric clarity ("marginal vs average rank hours differently") and execution ("forecast error vs PACE's DF").
**Depends on:** 01 (snapshot, contracts). Phase 02 may inject `GridSignalsService.marginalEmissions$`.

## Checklist

### Contracts
- [x] `IEmissionFactor`, `IAverageEmissionsPoint`, `IForecastScore` (additive); `core/signals` constants and interfaces

### Signals math (`core/signals`)
- [x] `EmissionsHelper`: rows, season, OLS with SE, marginal series both ways (24 x 2, 95% CI), average intensity
- [x] `ForecastScoreHelper`: MAPE, bias, peak-hour under-forecast rate
- [x] One spec file: OLS, DST bucketing, seasons, UTC gap, forecast fixture ([HACK-10])

### Charts
- [x] `dt-hour-chart` (series, bands, highlight, crosshair tooltip, table fallback)
- [x] `dt-rank-slope` (marginal vs average rank)

### Data + screen
- [x] `GridSignalsService` (browser compute from all grid months)
- [x] `TrafficHelper` (3-day load window, target hours, rush-hour band, ranking, insights)
- [x] Traffic screen: insight, three clocks, forecast score, slope, "how the carbon number is made", collapsed audit panel
- [x] Loading, empty, error; mobile safe

## Done when

- [x] MEF sane (about 1,000-2,000 lb/MWh); both ranges and DF score recorded below
- [x] Demo path step works in the running app (`yarn --cwd app start`, /traffic)
- [ ] Committed and PR opened (only when asked)

## Verified

- **Fossil-method MEF (Δ coal+gas generation):** 1,872-2,152 lb/MWh across hour x season (winter 1,872-2,148, summer 1,883-2,152), 95% intervals about ±40-90 lb, n = 244 (summer) / 485 (winter) per stratum. Slightly above the 1,000-2,000 sanity range because the fossil mix on the margin is coal-heavy (2,260 vs 970 lb/MWh); the factors were not tweaked.
- **Demand-method MEF (Δ demand):** -1,332 to 1,558 lb/MWh, intervals of several hundred lb. Hour-to-hour demand changes are only loosely coupled to PACE fossil changes (imports, exports, wind and solar absorb them), so the line is noisy and sometimes negative. Shown as a cross-check; the gap to the fossil line is the import band.
- **Average vs marginal:** average intensity is lowest midday (about 770 lb/MWh at 3 p.m. in winter, solar-diluted) while the marginal factor stays near 2,000, so the cleanest hours by average rank among the dirtiest by marginal.
- **PACE DF score (2024-10-26 to 2026-10-27, 17,431 hours, 726 full days):** MAPE 4.8%, bias +3.2% (over-forecasts on average), low at the daily peak on 43.5% of days, mean miss at the peak 57 MW over.
- **Target day 2026-10-27 rush hour:** 5-9 a.m. (carbon, price and net-load estimate overlap there).
- **Checks:** `yarn --cwd app test` 10 passing (6 signals, 4 tariff); `yarn --cwd app build` clean; no horizontal scroll at 375px; hover tooltips and the audit panel verified in headless Chrome.
