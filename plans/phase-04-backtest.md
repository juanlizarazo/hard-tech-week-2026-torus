# Phase 04 — July 2026 backtest + Backtest screen

**Goal:** Backtest July 2026 on a simulated site against a no-storage baseline and a naive threshold shaver, and show it on the Backtest screen with the brief's lead sentence. The rolling LP and the perfect-foresight oracle plug in later with one registration each.
**Brief requirements covered:** §6 must-have 5 (month backtest, capture rate) and 7-Backtest; §7 demo 3:30–4:30; §4 SIMULATED badge and a source on every $, kW and CO2 figure.
**Depends on:** 01 (snapshot, tariff, sites, contracts), 03 (marginal CO2 series), 02 (rush-hour rule; the LP strategies themselves are a follow-up).

## Checklist

### Strategy contract (`core/backtest/`)
- [x] `IBacktestInput`, `IBacktestStrategy` (`run` is async and returns one `IPlanInterval` per input interval), `IBacktestStrategyResult`, `IBacktestResult`
- [x] `BacktestStrategyRole`: baseline, heuristic, realistic, oracle
- [x] `backtestSettings` and provenance entries for the naive target, the Wattsmart reserve and the rush-hour rule (all assumptions)
- [x] One registration point: `BacktestService.strategies` (`noStorage`, `naiveShaver`)

### Engine
- [x] `NaiveShaverHelper`: no-storage baseline; naive shaver discharges Spin then Pulse above 80% of the nominal peak, recharges off-peak under the target and under the peak so far, respects SOC, power, Pulse ramp and the reserve
- [x] `BacktestRunnerHelper.buildInput` (tariff energy price, MEF lookup by season and hour, EDAM by hour, rush mask from the Plan rule) and `run` (bills every strategy through `TariffHelper.monthlyBill`)
- [x] `BacktestMetricsHelper`: savings by component, peak interval, equivalent full cycles, Wattsmart held, traffic avoided (kWh, kg CO2, net CO2), capture rate (null until an oracle is registered), calendar days
- [x] Carbon read once in `BacktestService` from `GridSignalsService.marginalEmissions$` (fossil-generation series)

### Screen (`backtest/`)
- [x] `BacktestViewStateHelper` (loading, empty, error, ready) and `BacktestHelper` view model
- [x] Lead sentence with real naive numbers; Z reads "pending LP (phase 02)" until the oracle exists
- [x] `dt-month-calendar`, `dt-component-bars`, Pulse vs Spin cycles with share of cycle life, day drill-down with `dt-hour-chart`, collapsed sources panel
- [x] Site `mat-select` and Schedule 8/6 toggle, SIMULATED badges, a source chip on every tile, mobile safe

### Sanity checks (HACK-10, one spec)
- [x] Naive shaver stays inside power, SOC and ramp limits for 3 sites × 2 schedules
- [x] Month demand and facilities peaks never above baseline
- [x] Component savings sum to total savings; no storage bills like the raw load

## Handoff to phase 02 follow-up

- Add `rollingLp` and `oracle` as one entry each in `BacktestService.strategies`, built on `PlanSolverService` and `PlanEngineHelper` with roles `realistic` and `oracle`.
- The rolling LP must override `request.peakSoFar*` with the peak already achieved with storage and carry SOC forward day to day.
- Capture rate and the lead sentence switch over on their own once the oracle is registered; no screen change needed.

## Verified

Airport, Schedule 8, July 2026, seed 42, real snapshot and phase-03 MEF:

- No storage bill $74,891; naive shaver $68,910; saved $5,980 (demand $4,389, facilities $1,342, energy $250, customer $0), 73% from the demand charge.
- Billed demand 1,952 kW to 1,691 kW. Month peak interval: Jul 2, 6:00 p.m., 1,952 kW.
- Cycles: Pulse 5.3 (0.07% of 7,500), Spin 28.8 (0.12% of 25,000).
- Wattsmart: 800 kWh held through every rush hour.
- Traffic avoided: 14,567 kWh, 13,228 kg CO2 out of the rush band; net month change +3,624 kg CO2 (round-trip losses).
- Schedule 6 on the airport: $5,100 saved, 79% from demand. Ski resort (Schedule 6): the naive shaver does not lower the bill (-$35), shown honestly.
- 375 px viewport: no horizontal scroll.
- `yarn test` 44 passed, `yarn build` clean.

## Done when

- [x] Demo path step works in the running app
- [ ] Committed and PR opened
