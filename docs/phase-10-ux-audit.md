# Phase 10 UX audit: Forecast, Decide, Prove and Start

Audit date: 2026-10-27, source review of `main` at `b50413f` plus the phase 07 screenshots in `docs/ui-audit/after/`. Judging is Wed Oct 28, 5 p.m. The brief, demo script, `docs/qa.md` and both earlier audits were read first.

## Rubric score before this phase

| Rubric line | Score | Why not higher |
|---|---:|---|
| Creativity | 97% | Nothing to fix. Planning layer on real tariffs, Spin/Pulse split, dispatch orders handed to Lattice. |
| Clarity of insight | 89% | "3 Prove" is numbered like a step but is a ledger. The next-step call to action sits 3,000 px down. Prove asks about July while its hero is the year, and repeats the capture rate four times. The solver rail and LP text have no plain-words layer. "In your browser" appears four times on Decide. |
| Execution | 95% | Deployed. Forecast reads two years of hourly rows on every visit; Prove replays a month for about ten seconds on first load. |
| **Overall** | **94%** | Clarity is where the points are. |

Target after the phase: Creativity 97, Clarity 96, Execution 97, overall 97. Re-score in the last task of the plan and record it below.

## Structural findings (all pages)

| # | Finding | Severity | Fix |
|---|---|---|---|
| S1 | Prove is numbered "3" everywhere (nav, Start tile, page step, next-stop sign, architecture). Steps 1 and 2 are tomorrow's workflow; Prove is the record of that workflow over 2026. A judge expects an action on step 3 and finds a ledger. | High | Two steps plus a **Record** page. Nav: `Start · 1 Forecast · 2 Decide · Record`. Record gets no number and its own marker style. Start tiles follow. `app.constants.ts`, `start.constants.ts`, `architecture.constants.ts`, the three `dt-page__step` headers. |
| S2 | The only "next" call to action is `dt-next-stop` after Under the hood, at the very bottom of each page. | High | Inline CTA at the decision moment: under the answer paragraph on Forecast; beside the Approved stamp on Decide. The bottom one stays as a quiet secondary. |
| S3 | "In your browser" is said four times on Decide (answer placeholder, rail status, rail sentence, lp-stats line) and once in the architecture caption. Once is a feature; four reads as an apology. | Medium | One mention, in the solver rail: "Solved live". The architecture caption changes to the cloud-batch / live-solve story (Track B). |
| S4 | Loading copy exposes the cost: "Reading two years of PACE grid data…", "Replaying the month day by day. This takes about ten seconds…". | Medium | Track B removes the cost; copy becomes "Reading the grid snapshot…" and "Loading the month…". |

## 1 Forecast

Good. Hero, three charts, forecast comparison and rank slope hold their hierarchy. Two overload spots:

| # | Finding | Severity | Fix |
|---|---|---|---|
| F1 | Carbon (F4) how-to-read introduces the import band, two estimates and two intervals before saying what it means for tomorrow. | Medium | One plain-words line above the how-to-read: carbon barely moves hour to hour, so it is a tie-breaker; bill and price decide. |
| F2 | "How the forecasts were scored" opens on a MAPE/Bias/Low-at-peak table. | Low | Plain-words line in the drawer description; the table stays. |
| F3 | Next-step CTA (S2). | High | Inline CTA under the answer. |

## 2 Decide

The strongest page. Dispatch orders plus Approve is the best moment in the app; keep it untouched.

| # | Finding | Severity | Fix |
|---|---|---|---|
| D1 | The solver rail (`192 int · 1,346 var · 1,240 con · 51 ms`) and "The LP, exactly as solved" have no plain-words layer. A judge who opens the LP sees 1,300 lines of CPLEX and "paste it into any LP solver". | High | A "What this is" block above the LP text (three sentences), a Download LP button, and three explanatory comment lines at the top of the generated LP so the download explains itself. |
| D2 | Six figure tiles at equal weight; two are negatives that need explaining (−$73 energy, +194 kg CO2). | Medium | Four positives stay large (peak cut, worth per month, moved out of rush hour, held for Wattsmart); energy change and CO2 change become secondary small figures. No information lost. |
| D3 | "In your browser" four times (S3). | Medium | One mention. |
| D4 | After Approve there is no "what now". | High | "See if this pays off → Record" beside the Approved stamp; present before approval too, with a quieter title. |

## Prove → Record

