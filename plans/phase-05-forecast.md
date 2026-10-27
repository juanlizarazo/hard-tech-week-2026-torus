# Phase 05 — Our own PACE day-ahead forecast vs PACE's DF

**Goal:** A transparent ridge regression forecast of PACE demand, trained only on weather that was actually forecast the day before, scored honestly against PACE's own day-ahead forecast and a seasonal naive on phase 03's window, and shown on the Traffic Report with a P10–P90 band.
**Brief requirements covered:** Nice-to-have ("ridge net-load forecast with P10/P90 vs PACE's forecast and seasonal naive"); execution ("forecast error vs PACE's own day-ahead forecast").
**Depends on:** 01 (snapshot, contracts), 03 (grid signals, `ForecastScoreHelper`, Traffic Report). Does not touch Plan or Backtest.

## Decisions

- Out-of-sample protocol: monthly blocked CV over the full phase 03 window. Each local month is predicted by a model fit on every other month, minus a 7-day buffer after the held-out month so the 48 h / 168 h lags can't leak its actuals.
- Target: demand (same quantity as PACE's DF). Net load on the chart stays phase 03's estimate. GHI is the behind-the-meter PV proxy.
- Lags: same hour 2 days earlier (48 h) and last week (168 h), both known before PACE's DF publishes. Seasonal naive = same hour last week.
- Weather: Open-Meteo Previous Runs `temperature_2m_previous_day1` + `shortwave_radiation_previous_day1` at Salt Lake City, Ogden, Provo, weighted by 2020 Census county population (Salt Lake 1,185,238; Davis + Weber 624,902; Utah 659,399), labeled as an assumption.
- Weather patches the existing frozen snapshot (`--weather-only` ingest flag) instead of re-freezing, so EIA/OASIS data and phase 03/04 numbers stay byte-identical.

## Checklist

### Plan files
- [x] `plans/phase-05-forecast.md` (this file)
- [x] `plans/00-general.md`: status table, phase 05 row, scope bullet, data snapshot row

### Ingest (`functions/src/dev/`)
- [x] Verify Open-Meteo Previous Runs API returns non-null day1 temperature + GHI
- [x] `ingest-snapshot.constants.ts`: Open-Meteo URL, chunk/delay/retry, model, variable names, `weatherPoints`
- [x] `ingest-fetch.service.ts`: `fetchOpenMeteoRows`
- [x] `ingest-snapshot.helper.ts`: `buildWeatherHours`
- [x] `ingest-snapshot.interfaces.ts`: `IOpenMeteoResponse`, `IIngestResult.weatherMonths`
- [x] `ingest-store.service.ts`: `readCurrentManifest`, `writeWeatherToSnapshot`
- [x] `ingest-snapshot.ts`: full run includes weather; `--weather-only` patches current snapshot
- [x] Shared types (additive) in `functions/lib/firestore/index.d.ts` and `app/src/types/firestore.d.ts`: `IWeatherPoint`, `IWeatherHour`, `IWeatherMonth`, manifest `weatherMonths?`/`weatherPulledAt?`/`weatherRange?`/`weatherPoints?`/`weatherModel?`
- [x] Dry run, then real run against Firestore

### Model (`app/src/app/core/forecast/`)
- [x] `ridge.helper.ts`: Gram/solve (Cholesky, intercept unpenalized), predict
- [x] `load-forecast.helper.ts`: weighted weather, features, blocked CV, residual quantiles, target-day forecast, seasonal naive, compare
- [x] `load-forecast.constants.ts` / `load-forecast.interfaces.ts`
- [x] `core/models/forecast.interfaces.ts` additions: `ILoadForecastHour`, `IForecastComparisonRow`, `ILoadForecast`
- [x] `core/signals/forecast-score.helper.ts`: `scorePoints`
- [x] `core/services/snapshot.service.ts`: `getWeatherMonth`
- [x] `core/services/load-forecast.service.ts`
- [x] One spec, `core/forecast/forecast.helper.spec.ts` ([HACK-10]): ridge recovers known coefficients, P10 ≤ P50 ≤ P90, `scorePoints` hand-checked

### Traffic Report (`app/src/app/traffic/`)
- [x] `traffic.helper.ts`: our forecast series + P10–P90 band on the load chart
- [x] `traffic-view-state.helper.ts`: forecast as a separate view state (loading/empty/error/ready)
- [x] `traffic.component.ts/.html/.scss`: "Can we beat PACE's own forecast?" card — verdict, score table, coverage line, collapsed method panel
- [x] `traffic.constants.ts`: forecast method steps and limitations
- [x] 375 px: no horizontal scroll

## Done when

- [x] Demo path step works in the running app (`yarn --cwd app start`, `/traffic`)
- [x] Committed and PR opened: https://github.com/juanlizarazo/hard-tech-week-2026-torus/pull/16

## Verified

- **Open-Meteo Previous Runs check:** `https://previous-runs-api.open-meteo.com/v1/forecast` for Salt Lake City (40.7608, -111.8910), `models=best_match`. `2024-10-26` to `2024-10-27` (historical) and `2026-10-27` to `2026-10-28` (the live target window) both return non-null `temperature_2m_previous_day1` and `shortwave_radiation_previous_day1` for every hour. A 3-point request (comma-separated lat/lon) returns a JSON array, one object per point, confirming one request covers all weather points per chunk. `best_match` used (no coverage holes observed).
- **Weather ingest (`--weather-only`):** dry run then real run against snapshot `20261027-0652`, range 2024-10-27 to 2026-10-27 (25 months). 105,264 point-hour values (3 points × temperature + GHI × ~17,544 hours), 0 nulls, 0 `weather-day0` fallback flags — `best_match` covered every hour with `_previous_day1`. Largest month file ~130 KB, well under the 900 KB warning threshold. Manifest patched with `weatherPulledAt`, `weatherRange`, `weatherPoints`, `weatherModel: best_match`, `weatherMonths` entries; pointer untouched, EIA/OASIS data byte-identical.
- **λ sweep (out-of-fold MAPE, blocked CV, full window):** 0.1 → 3.4304%, 1 → 3.4304%, 10 → 3.4298%, 100 → 3.4264%. λ = 100 wins, though the gap across the whole candidate set is under 0.005 points — with n ≈ 17,263 ≫ p = 65 features, OLS is already stable and ridge barely moves the fit. Fixed in `load-forecast.constants.ts`.
- **Three-way score (2024-11-02 to 2026-10-27, 17,263 common hours — PACE DF present and not flagged, ours out-of-fold present, naive present):**

  | Forecast | MAPE | Bias | Low at the daily peak |
  |---|---|---|---|
  | Ours (ridge) | 3.4% | +0.2% | 76% of days |
  | PACE's day-ahead forecast | 4.8% | +3.2% | 43% of days |
  | Seasonal naive (168 h) | 6.0% | +0.3% | 64% of days |

  We beat PACE's own forecast by 1.4 points of MAPE and on bias, but PACE is noticeably better at catching the daily peak (43% low-at-peak vs our 76%) — our overall accuracy gain comes from the other 23 hours of the day, not the spike. Reported honestly on the card. Coverage: actual demand fell inside our P10–P90 band on 80% of scored hours.
- **Traffic Report walkthrough (headless Chrome via Playwright, `yarn --cwd app start`, `/traffic`):** the load chart shows "Our forecast (ridge)" as a fourth line plus a "P10–P90 (ours)" shaded band over the target day only (confirmed via the chart's own accessible summary: "Our forecast (ridge) from 4,902 MW to 5,858 MW"), alongside the existing PACE dashed line and actuals — Plan and Backtest chart series untouched. The "Can we beat PACE's own forecast?" card renders the verdict sentence, the three-row score table with source chips (`simulated`/`eia-930`), the coverage line, and a collapsed "How our forecast is made" panel with the method steps, limitations and λ/feature count. At 375 px, `document.documentElement.scrollWidth === clientWidth === 375` (confirmed, no page-level horizontal scroll); the forecast table scrolls inside its own `.dt-traffic__table-wrap`, same pattern as the existing provenance table. No console or page errors on `/traffic`, `/plan` (still the $16.84 vs 3.1¢ header) or `/backtest`. Empty and error states for the forecast card were verified by code review (the `loading`/`empty`/`error`/`ready` switch in `traffic.component.html`) rather than forced live, since the live snapshot already has weather and forcing a clean Firestore error reproduces phase 03's noted limitation (a blocked client retries offline instead of erroring cleanly).
- **Hover tooltip bug found and fixed (shared `dt-hour-chart`, not phase-05-only code):** scripted hovers kept landing on the chart's last index no matter where the pointer moved. Root cause: `onPointerMove` in `hour-chart.component.ts` called `this._host.nativeElement.querySelector('svg')`, an unscoped selector that matches the first `<svg>` in DOM order — one of the tiny legend-swatch icons (viewBox `0 0 24 12`), not the plot `<svg class="dt-hour-chart__svg">` — whenever a highlight legend item is rendered (true for all three Traffic Report charts, since they all pass a `highlight`). Dividing by that ~12px-tall icon's bounding box sent the ratio far past 1, which clamped to the last point every time. Fixed by scoping the selector to `svg.dt-hour-chart__svg`. Re-verified live: hovering the target-day band now shows the correct hour and the real P10/P50/P90 values (e.g. "Tue 1 p.m. (estimate) … Our forecast (ridge) 5,845 MW … P10–P90 (ours) 5,515 MW to 6,228 MW"), screenshotted. `yarn --cwd app test` (74 passing) and `yarn --cwd app build` re-run clean after the fix.
- **Checks:** `yarn --cwd app test` — 5 files, 74 tests passing (up from 10 pre-phase-05, including the 3 new forecast cases). `yarn --cwd app build` clean. `yarn --cwd functions typecheck:dev` clean. `git diff --stat origin/main -- app/src/app/plan app/src/app/backtest` is empty.
