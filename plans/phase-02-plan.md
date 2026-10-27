# Phase 02 — LP engine + Plan ("Three Clocks")

**Goal:** A 48 h, 15-minute LP built as CPLEX LP text in TypeScript and solved in the browser with highs-js, driving a Plan screen that re-solves live as the judge drags the CO2 weight / Wattsmart reserve sliders or flips Schedule 6/8, and shows the generated LP text.
**Brief requirements covered:** §6 must-have 4 (LP builder + highs-js solve) and 7-Plan; §7 demo 1:30–3:30 and the 4:30 LP-text close; §4 SIMULATED badge on every synthetic chart.
**Depends on:** 01 (merged on main).

## Checklist

### Contracts (first, before parallel work)
- [x] `core/models/plan.interfaces.ts` additive: `IPlanMetrics`, `IPlanResult.metrics?`, `IPlanResult.errorMessage?`
- [x] `core/plan/plan-engine.interfaces.ts`: `ILpInput`, `ILpModel`
- [x] `core/plan/placeholder-mef.constants.ts`: hour × season shaped series, labeled PLACEHOLDER until phase 03 (one-line seam in the Plan component)
- [x] Phase 03 merged first: the Plan screen now reads the Siler-Evans fossil-generation MEF from `GridSignalsService`, falling back to the PLACEHOLDER series only if the regression has no points
- [x] `pulse.rampLimitKwPerStep` = 25% of rated power with an updated assumption note, so fast transients go to Spin

### LP engine (`core/plan/`, reused by 04)
- [x] `yarn add --exact highs`; `highs.wasm` copied to `/highs/` by an `angular.json` asset glob (offline solve)
- [x] `LpBuilderHelper.build`: readable LP text with section comments — objective (tariff energy + λ·MEF + demand + facilities + Spin/Pulse degradation), balance, Pulse SOC, Spin SOC (self-discharge), Pulse ramp, demand epigraph (on-peak for Sch 8, all hours for Sch 6) with peak-so-far, facilities epigraph, Wattsmart reserve, terminal SOC, bounds; λ = 0 emits no CO2 terms
- [x] `PlanEngineHelper.buildInput / rushHourWindow / solve` (pure, highs passed in): 48 h intervals, load, masks, prices, MEF, month-to-date peak-so-far, bills, metrics (CO2, traffic avoided, throughput, Wattsmart held)
- [x] `PlanSolverService`: lazy `import('highs')`, `locateFile` → `/highs/`, reload once after a throw
- [x] `plan-engine.helper.spec.ts`: battery off = baseline bill; infinite battery flattens on-peak to the off-peak max; λ = 0 identical curves; SOC within bounds

### Charts (`plan/components/`, inline SVG)
- [x] `chart.helper.ts` scales, paths, local hour ticks
- [x] `dt-load-chart`: load before vs grid after, rush-hour shaded, demand level D
- [x] `dt-dispatch-chart`: Spin vs Pulse stacked, Pulse SOC with reserve floor
- [x] `dt-clock-bands`: Bill / Price (EDAM) / Carbon (PLACEHOLDER MEF) lanes + rush-hour marker
- [x] `dt-lp-text`: collapsible LP text, line count, copy

### Plan screen
- [x] Hook sentence header from Schedule 8 summer rates; SIMULATED badge kept
- [x] Controls: site cards selectable, date (snapshot target date vs July 2026 peak day), Schedule 6/8, CO2 weight, Wattsmart reserve
- [x] Peak-so-far toggle: "none, these 48 h set the peak" (default, bills the 48 h as the month) vs "month to date, no storage" (D floored at the no-storage peak so far)
- [x] Controls stream → snapshot months → debounce → solve → view model; inline "Solved in N ms"; infeasible → alert banner
- [x] Tiles: bill change (demand share), marginal CO2 change, traffic avoided, kWh held for Wattsmart — each with its source
- [x] Asset rows (Torus spec vs assumption) for the selected site

## Done when

- [x] Demo path step works in the running app (tests + build pass; Plan walked locally)
- [x] Committed and PR opened
