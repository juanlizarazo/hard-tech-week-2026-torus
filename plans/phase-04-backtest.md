# Phase 04 — July 2026 backtest + Backtest screen

**Goal:** Backtest July 2026 on a simulated site against a no-storage baseline, a naive threshold shaver, a rolling daily LP and a perfect-foresight oracle, and show it on the Backtest screen with the brief's lead sentence and capture rate.
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
- [x] Pulse SOC never below min + Wattsmart reserve; empty, error and loading states forced through the view-state helper
- [x] Component savings sum to total savings; no storage bills like the raw load

## Phase 02 follow-up: LP strategies

- [x] `LpStrategyHelper.rollingLp` (role `realistic`, label "Rolling day-ahead optimizer"): one LP per local day on that day's inputs only, `peakSoFar*` overridden with the peak already set with storage, Pulse and Spin SOC and the Pulse net power carried into the next day
- [x] `LpStrategyHelper.oracle` (role `oracle`): one LP over the whole month (2,976 intervals), bill only (no CO2 weight, no degradation cost), so it is a true ceiling on bill savings and the capture rate cannot pass 100%
- [x] Both built on `PlanEngineHelper.defaultRequest` and `PlanEngineHelper.solve` through `PlanSolverService`; one registration each in `BacktestService.strategies`
- [x] Additive: `IPlanRequest.initialPulseNetKw?` adds a t = 0 Pulse ramp row so the ramp holds across day boundaries; `ILpSolver` in `backtest.interfaces.ts`; strategy contract unchanged
- [x] Sanity checks: both LPs inside SOC, power, ramp and the Wattsmart reserve; billed demand and bill never above no storage; oracle saves at least as much as the rolling LP (3 sites x 2 schedules)
- Facilities peak can rise above no storage under the LPs on Schedule 8 (ski resort): demand at $16.84/kW outweighs facilities at $5.15/kW, so charging off-peak to shave on-peak is bill-optimal. The check is on the billed demand peak and the total bill, not facilities.
- The lead label is "Rolling day-ahead optimizer" because the screen lowercases the label ("lp").

## Verified

Airport, Schedule 8, July 2026, seed 42, real snapshot and phase-03 MEF:

- Lead sentence: "The rolling day-ahead optimizer saved $13,937 on a simulated 2 MW Schedule 8 site in July 2026. 72% of it came from the demand charge. That is 96% of the perfect-foresight optimum. 800 kWh held for Wattsmart."
- Capture rate 96%. No storage bill $74,891 to $60,953. Billed demand 1,952 kW to 1,354 kW.
- Savings by component (naive / rolling LP / oracle): demand $4,389 / $10,060 / $10,125; facilities $1,342 / $3,036 / $2,970; energy $250 / $841 / $1,437; customer $0.
- Traffic avoided 41,684 kWh, 37,988 kg CO2 out of the rush band; net month change +2,792 kg CO2 (round-trip losses).
- Schedule 6 on the airport: rolling LP $11,019 saved, 78% from demand, capture rate 100% (rounded; oracle saves a few dollars more). Billed demand 1,952 kW to 1,356 kW.
- Month peak interval: Jul 2, 6:00 p.m., 1,952 kW. Solve time in the browser: about 4.5 s for the first run (31 daily LPs + one month LP), 2.5 s for the Schedule 6 toggle.
- Naive shaver (phase 04 numbers, unchanged): $5,980 saved on Schedule 8, $5,100 on Schedule 6.
- `yarn test` 71 passed, `yarn build` clean, no console errors on /backtest.

## Done when

- [x] Demo path step works in the running app
- [x] Committed and PR opened (#13)
- [x] LP strategies registered, capture rate live
