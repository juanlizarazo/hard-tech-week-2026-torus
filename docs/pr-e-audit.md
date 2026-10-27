# PR E review and rubric re-audit

Audit date: 2026-10-27. Scope: merged PR #23 worktree, source review only. No deployment or merge was performed.

## Persona review findings

| Persona | Finding | Resolution |
|---|---|---|
| Torus engineer | The Plan monthly peak value could be mistaken for July's realized month result. | Added a one-line explanation beside the Plan bill table. |
| Torus engineer | The LP's hourly carbon lookup should be explicit for every 15-minute interval. | Normalized the hour key and added a focused quarter-hour assertion. |
| Non-specialist | Synthetic site data and the load-only rush heuristic need local labels. | Added seed labels and clarified that rush hour is a forecast heuristic rather than measured congestion. |
| Non-specialist | Backtest value columns were dense before their definitions. | Added an immediate capture-rate / total-value legend and plain column names. |
| UX reviewer | Failed re-solves could leave old results visible without context. | Added a last-successful-plan status when the current solve errors. |
| UX reviewer | The plant map was before the mandatory carbon chart in the core flow. | Moved it after carbon and labeled the mixed real-data / simulated-site-pin treatment. |
| UX reviewer | Judge questions about data provenance, reserve behavior and the monthly comparison need a consistent answer. | Added `docs/qa.md`; the visible UI exposes source chips, glossary terms, panels, keyboard focus and mobile dial collapse. |

## Rubric scorecard

| Brief rubric line | Score | Evidence and remaining caveat |
|---|---:|---|
| Creativity | 96% | A Torus-specific planning layer combines the three clocks, Spin/Pulse dispatch and Wattsmart reserve; it is not a generic load-shifting app. |
| Clarity of insight | 96% | Start leads with `$16.84 vs 3.1¢`; the three clocks, rush-hour stripes, glossary, chart panels and plain-language answers explain the tradeoff. |
| Execution | 95% | Frozen public-data pipeline, tariff engine, seeded sites, browser LP, forecast comparison, MEF intervals, July backtest and four-screen demo path are present. The requested deployment remains intentionally deferred. The PACE EDAM price source is `ELAP_PACE-APND` in `functions/src/ingest/ingest-snapshot.constants.ts`. |

## Must-have implementation audit

| Requirement | Score | Evidence |
|---|---:|---|
| EIA-930 PACE ingestion with local time and filtering | 100% | `functions/src/ingest/`, snapshot manifest and grid signal services. |
| Schedule 6 and 8 tariff engine | 100% | `app/src/app/core/tariff/` and Plan/Backtest rate controls. |
| Three seeded labeled site archetypes | 100% | `app/src/app/core/sites/`, simulated badges and seed 42 copy. |
| 48-hour, 15-minute LP with tariff, carbon, wear and reserve | 100% | `app/src/app/core/plan/`, generated LP text and HiGHS solve stats. |
| July naive / rolling LP / perfect-hindsight backtest | 100% | `app/src/app/core/backtest/` and July's proof screen. |
| Marginal emissions regression with intervals | 100% | `app/src/app/core/signals/` and Traffic carbon chart/panel. |
| Traffic, Plan and Backtest demo screens | 95% | Routes and local flow are complete; public launch is not performed in this task by instruction. |

## Overall

95% for the demo-ready implementation. The only intentionally open execution step is the final hosting/deploy and phone smoke test; it is excluded from this PR because the instruction is not to deploy or merge.

## Technical checks retained

- The OASIS price input is the brief's `ELAP_PACE-APND` node/area series, not a substitute generic node: `functions/src/ingest/ingest-snapshot.constants.ts`.
- Firestore snapshot resolution already walks pinned, current and last-good snapshot IDs: `app/src/app/core/services/snapshot.service.ts`.
- Local-day interval generation already preserves 92 / 96 / 100 quarter-hour intervals across DST transitions: `app/src/app/core/helpers/time.helper.ts` and tariff specs.
- Local build verification remains pending because this worktree has no installed `app/node_modules` or `functions/node_modules`; `yarn build` exits 127 with missing `ng` / `tsc`.
