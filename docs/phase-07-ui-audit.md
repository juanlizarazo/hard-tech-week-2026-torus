# Phase 07 UI audit

Audit date: 2026-10-27, local dev server (`ng serve`, Node 22.20.0) against the live pinned Firestore snapshot (planned day Wed Oct 28). Screenshots: `docs/ui-audit/before/` (branch base `cc3595b`) and `docs/ui-audit/after/`. No deployment was attempted: the documented public URL returns 404 and the active account gets a Hosting 403.

Scoring rule: an unverified or failed check deducts points; design intent earns nothing on its own. Overall is the equal-weight mean of the three rubric lines.

## Judge rubric

| Rubric line | Before | After | Evidence | Deductions |
|---|---:|---:|---|---|
| Creativity | 96% | 98% | The Traffic hero shows every PACE plant streaming into one schematic PACE grid node and on to the simulated airport. It opens at the 6 p.m. rush with coal and gas at 71% and the site ring lit (`after/traffic-1440-first-viewport.jpg`). Plan now ends in a decision: six dispatch orders, Approve "queued for Lattice", and a CSV (`after/plan-1440.jpg`). The one-line-diagram system (nameplate indices F1–F5 / D0–D3 / P1–P5, busbar, mono readouts) replaces generic cards on all four screens. | −2: the stream speed is constant. Share is encoded by width, dash density and brightness, not speed (a speed change would make the dashes jump on every hour step). |
| Clarity of insight | 96% | 98% | The screens are numbered 1 Forecast → 2 Decide → 3 Prove in the nav, step tags, next-stop signs and Start. Start leads with one `$16.84 vs 3.1¢` instrument on a shared scale. On Traffic, one hour cursor drives the map, the load/price/CO2 stack and all three full charts. Its `aria-valuetext` reads "6 p.m. tomorrow: PACE load forecast 5,949 MW, day-ahead price $59/MWh, marginal CO2 1,968 lb/MWh. Fuel mix, 14-day average: coal and gas 71%…". Backtest leads with a 76% capture-rate verdict on one 0–100% scale. Each dispatch order carries a one-line "why" tied to a tariff line, price trough, rush window or reserve. | −2: no non-specialist has watched the new hero yet, and the 14-day-average mix next to a forecast stack needs its caption to be read. |
| Execution | 95% | 95% | 100/100 unit tests, including the new `dispatch-orders.helper.spec.ts` (10 cases with DST 92/96/100). The production build, the Functions build and `git diff --check` are clean. The interaction and state checks are below. | Capped by the public URL (404) and Hosting (403): the brief's "public URL" line is unmet. Also unverified: a true phone smoke test, a human-timed rehearsal, and an infeasible solve reached from the UI (it can't be reached; see below). Execution can't reach 99% until those are done. |
| **Overall** | **96%** | **97%** | Mean of the three lines. | This is not a claim of target: the public-route and phone checks are still open risks. |

## UX checks

