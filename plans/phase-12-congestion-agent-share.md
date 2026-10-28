# Phase 12 — Congestion, the agent and a shareable plan

**Goal:** Close the gaps in Torus's own card, not ours. Answer "How would you manage the grid's congestion?" with grid-side numbers, make "agents that schedule around clean power" visible and measurable, turn tomorrow's orders into a route, and let a judge take the plan home as a public link or a PDF. **Without adding visual weight:** every new number lands inside an element that already exists.

**Brief requirements covered (Torus card):** "How would you manage the grid's congestion?" · "stays out of traffic" · "a navigation app for electricity" · "agents that schedule around clean power" · creativity · clarity of insight

**Depends on:** 11 (merged). Hosting deploy is handled separately.

**Clock:** Wed Oct 28. Build 08:00–13:00, **feature freeze 13:00**, judging 17:00. Anything not green by 13:00 is cut, not finished.

## Scorecard targets

| Card row | Now | Target | Built by |
|---|---|---|---|
| Manage the grid's congestion | 6.5 | 10 | A |
| Agents that schedule around clean power | 6 | 10 | B, C |
| Navigation app for electricity | 8 | 10 | D |
| Stays out of traffic | 9 | 10 | A |
| Creativity | 9 | 10 | B (the rebound) |
| Clarity of insight | 8 | 10 | A, D, G (by subtraction, not addition) |
| Complete solution (take-home) | 9 | 10 | E, F |

## Design guardrails (frontend-design review)

The industrial console from phase 07 is the brand. This phase adds evidence, not furniture. Breaking a guardrail is a regression even if the feature works.

**Tokens: no new ones.** Paper `#eef1f0`, white instruments, ink `#17202b`, rush `#f28500` (rush hour only), clear `#0e6b4e`, Spin `#1495c7`, Pulse `#6a4bd6`. Overpass for prose, Overpass Mono for numbers. Radii 2 / 4 / 6 px. Open ruled `.dt-section`, `dt-tag` nameplates, `dt-figure`, `dt-chart-frame`, `dt-term`, `dt-source-chip`. No new colours, fonts, radii, shadows, pills or card styles.

**Budget per screen**

| Screen | New sections | New charts | New figures | New buttons | Allowed additions |
|---|---|---|---|---|---|
| Plan | 0 | 0 | 0 (one tile swaps, figures stay at 6) | 1 (Share menu; CSV moves into it) | one dashed line on D2, one hint line under the figures, an "Arrive" row in D0, a collapsed run log in the rail |
| Start | 0 | 0 | 0 | 0 | the hook line is rewritten in place; run times on the existing architecture diagram |
| Traffic | 0 | 0 | 0 | 0 | the MEF band defaults on only if it stays legible |
| Print | n/a | 0 new | n/a | n/a | a print-only masthead and footer |

**Colour roles stay pure.** Orange means rush hour and nothing else, so the rebound must not be orange. The simple shaver is ink at reduced opacity, dashed. Spin and Pulse colours are only for those machines. "Good" tone stays `clear`.

**Hierarchy on Plan stays:** dials → the answer → D0 orders with Approve → figures → D1–D3 → bill → under the hood. Approve stays the only primary button. Share is secondary.

**Motion:** the only new motion is the copy confirmation, where the Share label swaps to "Link copied" for 2 s (motion answers an action, `[UI-20]`). No entrance animations on the new numbers beyond the existing solve-delta treatment.

**Copy:** sentence case, plain verbs, one job per line. Same action name end to end: "Copy link" → "Link copied"; "Download PDF" opens print. No "AI-powered", no "agentic". Label hypotheticals inline, not in footnotes.

**Proof of no regression:**
- Before/after screenshots of Start and Plan at 1440, 1024 and 390, plus Plan print preview, into `docs/ui-audit/phase-12/`
- Compare the before shots against `docs/ui-audit/after/` from phase 07
- Above the fold on Plan at 1440, the dials, the answer and the start of D0 must still be visible
- Keyboard: Share menu reachable and closable with Esc; focus rings visible; reduced motion respected

## Parallel tracks and file ownership

Three worktrees, one PR each, merged in order 1 → 2 → 3. `plan.component.html` is shared; each track touches only its anchor.

| Track | Items | Owns | Anchor in `plan.component.html` |
|---|---|---|---|
| 1 Engine + figures | A, B | `core/plan/*`, `core/models/plan.interfaces.ts`, `plan/plan.helper.ts`, `plan/components/load-chart/*` | `plan__result` figures, D2 |
| 2 Route + agent + copy | C, D, G | `plan/dispatch-orders.*`, new `shared/components/run-log/`, `start/*`, `traffic/*` (band default), `docs/*` | solver rail top, `plan__orders` |
| 3 Share + PDF | E, F | `plan/plan.component.ts`, `core/services/snapshot.service.ts`, `plan/plan.component.scss` print block, new `plan/components/print-masthead/` | `plan__orders-actions` |

