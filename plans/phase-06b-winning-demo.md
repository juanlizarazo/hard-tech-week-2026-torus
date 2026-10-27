# Phase 06b — From a 74% audit to a winning demo

**Goal:** close every gap the 06a audit found (clarity 58%, execution 74%, creativity 88%) without adding risk to the demo path. Hosting stays private until the very last step.

**Brief requirements covered:** §3 all three rubric lines, §4 "knows when the grid is jammed", §6 must-haves 4, 5 and 7, §7 demo script (hook, lead sentence, architecture close).

**Delivery:** five PRs, squash-merged. Tier 1 must land, Tier 2 is time-boxed with a fallback, Tier 3 only if time remains.

| Tier | Items |
|---|---|
| 1 — must land | A, B, C1–C2, C4–C6, D1–D5, D7–D9, D12–D15, E, "Next stop" links |
| 2 — time-boxed | C3 forecast + real-time cap (4 h, fallback: relabel), M plant map (4 h, fallback: static map), D10 "Try this" chips (1.5 h) |
| 3 — if time remains | D6 kW vs kWh, D11 query params |

Ownership when run in parallel: C owns `app/src/app/core/`; D owns `app/src/app/{start,traffic,plan,backtest,shared}` templates and copy; M owns `traffic/components/plant-map/`, `functions/src/dev/ingest-plants.ts` and `app/public/data/`.

---

## PR A — Demo blockers

- [ ] A1. `cdk.a11y-visually-hidden()` in `styles.scss`; the four local visually-hidden copies use the global class.
- [ ] A2. `DayRelationHelper` (`tomorrow | today | past`, America/Denver) and `PlanningDayService.day$`; every hard-coded "tomorrow" (nav, route titles, Start, Grid, Plan, glossary) reads from it.
- [ ] A3. Badge: late when `targetDate < today`, or `targetDate == today` after 3:30 p.m. MT; label shows the pull time; "pinned for demo" note.

## PR B — Data correctness (`functions/`)

- [ ] B1. EIA hour-ending → `localHourStart` is one hour earlier; OASIS forecast re-keyed to hour-ending. A `tsx` assert script in `src/dev/`.
- [ ] B2. Read `snapshot:status` `lastRun.message`; fix the rejection; retries 5 × 15 min.
- [ ] B3. `snapshot:promote <id>`, re-ingest, promote.
- [ ] B4. Deploy functions, force-run the scheduler job, `snapshot:status` shows `flipped`.
- [ ] Check: July `fuelMw.SUN` peaks 11:00–14:00 local, ~0 by 21:00.

## PR C — Engine honesty (`app/src/app/core/`)

- [ ] C1. Wattsmart reserve counts Pulse only (LP, plan engine, backtest metrics).
- [ ] C2. Plan default reserve 25% of Pulse; "Held for Wattsmart" is the actual minimum Pulse energy above the floor in rush hour.
- [ ] C3 (Tier 2). Site-load forecast (mean of D−7 and D−14) + replay with a real-time cap. Lead row "DETOUR", secondary "DETOUR with a perfect load forecast". Gate: beats the simple shaver on the airport (Schedule 8), capture 70–90%. Fallback: relabel the row "perfect next-day load forecast".
- [ ] C4. Backtest CO2 leads with the net change; "moved out of rush hour" is secondary.
- [ ] C5. Plan $: peak cut kW, worth $X/month on the demand charge, 48 h energy and CO2 change. No monthly totals on Plan.
- [ ] C6. One fallback rush-hour start; default backtest site = airport.

## PR D — Clarity and UX

- [ ] D1. Start hero "$16.84 vs 3.1¢", size ratio is the insight; season bridge line.
- [ ] D2. Plan header wires `buildHook()` with the selected day's season.
- [ ] D3. Flywheel insight sentence in the Plan answer.
- [ ] D4. July's proof lead = the full §7 sentence.
- [ ] D5. Jargon sweep (MAPE, seasonal naive, naive shaver target, SOC, PLACEHOLDER, term links).
- [ ] D7. Source chips on Traffic charts, backtest secondary figures, Plan "Held for Wattsmart".
- [ ] D8. Tariff link to the current RMP price summary; chart tag "Simulated · seed 42".
- [ ] D9. Slope-chart label relaxation; three-clocks lane label once per lane in ¢/kWh.
- [ ] D10 (Tier 2). "Try this" chips and deltas after a re-solve.
- [ ] D12. `dt-architecture` SVG under the hood on Start; README Mermaid + demo flow + refresh ops.
- [ ] D13. Generated marginal-vs-average sentence on the slope chart.
- [ ] D14. Jam rule in plain words on Start and in the RUSH_HOUR glossary entry.
- [ ] D15. LP stats line: intervals, variables, constraints, solve ms.
- [ ] "Next stop" link at the end of every screen.

## PR M — PACE power-plant map (Tier 2)

- [ ] One-off `ingest-plants.ts` → `app/public/data/pace-plants.json` (EIA operating generator capacity, BA = PACE).
- [ ] Inline SVG map: state outlines, plants sized by √MW and coloured by fuel, Wasatch city labels, the illustrative site pin.
- [ ] Hour scrubber with the rush band; fuel brightness by PACE share at that hour (last 14 days); "What to notice" line.
- [ ] Fallback: static map at the rush-hour start.

## PR E — Last mile

- [ ] Persona reviews and re-audit ≥ 95%.
- [ ] Re-solves, panels, popovers, keyboard focus, Firestore-blocked error state, 375 px pass.
- [ ] Ops: freeze 1:30 p.m. → 3 p.m. refresh → `snapshot:status` flipped → `snapshot:pin` → rehearse.
- [ ] Launch only on the go-ahead: `yarn --cwd app deploy`, `curl -I` 200, README live link, phone smoke test.

## Verification

- [ ] `yarn --cwd app test`, `yarn --cwd app build`, `yarn --cwd functions build` clean.
- [ ] Numbers ledger across Start, Plan and July's proof: no $ figure contradicts another.
- [ ] Screenshots of all four routes at 1440 and 375 px: no inline glossary text, no overlapping slope labels.
- [ ] Walk the demo path on `localhost:4200`.