| Check | Result | Evidence |
|---|---|---|
| Traffic opens at the rush hour with streams moving | Pass | Playwright: hour `6 p.m.`, range `18`, `plant-map-flow running 0.9s`, rush tag and site ring present. |
| Drag, arrow keys and Play move the map, stack and chart cursors together | Pass | Two ArrowLefts → `4 p.m.`, stack `5,734 MW / $28/MWh / 1,895 lb`, stack cursor `69.57cqw`, all three chart cursors `translateX(778.4px)`. Play advanced 16 → 18 in 1.6 s. A track click went to `12 p.m.`. |
| Flow pause and reduced motion | Pass | The Flow toggle sets `animation-play-state: paused`. Emulated reduced motion gives `animation: none` and `stroke-dasharray: none`, i.e. solid static streams, and hides Play/Flow (`after/traffic-1440-reduced-motion.jpg`). |
| Hero is in the first viewport | Pass | At 1440×900 the busbar node sits at y=744. The map, readout, scrubber and stack start above the fold. |
| Carbon chart still follows the hero group | Pass | Order: hero (F1) → Three clocks: grid stress F2, price F3, carbon F4 → forecast → rank F5. |
| Plant-map loading, error and empty states | Pass (empty unverified) | JSON delayed 8 s → "Placing PACE's power plants…" with a reserved height (`after/traffic-1024-map-loading.jpg`). JSON blocked → "The power-plant map couldn't load. The charts below still work." with three charts still rendered (`after/traffic-1024-map-error.jpg`). Firestore blocked → "We could not read the grid data…". The empty-fuel-mix state can't be reproduced against the live snapshot. |
| Dispatch orders match the plan | Pass | Airport, Schedule 8: six orders (charge 00:45–03:15 Pulse 956 kWh; cap ≤ 1,049 kW in 06:00–09:00 and 18:00–22:00; charge 15:00–17:00; Spin catches one spike up to 143 kW; discharge 17:15–21:15, 1,699 kWh; hold ≥ 1,120 kWh). After a reserve change the cap became 1,137 kW and the hold ≥ 1,420 kWh. Schedule 6 regrouped the orders (charge reason changes to cleaner hours). |
| Approve and changed-since-approval | Pass | "Approved 19:09 MT · queued for Lattice · SIMULATED". After a reserve change: "Plan changed since approval at 19:09 MT", and Approve is enabled again. Approval is tied to the sheet revision, so a dial moved during the debounce can't approve a stale sheet unnoticed. |
| Infeasible reserve disables Approve | Unverified in UI | `PlanHelper.buildRequest` caps the reserve at what the station can hold, so no dial setting is infeasible. A faked infeasible result in dev mode turned the rail red, disabled Approve and kept the last sheet. Separately, the existing infeasible path still shows the zeroed figures rather than the last good plan; that behaviour predates this phase and was left unchanged. |
| CSV | Pass | `detour-plan-2026-10-28.csv`: two `#` lines labelling it SIMULATED (seed 42, no device connected), a header, and 96 data rows. DST days give 92/100 (spec). |
| Rapid input | Pass | 25 alternating arrow presses on the reserve slider settled to `SOLVED`. CSS transitions retarget, nothing queues. |
| Keyboard order and focus | Pass | Tab order: skip link → brand → badge → nav (Start, Step 1–3) → page controls. Material select, toggles and buttons now get the 2 px focus ring (they had none before the fix). The side panel closes on Escape and focus returns to its info button. |
| Contrast | Pass | Ink/paper 14.5:1, muted/paper 5.5:1, muted/white 6.2:1, Pulse sim tag 5.9:1, ink on the rush tag 6.4:1, clear 6.5:1, alert 5.5:1. Focus ring vs paper is 3.0:1 (the non-text minimum). |
| Layout shift (CLS over 12 s, 1440) | Parity or better, but high | Branch vs base `cc3595b`: Start 0.086 / 0.083, Traffic 0.142 / 0.151, Plan 0.497 / 0.492, Backtest 0.321 / 0.296. The large Plan and Backtest values predate this phase: content arrives after the data loads. −1 noted under Execution as a known issue, not fixed here. |
| 375 px path | Pass | No horizontal overflow on any route (the inner-width scan flags only state outlines clipped by the map's own clipPath, the same as before). The dial rack collapses. Orders stack to three lines. Backtest strategies become one `<dl>` card each. |
| No hidden evidence or contract drift | Pass | An independent diff review found no changes in `core/`, `functions/`, Firestore, the solver, tariff, forecast, backtest logic or routes. Every source chip, SIMULATED/seed 42 label, glossary term, how-to-read block, LP text and state from the base is still present. |
| Rush orange only for rush hour | Pass | The logo arrow, slider ripple, value flash and the "changed" and stale notices were moved off `--dt-rush` after review. |

## Demo rehearsal

- **Automated pass:** every app action in `docs/demo-script.md` (Start → Forecast Play/drag/panel → Decide CO2 dial, Hold 1,000 kWh chip, Approve, Schedule 6, LP text → Prove calendar → Start architecture) took **8.3 s** of app time in total. Re-solves settle in about 0.2 s, and no step waits on an animation.
- **Spoken lines:** the script's spoken lines are 416 words, about 2:46 at 150 wpm. With the app time and pointing, the estimate is about 3:00–3:30, inside the 4:30 target.
- **Not done:** a human run with a stopwatch is still unverified and should happen before judging.

## Open risks

1. **Public URL (404) and Hosting (403).** Fixing these needs a separate task with working Firebase access. Execution stays capped until the URL loads and a real phone walk passes.
2. **Infeasible path from the UI.** It can't be reached, and it still shows zeroed figures if it ever happens (pre-existing).
3. **Load-time layout shift on Plan and Backtest (pre-existing).** Reserving space for the ready state would fix it.