| # | Finding | Severity | Fix |
|---|---|---|---|
| P1 | Headline asks "Would it have paid off last July?" but the first content is the site controls and then the year ledger. The page cannot decide whether it is a year or a month. | High | Lead with the year: headline "Has DETOUR paid off in 2026?", lead figures = year-to-date saved, year-to-date capture, best month, months replayed. Ledger is the hero. The month becomes "Pick a month" below it with the month question as its h2. |
| P2 | "Perfect hindsight = 100%" is the one concept non-specialists trip on, and it is first explained inside the gauge footer. | High | One line under the ledger title, before any gauge: perfect hindsight is the same planner told the whole month in advance; no real controller can match it, so it is the 100% mark. |
| P3 | Capture rate appears four times (gauge, lead tile, table column, strategy cards); bill savings five times. | Medium | Drop the capture lead tile (the gauge is the capture rate). Table and strategy cards move into a drawer with the bill-line bars and wear. |
| P4 | 3,600 px, twelve sections, all at the same visual weight. | Medium | Month detail = verdict gauge + calendar + day close-up. "Where the dollars came from", "What it cost the machines" and the strategy table collapse into one `dt-under-the-hood` drawer. |
| P5 | Bottom CTA goes "Back to the start · See how DETOUR works". | Low | "Back to tomorrow → 1 Forecast", with the architecture link kept as text. |

## Start

Keep it. Two tweaks follow S1: the third tile becomes a Record tile ("saved so far this year" is already its figure) with a distinct style, and "Three stops: Forecast, Decide, Prove" becomes "Two steps, then the record".

## Backend advice

- **Keep the LP solve in the browser.** The brief's Execution line says "Live LP re-solve in the browser"; dragging a dial and watching a 51 ms re-solve is a demo beat. Moving it server-side adds latency and removes a creativity point.
- **Move the per-snapshot compute to the cloud.** MEF regression, forecast score and the ridge forecast are deterministic functions of the 3 p.m. snapshot. Today the browser downloads two years of hourly rows and regresses them on every visit (`grid-signals.service.ts`, `load-forecast.service.ts`). The core helpers are pure and already run in Node (`app/scripts/precompute-year.ts` proves it, HiGHS included). They fit one Firestore doc under `snapshots/{id}/derived/signals`.
- **Month replays do not fit Firestore.** Five strategies × ~2,976 intervals is several MB per month, over the 1 MiB doc limit. They go to hosting as static JSON written by the existing precompute script, like `backtest-year.json` already does.
- **The pinned snapshot needs a backfill.** The 3 p.m. run will not touch the snapshot judges see, so a `derive` admin command must write the derived doc for the pinned snapshot, and the browser must fall back to local compute when the doc is missing (`[HACK-14]`).
- **Tell the story either way.** "Daily batch in the cloud (fetch, validate, regress, forecast, replay) · live solve on your screen (tariff + LP)" is a stronger architecture than "everything on your device", and it is what the function already half-does.

## Do not change

Dispatch orders and Approve. The plant-map hero. The nameplate index system (F1–F5, D0–D3, P0–P5). Source chips, SIMULATED labels, glossary terms, how-to-read blocks. The LP formulation, tariff engine, forecast and backtest logic.

## Rubric score after this phase

Scored 2026-10-28 after the build, against `docs/ui-audit/phase-10/`. Execution is held below target because the cloud batch is built but not yet deployed or run against the pinned snapshot.

| Rubric line | Score | Evidence |
|---|---:|---|
| Creativity | 97% | Unchanged and untouched: plant-map hero, dispatch orders, Spin/Pulse split. The Approve bar makes the handoff to Lattice the page's one primary action (`decide-approve-before-1440.png`, `decide-approve-after-1440.png`). |
| Clarity of insight | 96% | Nav reads `Start · 1 Forecast · 2 Decide · Record` with Record unnumbered (`forecast-1440.png`, `record-1440.png`, `start-1440.png`). Forecast has its next-step CTA in the first viewport. Decide's CTA sits beside Approve and changes after approval (`decide-approve-after-375.png`). Record opens on the year with four lead figures and the hindsight line before any gauge; the month question is its own section (`record-month-1440.png`). Strategy table, bars and wear sit in one drawer (`record-drawer-1440.png`). "In your browser" appears 0 times on Decide. Plain-words lines over carbon, forecast scoring and the LP. Not 97+: the year sentence still shows twice at the top of Record (answer and "What to notice"). |
| Execution | 95% | App build, 103 tests and functions build green; no horizontal overflow on Start, Forecast, Decide or Record at 1440 or 375. The airport month replay loads from `/data/replays/2026-07-airport-schedule-8.json` and matches the local replay to the dollar. Not higher: `derive` has not been run, so the derived-doc path is untested live, and with no derived doc the Start Forecast tile still waits on the two-year MEF read (slow in headless Chromium). |
| **Overall** | **96%** | Clarity gained 7 points; Execution moves to 97 once B6 ships and a phone check passes. |