## Checklist

### A. Grid relief: what the grid gets back (track 1, ~1.5 h)

- [ ] Add to `IPlanMetrics`: `baselineRushPeakKw`, `plannedRushPeakKw`, `rushPeakCutKw` (max site draw inside the rush window, before vs after)
- [ ] Compute them in `PlanEngineHelper` inside the existing `rushHourMask` loop, next to `trafficAvoidedKwh`
- [ ] **Swap, don't add:** the `traffic` tile becomes **"Off PACE's rush hour · X kW"**. Its detail is "Y kWh moved out of 5–9 p.m., both days", folding in the old kWh value. Move it to first position. Figures stay at 6
- [ ] Fleet line as one `dt-hint` under the figures, not a tile: "If 100 stations like this ran DETOUR, about X MW would come off PACE's rush hour, Y% of its forecast load at 6 p.m. Illustrative fleet, not Torus's installed base." Y uses the snapshot's `dayAheadForecastMw` at the rush peak hour
- [ ] Rewrite `PlanHelper.answer()` to lead with the grid: "Takes X kW off PACE's rush hour and saves the customer $Y a month." Same length as today's line or shorter
- [ ] Sanity check: battery off ⇒ `rushPeakCutKw` = 0

### B. When it charges: the rebound and clean power (track 1, ~1.5 h)

- [ ] Run `NaiveShaverHelper` on the same 48 h plan input to get the simple shaver's grid draw (no LP, milliseconds)
- [ ] Add to metrics: `chargeSolarShare` = charging kWh weighted by PACE's solar share of generation that hour (EIA-930 `fuelMw` SUN / total), for DETOUR and for the shaver
- [ ] Add `reboundPeakKw`: the highest site grid draw in the 3 h after the rush window, shaver vs DETOUR
- [ ] **No new chart:** add an optional `compareKw` input to `dt-load-chart` and draw the shaver as an ink dashed line at ~45% opacity on D2. One legend entry ("Simple shaver") and one in-chart label at its evening bump: "Shaver recharges here: +B kW". No orange
- [ ] Add a third line to D2's how-to-read panel: why recharging right after rush hour just moves the jam
- [ ] Solar share goes in the CO2 tile's detail, not a new tile: "Charged while PACE was X% solar (shaver Y%)"
- [ ] **20-minute check first:** compare MEF spread by season in the derived signals. If spring clearly varies more than fall, add one clause to the CO2 detail ("carbon moves N× more in April"). If not, drop it

### C. The agent's run log (track 2, ~1 h)

- [ ] New small `dt-run-log`: a `<details>` in the solver rail, above the run sheet, **collapsed by default**. The summary line uses the rail's existing mono style: "Ran itself at 3:02 p.m. · planned in 84 ms". Open, it shows 6 mono rows (time · step · source):
  - [ ] Read PACE load, forecast and fuel mix · EIA-930 · `manifest.pulledAt`
  - [ ] Read EDAM prices · CAISO OASIS · `manifest.pulledAt`
  - [ ] Read weather · Open-Meteo · `manifest.weatherPulledAt`
  - [ ] Validated, N rows filtered · `lastRun.status`, `manifest.filteredRows`
  - [ ] Fitted marginal CO2 and the forecast · `derived.derivedAt`
  - [ ] Planned tomorrow · re-solved in your browser · `solveMs`
- [ ] It replaces the rail's current "Solved live: … ms with HiGHS" line, so the rail gains no height while collapsed
- [ ] **Start: no new strip.** Add the last-run time to the existing "How DETOUR works" architecture diagram (the cloud batch node gets "last ran 3:02 p.m.")
- [ ] Honest wording: the cloud steps come from the batch's run record; the planning step re-solves in the browser so the dials work. Nothing is called "AI"
- [ ] Stretch, only if everything else is green by 12:00: the 3 p.m. batch also solves tomorrow's default plan per site with `highs` in Node (already a functions dependency) and writes `plans/{snapshotId}_{siteId}`. The log's last row then reads "Planned tomorrow · 3:02 p.m. · cloud"

### D. Tomorrow's route (track 2, ~30 min)

D0 already is turn-by-turn: 4–7 timed blocks, each with a why. Don't build a second card.

- [ ] Rename the D0 title to **"Tomorrow's route"**, keeping "dispatch orders" in the subtitle meta line so the Lattice handoff language survives
- [ ] Add one closing **"Arrive"** row in the same grid as the orders: "X kW off the rush hour · $Y this month · Z kWh held for Wattsmart". It replaces `orderSummary` above the Approve button, so there's no net new line
- [ ] Merge adjacent same-action blocks if the list exceeds 6 rows, so the route reads in one glance

