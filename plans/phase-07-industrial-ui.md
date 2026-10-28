# Phase 07 — Industrial UI, motion polish and the Traffic flow-map hero

**Goal:** make DETOUR look like a distinctive industrial energy console, not a generic dashboard, with one "wow at first sight" moment: a Traffic map where energy visibly flows. Plan gains the missing decision: tomorrow's dispatch orders, approved and handed to Lattice. No regression on any brief or rubric line.

**Brief requirements covered:** §3 all three rubric lines, §4 "knows when the grid is jammed" and labeled simulation, §6 must-have 7 (three screens), §7 demo script.

**Depends on:** 06b merged (`main` at `fec67ed`).

**Baseline:** `docs/pr-e-audit.md`: Creativity 96%, Clarity 96%, Execution 95%. Execution is capped until the public URL works.

**Order of work** (each step lands working before the next starts): shared look → Traffic hero + signal stack → Plan rack/rail + dispatch orders + Approve → numbering → Start → Backtest → audit and screenshots.

## Decisions

- [ ] **Flow picture:** plants → one labeled "PACE grid" node → simulated site. It never shows real wires or plant-to-site arcs, because EIA reports fuel totals, not plant output (`plant-map.constants.ts:24`). The brief rules out "literal routing maps" (`brief/brief.md:77-78`).
- [ ] **Site end:** grid stream only. Traffic shows no Torus Station; Plan keeps the reveal.
- [ ] **First three seconds:** opens on tomorrow's rush hour with streams already flowing. The hour changes only on drag or Play. There is a pause control, and reduced motion shows a static map.
- [ ] **Look:** cool control room, not a warm palette. The industrial feel comes from one-line-diagram linework, nameplate-style indexed tags and instrument frames. Safety orange is for rush hour only.
- [ ] **Decide:** Plan gets a run sheet plus Approve plus a CSV download. No chat or LLM.
- [ ] **Exceptions:** "No new product features" and "no autoplay loops" are lifted only for the flow-map hero and the dispatch orders.

## Shared look

- [ ] Refine the tokens in `app/src/styles.scss` rather than replacing them: paper ≈ `#eef1f0`, white instruments, ink `#17202b`, rush `#f28500` only, clear `#0e6b4e`, Spin `#1495c7`, Pulse `#6a4bd6`.
- [ ] Use Overpass for prose and add `@fontsource/overpass-mono`, pinned exactly, for numbers, axes, tables, tariffs and solver output.
- [ ] Radii: 2 px tags, 4 px controls, 6 px instrument frames. Use rectangular evidence labels and open ruled sections instead of pills and generic cards.
- [ ] Motion tokens 120 / 220 / 420 / 700 ms with shared easing. Reduced motion jumps straight to the final state, including route transitions and animation delays.
- [ ] Restyle Material controls with DETOUR colours and corners, keeping keyboard, focus, ARIA, slider, select and toggle behaviour.
- [ ] `ChartFrameComponent` gets an optional `index` input that renders a nameplate tag.
- [ ] Restyle `figure`, `source-chip`, `simulated-badge`, `snapshot-badge`, `under-the-hood`, `side-panel`, `alert-banner` and the nav to match.
- [ ] Interruptible CSS route transitions, chart reveals, value feedback and bar/path transitions. Use opacity, transforms, clipping or SVG morphs, never animated layout. Rapid input retargets the motion and never queues it.
- [ ] Update `rules/ui.md` and `rules/scss.md` with the tokens and patterns.

## Traffic: "Where tomorrow's power comes from"

- [ ] Move `dt-plant-map` (`traffic.component.html:148`) to the top of the ready state, before "Three clocks".
- [ ] Add an aligned signal stack directly under the map: load, price and carbon as slim rows on one hour axis.
- [ ] Keep the three full chart frames (with help panels), forecast scoring, rank chart and under-the-hood unchanged in content. Carbon still follows the hero group directly (`docs/pr-e-audit.md:14`).
- [ ] Put the PACE node lon/lat over the Wasatch Front in `plant-map.constants.ts`, next to `sitePin`. Draw it as a one-line busbar node labeled "PACE grid (schematic)".
- [ ] Compute a curved stream path from each plant to the node in `PlantMapHelper`. Group the paths by fuel so CSS animates 6 groups, not 176 elements.
- [ ] Per fuel, set dash density and speed from `hourView.opacityByFuel` and the share rows (14-day EIA average).
- [ ] Draw the site stream from the node to the pin, sized by the simulated airport's hourly draw from `core/sites/site-generator.helper.ts`. If no hourly series is available, fall back to a constant width and say so in the caption.
- [ ] Rush state: coal and gas streams thicken, the rush tag shows, and the site pin gets one emphasis ring that doesn't loop.
- [ ] Animate with CSS `stroke-dashoffset`, retargeted through custom properties. Reuse `onTogglePlay`, `onHourInput` and `onStop`. Add a pause-motion toggle separate from the hour Play. With reduced motion, streams stop and stroke width alone encodes share.
- [ ] Add a caption: "Schematic: shares of PACE generation, not physical wire paths." Note that the mix is a 14-day average day while the stack shows tomorrow.
- [ ] Keep SIMULATED · seed 42, the honesty note, sources, excluded and off-map notes, and how-to-read.
- [ ] Shared hour cursor: lift the hour to Traffic (`hour` input and `hourChange` output on `dt-plant-map`). Add an optional presentation-only `cursorIndex` input to `HourChartComponent`.
- [ ] Keep the range input as the only hour control. Its `aria-valuetext` reads all three clocks plus the fossil share.
- [ ] Layout: at 1440 the map runs full width with the share panel on the right; at 1024 the panel drops under the map; at 375 the map scales, the stack stays legible and the scrubber is thumb-sized.
- [ ] Preserve forecast scoring, uncertainty, the carbon caveat, glossary and help, the rank chart, plant disclosure, sources and the "heuristic, not congestion" warning.

