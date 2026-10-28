# Phase 08 — "Year to date" proof + pre-judging polish

**Goal:** answer "did you cherry-pick July?" on screen. Prove gets a year ledger that is both the month picker and a year-to-date summary, opening on July so the demo script and the $13,937 lead sentence stay as they are.
**Brief requirements covered:** execution (honest benchmark across every month, not one), clarity (summer rates explain the tall bars), demo 3:30–4:30.
**Depends on:** 07 merged (#25).

Decisions (user, 2026-10-27): precompute the year summary + replay the selected month live · October = month to date · default July. No deploy in this phase.

## Context

The engine already handles any month: grid data exists Jan–Oct 2026, tariff seasons and the seeded site generator take any date, and EDAM prices don't feed the backtest.

## Design: the year ledger (P0)

```
P0  Year to date · Jan–Oct 26 · $X saved · Y% of perfect foresight         SIMULATED · seed 42
 ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐
 │   │   │   │   │   │ █ │▐█▌│ █ │ █ │   │   ← bar = DETOUR $ saved (vs no storage)
 │ ▂ │ ▂ │ ▂ │ ▁ │ ▁ │ █ │███│ █ │ █ │ ▂ │   tick on the bar = capture rate
 ├───┴───┴───┴───┴───┼───┴───┴───┴───┼───┤
 │ Jan Feb Mar Apr May│Jun Jul Aug Sep│Oct│   Jul framed in ink = selected
 └────────────────────┴─summer rates──┴to date
```

- **Encoding:** bar height is DETOUR savings in $. A thin tick on the bar is capture rate. A ruled bracket under Jun–Sep reads "Summer rates" (from the tariff `summerMonths`). October gets a "to date" bracket and a hatched bar end.
- **Colour:** bars use `--dt-clear`. The selected month gets an ink frame (`--dt-radius-frame`). No rush orange.
- **Type:** month names and values in `--dt-mono`. Caption is one sentence-case line, no caps eyebrow.
- **Interaction:** `role="radiogroup"`, one `role="radio"` per month, arrow keys plus Home/End, `aria-checked`, `aria-label` like "July 2026, $13,937 saved, 96% capture". Click updates verdict and figures instantly from the precomputed summary; calendar and P1–P5 replay live. Motion only on selection: frame slides with `transform`, 220 ms; reduced motion jumps.
- **375 px:** ten ~32 px columns in 343 px. Labels J F M A M J J A S O, full month in `aria-label`. No horizontal scroll.
- **Placement:** under the page head, above the verdict. Site and Rate plan controls stay. The ledger reflects the current site and schedule.

## Checklist

### Data and engine
- [x] Spike the precompute script first (≤30 min). Fallback: env-gated Vitest spec writing the same JSON.
- [x] Runner: `month` argument everywhere instead of `backtestSettings.MONTH` (`backtest.service.ts` `sourcesFor(month)`, `run()` passes `month` to `buildInput`).
- [x] Month-to-date: optional `throughDate` on `buildInput`, trimming intervals to days ≤ `throughDate` (October = last complete local day before the manifest pull date).
- [x] Available months from `manifest.gridMonths`, 2026 only, ≤ pull month.
- [x] `app/scripts/precompute-year.ts` (`npx tsx`): pure core helpers + node `highs` solver, same snapshot, 10 months × 3 sites × 2 schedules → `app/public/data/backtest-year.json` `{ snapshotId, throughDate, rows: [{ month, siteId, scheduleId, savedUsd, captureRate, demandShare, peakKw, wattsmartKwh }] }`.
- [x] `BacktestYearService` loads the JSON; on `snapshotId` mismatch the ledger says "Year summary from snapshot {id}".
- [x] Yarn script `precompute:year` + re-freeze checklist step in `plans/00-general.md`.

### Backtest screen
- [x] `components/year-ledger/` (inputs `months`, `selected`, output `monthSelected`), ChartFrame `index="P0"`.
- [x] `_month$` BehaviorSubject('2026-07') + `?month=` query param read/write; month change resets `_selectedDate$`.
- [x] `debounceTime(200)` before replay + per-key result cache (`month|site|schedule`).
- [x] Keep last view model visible and dimmed while replaying; slim "Replaying {Month}…" status line instead of the full-page spinner.
- [x] Every "July" → `model.monthLabel` (template, `backtest.helper.ts`, `backtest.constants.ts`, `core/backtest/backtest.constants.ts`, `glossary.constants.ts`). H1 "Would it have paid off in {July}?"; October "…in October so far?".
- [x] October label "Oct 1–26 · month to date"; verdict notes the demand charge is the partial-month peak so far.

### Renames outside Backtest
- [x] "July's proof" → "The proof" / "Month by month" (`app.constants.ts`, `app.routes.ts`, `start.constants.ts`, `plan.component.html`, `plan.helper.ts`, `architecture.constants.ts`, `architecture.component.ts`).
- [x] Plan's "July's peak day" chip and July baseline stay.

### Other polish
- [x] F/D/P index tags become focusable popover buttons (TermComponent CDK overlay pattern), drop `aria-hidden`; D0 too.
- [x] Plan initial-load reserve: min-height placeholder with rack + workspace shape.
- [x] Infeasible plan: already handled — drop from follow-ups.
- [x] `docs/demo-script.md` Backtest beat +~5 s (re-time with a stopwatch still open).
- [x] `docs/qa.md`: "Why July?" and "Why is October partial?".
- [x] `rules/ui.md` [UI-18]: P0 index and ledger pattern.

### Tests (focused only)
- [x] `buildInput` with `throughDate` trims intervals.
- [x] Runner for `2026-01` returns a finite bill.
- [x] Update July-pinned specs only where they read the removed constant.

## Order

Spike precompute → month param + MTD → service and component state → ledger → copy renames → index popover → Plan load reserve → docs → verify.

## Done when

- [x] `yarn --cwd app test --watch=false`, `yarn --cwd app build`, `git diff --check` pass.
- [x] `yarn --cwd app precompute:year` runs; precomputed July (Airport, Sch 8) equals live replay ($11,546, 76%; the $13,937 / 96% in the original plan was a stale phase-04 sentence); January matches its live replay.
- [x] /backtest at 1440 / 1024 / 375: click and arrow through all 10 months; rapid-click 5 months → one replay, no stacked freezes; site/schedule change on a non-July month; `?month=2026-01` deep link; October "to date" label; reduced motion; no collapse during replay.
- [x] Tab to each F/D/P tag: popover opens on focus, Escape closes, focus returns.
- [ ] Demo script re-timed with a stopwatch (estimated from word count only).
- [x] Committed (no co-author trailer) and PR opened in `## Changes` / `## Testing` format. No deploy.

## Out of scope

Deploy, Firebase access, re-freeze execution (only the precompute step is added), Web Worker for the solver, months before 2026.