### E. Public share link (track 3, ~1 h)

- [ ] Sync `IPlanControls` to query params on `/plan`: `site`, `rate`, `co2`, `reserve`, `peak`, `day`, plus `snap` (snapshot id). Read them on init, write them with `replaceUrl` on every dial change
- [ ] Make `SnapshotService` accept an explicit snapshot id (expose the existing `_tryLoadManifest` path), falling back to pinned/current if the id is missing
- [ ] **One secondary button, "Share",** next to Approve. It opens a `mat-menu` with **Copy link**, **Download PDF** and **Download schedule (CSV)**. The CSV moves out of its current spot, so the action count stays the same
- [ ] Copy link uses CDK `Clipboard`; the Share label swaps to "Link copied" for 2 s with `role="status"`. No snackbar
- [ ] Opened from a link: one `dt-tag dt-tag--clear` "Shared plan" next to the title, with a tooltip saying "Same frozen grid data, re-solved in your browser". No banner
- [ ] Check: open a copied link in a private window → same figures

### F. PDF plan sheet (track 3, ~1.5 h)

- [ ] Download PDF → `window.print()` (browser Save as PDF; no PDF library)
- [ ] `@media print` for `/plan`: hide the shell nav, dials, rail chrome, D1, D3, Under the hood, next stop and all buttons. White page, ink text, no paper tint
- [ ] Print-only `dt-print-masthead`: DETOUR wordmark · site · rate plan · planning day, then a `dt-tag--sim` "Simulated site · seed 42 · real PACE data pulled {time}"
- [ ] Sheet order: masthead → Tomorrow's route (with Arrive) → the 6 figures (2 × 3) → D2 → footer with a 64 px QR code and the share URL in mono
- [ ] QR via the `qrcode` npm package rendered to inline SVG (no network)
- [ ] Rush stripes print as a pattern, not a fill. `break-inside: avoid` on figures, the chart frame and the route
- [ ] Check: Chrome print preview on Letter is 1 page (2 at most), charts crisp, nothing clipped

### G. Clarity by subtraction, plus demo copy (track 2, ~45 min)

- [ ] Start: **rewrite the existing `home__hook` line in place**, not a new line, so it carries the congestion: keep "$16.84 vs 3.1¢" as the headline and make the line under it "Tomorrow DETOUR takes X kW off PACE's rush hour and still cuts the bill." Keep it to one line at 1440
- [ ] Traffic: try the MEF 95% band default-on in a screenshot. Keep it on only if the carbon line still reads at 390; otherwise leave the toggle and quote the interval in the figure text
- [ ] Remove one accessory per touched screen: any hint or caption made redundant by A–D goes (e.g. the old "Moved out of rush hour" wording, the old orders summary)
- [ ] `docs/demo-script.md`: new close: "DETOUR is an agent that plans every Torus station for tomorrow's rush hour. At this site it takes X kW off PACE's peak, charges from midday solar so it never creates the next rush hour, and still saves the customer $Y." Add one beat for the route and one for Share (hand the judge the QR)
- [ ] `docs/qa.md`: add "Is this an AI agent?" (an autonomous daily planner; the LP decides and no LLM makes decisions), "Why 100 stations?" (illustrative, labeled), "What's the rebound?", and the cement plant's low capture rate
- [ ] `plans/00-general.md`: add this phase; the LLM briefing stays under "Cut on purpose"

## Cut from this phase

- Accounts, sign-up, saved-plan history: the link is the save, and the brief rules out auth
- Email: Share link + PDF cover the take-home; email adds a secret, a sender domain and a spam risk
- Server-side PDF (pdf-lib): print CSS gives the same sheet in a fraction of the time
- LLM briefing / chat: the route is deterministic; revisit only after judging
- A separate charge-timing chart, a grid-relief panel, a route card, an agent strip on Start: each would duplicate an existing element (D2, the figures, D0, the architecture diagram)
- Record (year) grid-relief totals: Plan carries the congestion story; the year ledger stays about money

## Done when

- [ ] Plan's first figure is kW off PACE's rush hour, with the fleet line labeled illustrative
- [ ] D2 shows the simple shaver's evening rebound against DETOUR, with no new chart and no orange
- [ ] The run log shows real batch timestamps, collapsed by default, and the rail is no taller than before
- [ ] D0 reads as "Tomorrow's route" with an Arrive row, still 4–7 rows
- [ ] A copied share link reproduces the same plan in a private window
- [ ] Print → PDF gives a clean 1-page plan sheet with QR code and simulated labels
- [ ] Before/after screenshots in `docs/ui-audit/phase-12/` show no new sections, charts or colours, and the guardrail budget holds
- [ ] Demo script and Q&A updated, re-timed under 5 minutes
- [ ] Three PRs opened (one per track); none merged without Juan's go-ahead