## Plan: "Tomorrow's dispatch orders" and Approve

- [ ] Turn the sticky two-column layout into a control rack plus a dominant results workspace with a persistent solver rail.
- [ ] Animate only accepted solve deltas, load and dispatch geometry, and the reserve floor. Prior results stay visible while solving, and failed or infeasible solves keep the last-successful-plan behaviour.
- [ ] Add a pure helper `plan/dispatch-orders.helper.ts` that groups the latest successful solve's `IPlanInterval[]` (`core/models/plan.interfaces.ts:19`) into 4–7 local-time blocks: charge windows, the Wattsmart reserve hold, the demand cap defended (max on-peak `gridKw` against `loadKw`), and discharge windows with Spin catching short spikes.
- [ ] Each block shows kWh or kW plus a one-line "why" tracing back to a tariff line, price trough, carbon, rush window or reserve constraint.
- [ ] The run sheet lives in the solver rail.
- [ ] **Approve plan** stamps "Approved HH:MM · queued for Lattice" with SIMULATED and "No device is connected; Lattice runs the real-time control and Wattsmart calls override this plan."
- [ ] Any dial, preset, schedule or site change marks the sheet "Plan changed since approval" and brings back Approve. State is component-local only, never persisted.
- [ ] Disable Approve while the latest solve is failed or infeasible, and keep the last approved or last successful sheet visible.
- [ ] **Download schedule (CSV):** 15-minute rows with local time, grid kW, Spin and Pulse charge/discharge kW, Pulse SOC and the reserve floor. Build it with a client-side Blob, no new deps, and label it simulated in the header.
- [ ] No solver, request/result, tariff or domain type changes.

## Numbering and Start

- [ ] Start stays the unnumbered cover. Traffic, Plan and Backtest read **1 Forecast → 2 Decide → 3 Prove** everywhere: `dt-page__step`, nav, `dt-next-stop` signs and Start's "Three stops". Page titles and URLs are unchanged.
- [ ] Start: `$16.84 vs 3.1¢` as one dominant comparison instrument, the three clocks right after it, the demo path drawn as a rectangular process schematic, and architecture still easy to find.

## Backtest

- [ ] Lead with the verdict and capture rate, then strengthen the strategy comparison.
- [ ] Pair the calendar selection with the selected day's evidence.
- [ ] Animate the component and cycle bars.
- [ ] At 375 px, render the strategies as stacked semantic rows without losing the desktop comparison.

## Demo script

- [ ] Traffic beat: add a new opening line about the map. Keep "not a literal road map / schematic". Stay inside 0:30–1:20.
- [ ] Plan beat: add about 10 s: "This is what DETOUR hands Lattice for tomorrow. Approve, and Lattice runs it; Wattsmart calls still override it."
- [ ] Total stays at or under 4:30. Rehearse with a timer and record the actual duration.

## Out of scope

- Dark mode, transmission-line data, a Torus Station on Traffic, real-time claims, new data files.
- Chat/LLM input, real device or Lattice integration, IEEE 2030.5 mocks, persisted approvals.
- No changes to domain types, Firestore, the solver, tariff, forecast or backtest logic, or URLs. New inputs are presentation-only: `ChartFrameComponent.index`, `HourChartComponent.cursorIndex`, and `dt-plant-map` hour in/out.
- **Follow-up risk:** the public URL returns 404 and Hosting returns 403. Execution can't reach 100% until a separate task fixes that. Its PR checks stay unchecked.

## Verification

- [ ] Before any UI change: `yarn install` under Node 22, then baseline screenshots of all four routes at 1440 / 1024 / 375 → `docs/ui-audit/before/`.
- [ ] `yarn --cwd app test --watch=false`, the Angular production build, the Functions build, `git diff --check`.
- [ ] Traffic: opens at the rush start hour with streams flowing; drag, arrow keys and Play move the map and all three stack cursors together; pause and emulated reduced motion work; captions are visible; carbon follows the hero group; nothing is clipped at 375; loading, error and empty states render, tested offline/throttled for the plant-map JSON.
- [ ] Dispatch orders: blocks match the dispatch chart (airport, Schedule 8, Schedule 6, after a reserve change); approve then change a dial and see "changed since approval"; an infeasible reserve disables Approve and keeps the last sheet; the CSV has 96 rows (92 / 100 on DST days) matching the chart; a unit spec covers `dispatch-orders.helper.ts` grouping.
- [ ] Nav, page labels and next-stop signs read Forecast / Decide / Prove.
- [ ] Full walk: Traffic toggles, help and glossary; Plan sliders, presets, Schedule 6/8, an infeasible reserve and rapid input; Backtest selection; LP text; architecture; side panels; keyboard order and focus return; contrast; layout shift; a complete 375 px path.
- [ ] After screenshots → `docs/ui-audit/after/`; write `docs/phase-07-ui-audit.md` with rubric and UX tables citing evidence. Unverified checks deduct points.

## Done when

- [ ] Demo path works in the running app at all three widths
- [ ] `plans/00-general.md` lists Phase 07
- [ ] Committed as `style: sharpen DETOUR as an industrial energy console` (no co-author trailers) and PR opened with `## Changes` / `## Testing`
- [ ] Not merged or deployed without an explicit go-ahead
- [ ] `ng serve` on http://localhost:4200 running and attached to the task for review
