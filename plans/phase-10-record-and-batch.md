# Phase 10: two steps and the record, cloud batch

**Goal:** Reframe Prove as the Record, put the next-step call to action where the reader has just got the payoff, add a plain-words layer over the technical blocks, and move per-snapshot compute to the cloud so Forecast and Record load without a wait.

**Audit:** `docs/phase-10-ux-audit.md` (findings S1–S4, F1–F3, D1–D4, P1–P5). Read it first.

**Two tracks, two PRs.** Track A (UI and copy) carries the rubric points and merges first. Track B (cloud batch) merges only if green by the cut-off: **Wed Oct 28, 1 p.m. MT**. Both tracks must leave the app deployable at every commit (`[HACK-14]`). Run them in parallel (`[AGT-02]`): Track B in its own worktree.

**Constraints**

- No new features. Every task is a reframe, a move, or a plain-words line.
- Existing specs stay green: `yarn --cwd app test` (100 tests) and `yarn --cwd functions build`.
- Copy rules from `rules/ui.md` and the existing voice: short sentences, no "AI-powered", every simulated number labeled.
- First step in either worktree: `yarn --cwd app install && yarn --cwd functions install` (this checkout has no `node_modules`).
- Verify each task by running `yarn --cwd app start`, walking the page at 1440 and 375 px, and saving screenshots to `docs/ui-audit/phase-10/` (`[HACK-11]`, `[HACK-16]`).
- Commit per task; PR per track; squash merge; ask before merging.

---

## Track A: Record, CTAs, plain words

### A1. Two steps and the record (S1)

- [ ] `app/src/app/app.interfaces.ts`: add `kind: 'start' | 'step' | 'record'` to `INavLink`.
- [ ] `app/src/app/app.constants.ts`: Prove row becomes `{ path: '/backtest', label: 'Record', shortLabel: 'Record', step: '', kind: 'record', description: '2026, month by month' }`; Start gets `kind: 'start'`, Forecast and Decide `kind: 'step'`.
- [ ] `app/src/app/app.component.html:41-58`: render the step number only for `kind === 'step'`; for `kind === 'record'` render a small ledger marker (`dt-shell__step-number--record`, three short horizontal bars in an SVG) and `aria-label="Record: 2026, month by month"`.
- [ ] `app/src/app/app.component.scss`: style `dt-shell__step-number--record` as an outlined box like the step box but with the bars instead of a digit; add a thin vertical rule before the Record item at ≥ 768 px to separate the loop from the record.
- [ ] `app/src/app/app.routes.ts`: backtest title `'DETOUR · The record'`.
- [ ] Page step headers: `traffic.component.html:3` visually-hidden text "Step 1 of 2"; `plan.component.html:4` "Step 2 of 2"; `backtest.component.html:4` becomes `<span class="cdk-visually-hidden">The record: </span><span class="dt-page__step-number dt-page__step-number--record" aria-hidden="true">REC</span><span class="dt-page__step-name">2026, month by month</span>`.
- [ ] `app/src/app/start/start.constants.ts:16-20`: third tile `{ path: '/backtest', code: 'REC', stage: 'Record' }`; add `isRecord: true` to the tile built in `StartHelper.proveTile` (`start.helper.ts:109`) and to `IStartTile`.
- [ ] `start.component.html:93`: add `[class.home__tile--record]="tile.isRecord"`; `start.component.scss`: record tile gets a dashed top rule and the ledger marker instead of the arrow-only head, same size as the step tiles. The muted tile state stays.
- [ ] `start.component.html`: the visually hidden `<h1>` and the "Three stops" heading (search for the string in `start.component.*` and `start.helper.ts`) become "Two steps, then the record".
- [ ] `architecture.constants.ts:35-44` (screens stage only; Track B owns the cloud, store and browser stages): title `'Start, two steps, the record'`, items `Start here · 1 Forecast · 2 Decide · Record: did it pay off?`.
- [ ] Next-stop signs: `traffic.component.html:316` keeps `sign="2"`; `plan.component.html:496` becomes `sign="REC" label="Next · Record" title="Did it pay off? 2026, month by month"`.
- [ ] Verify: nav shows `Start · 1 Forecast · 2 Decide · Record` at 1440 and 375; tab order unchanged; screenshots.
- [ ] Commit `feat: two steps and the record`.

### A2. Record page leads with the year (P1–P5)

- [ ] `app/src/app/backtest/backtest.interfaces.ts`: add to `IYearLedger`: `leadFigures: IBacktestTile[]` (reuse the existing tile interface the lead tiles use) and `hindsightLine: string`.
- [ ] `app/src/app/backtest/year-ledger.helper.ts:70-80`: build `leadFigures` from the totals already computed: `Saved in 2026 to date` (`savedTotal`, money), `Of perfect hindsight` (`savedTotal / ceilingTotal`, percent), `Best month` (`labelOf(ranked[0])`), `Months replayed` (`totals.length`). Empty array when `totals.length === 0`. `hindsightLine` = `Perfect hindsight is the same planner told the whole month in advance. No real controller can match it, so it is the 100% mark.`
- [ ] `backtest.component.ts:95-105`: the page heading no longer depends on the month. `heading$` emits `{ question: 'Has DETOUR paid off in 2026?', monthLabel }`; keep the month question (`Would it have paid off in …?`) as `monthQuestion` for the month section.
- [ ] `backtest.component.html:2-18`: `<h1>` = `heading.question`; `dt-answer` = `screen.ledger.summary` (the year sentence) when the ledger has data, else the current pending sentence.
- [ ] `backtest.component.html:53-73`: ledger section first (above the controls), then `<div class="dt-figures">` with `screen.ledger.leadFigures` as `dt-figure` tiles, then `<p class="dt-section__lede">{{ screen.ledger.hindsightLine }}</p>`, then the controls (`dt-backtest__controls`) with the label "Site and rate plan apply to every month".
- [ ] `backtest.component.html:92-101`: wrap the month result in a `dt-section` headed `<h2 class="dt-section__title">{{ monthQuestion }}</h2>` with a lede `{{ model.answer }}`; the "Verdict" gauge stays as the first block of that section.
- [ ] `backtest.helper.ts` (search `leadTiles`): remove the `capture` tile; the gauge is the capture rate. Keep saved, demand share, held for Wattsmart.
- [ ] `backtest.component.html:197-276, 379-452`: move the strategy table, strategy cards, "Where the dollars came from" (P4) and "What it cost the machines" (P5) into one `<dt-under-the-hood summary="Where the dollars came from" description="Every strategy, every bill line, and what it cost the machines">` placed after the day close-up. Calendar (P1) and the day close-up (P2, P3) stay visible.
- [ ] `backtest.component.html:497`: `<dt-next-stop path="/traffic" sign="1" label="Back to tomorrow" title="Tomorrow's grid: when is it jammed?">`; add one line above it: `<p class="dt-hint">How DETOUR works, under the hood: <a routerLink="/start" fragment="architecture">the architecture on Start here</a>.</p>`.
- [ ] `backtest.constants.ts:516`: `LOADING_MESSAGE: 'Loading the month…'`.
- [ ] Verify: Record opens on the year, ledger first, four lead figures, hindsight line before any gauge; clicking July shows the month section with the gauge; drawer opens with the table and bars; 375 px stacks cleanly; screenshots.
- [ ] Commit `feat: the record leads with the year`.

### A3. Call to action at the decision moment (S2, F3, D4)

- [ ] `next-stop.component.ts`: add `@Input() public variant: 'bar' | 'inline' = 'bar'`; `next-stop.component.html`: `[class.dt-next-stop--inline]="variant === 'inline'"`.
- [ ] `next-stop.component.scss`: `.dt-next-stop--inline` drops the top rule and padding, `max-width: 420px`, sign 32 px, title `--dt-text-15`, label hidden at 375 px.
- [ ] `traffic.component.html:3-13`: after the `dt-answer` paragraph, inside the header: `<dt-next-stop variant="inline" path="/plan" sign="2" label="Next · Decide" [title]="'Plan around it: what should the station do ' + ((day$ | async)?.word ?? 'tomorrow') + '?'">`.
- [ ] `plan.component.html:267-291` (`plan__orders-actions`): Approve is the only real action in the app, so it becomes the page's primary control. Make `plan__orders-actions` a full-width action bar at the foot of the orders sheet (ink background like `dt-next-stop`, inside the D0 frame): left, a one-line summary `6 orders · Wed Oct 28 · Regional Airport · Schedule 8`; right, the Approve button at `--dt-text-17` with `task_alt` and the text `Approve and queue for Lattice`; CSV becomes a text link beside it. After approval the bar turns `--dt-clear` with the stamp (`Approved 19:09 MT · queued for Lattice · SIMULATED`) and the next-step CTA takes the button's place. Also pin a compact Approve into the solver rail (`plan__rail`, right-aligned, `mat-stroked-button`) so it is reachable without scrolling past the orders. Both call `onApprove(sheet)`.
- [ ] In the same action bar, after the CSV link, `<dt-next-stop variant="inline" path="/backtest" sign="REC" label="Next · Record" [title]="isApproved(sheet) ? 'Approved. Now see if it pays off' : 'See if this pays off, month by month'">`. On 375 px it wraps under the buttons.
- [ ] Bottom `dt-next-stop` on Forecast and Decide stays (`variant="bar"`).
- [ ] Verify: Forecast CTA is visible in the first viewport at 1440; Decide CTA sits beside Approve and changes its title after approval; both route correctly; screenshots.
- [ ] Commit `feat: next-step call to action at the decision moment`.

### A4. Plain words over the technical blocks (S3, F1, F2, D1, D2, D3)

- [ ] `traffic.component.html:132` (Carbon F4, above `how-to-read`): `<p class="dt-hint dt-plain">In plain words: tomorrow's carbon barely changes hour to hour, so DETOUR uses it as a tie-breaker. The bill and the grid price decide; carbon settles ties.</p>`. Add `.dt-plain` to the global styles: ink colour, `--dt-text-15`, a 2 px left rule in `--dt-clear`.
- [ ] `traffic.component.html:200`: `dt-under-the-hood` description becomes `'In plain words: ours misses by ' + (forecast.comparison[0].score.mapePercent | number: '1.1-1') + '% in a typical hour, PACE by ' + (forecast.comparison[1].score.mapePercent | number: '1.1-1') + '%'` (confirm index 0 is ours and 1 is PACE in `forecastVerdict`; otherwise use the row ids).
- [ ] `traffic.component.html:23`: spinner text `Reading the grid snapshot…`.
- [ ] `plan.component.html:10`: `Solving the plan…`. `:198`: `Solving live…`. `:203-207`: `Solved live: {{ solve.viewModel.dateLabel }} and the next day, {{ … intervals.length }} fifteen-minute steps, {{ solveMs }} ms with HiGHS.` `:351` and `:449`: drop `in your browser` from `lpStatsLine` (search `plan.helper.ts` for the string).
- [ ] `plan.component.html:338-349`: split the tiles: first `dt-figures` with ids `peak`, `worth`, `moved`, `held`; second `dt-figures dt-figures--secondary` with `energy` and `co2` as `size="small"`. Confirm the tile ids in `plan.helper.ts`; the delta flash and source chips keep working on both groups.
- [ ] `lp-text.component.html:549-563`: above the toolbar, `<div class="lp-text__plain"><h4>What this is</h4><p>A linear program is a list of every 15 minutes of the next two days, each with a price for grid energy, carbon and machine wear, and the rules the station must obey: energy balance, charge limits, ramp limits, the Wattsmart reserve.</p><p>HiGHS, an open-source solver, finds the cheapest schedule that breaks no rule. The text below is that list, exactly as solved; paste it into any LP solver to check the plan.</p></div>`.
- [ ] `lp-text.component.ts`: `metaLabel` drops the "CPLEX LP format: paste it…" sentence (now in the panel). Add `onDownload(): void` that saves `lpText` as `detour-plan-<date>.lp` (`Blob` + anchor, same pattern as `onDownloadCsv` in `plan.component.ts:262`); add `@Input() public date = ''` for the filename and a `Download LP` stroked button next to Copy.
- [ ] `app/src/app/core/plan/lp-builder.helper.ts:26-31`: three comment lines after the existing header: `\ What this is: every 15 minutes of the next two days, priced for energy, carbon and wear, with the rules the station must obey.`, `\ HiGHS finds the cheapest schedule that breaks no rule. Paste this file into any LP solver to check it.`, `\ SIMULATED Torus Station, seed 42. No device is connected.` Run `yarn --cwd app test`; the LP builder spec must still pass (adjust only if it asserts the exact header).
- [ ] `plan.component.html:451`: pass `[date]="viewModel.dateLabel"` to `dt-lp-text`.
- [ ] Verify: Decide reads "in your browser" at most once; LP panel shows the three sentences; Download LP saves a file whose first lines are the comments; tiles split 4 + 2; screenshots.
- [ ] Commit `feat: plain words over the LP, the rail and the carbon chart`.

### A5. Docs, mobile pass, re-score

- [ ] `docs/demo-script.md`: headings "1 Forecast", "2 Decide", "The record"; the close says "two steps and the record"; add the Decide beat "Approve, then click See if this pays off". Re-estimate the word count.
- [ ] `README.md`: demo flow lists Start → 1 Forecast → 2 Decide → Record.
- [ ] `docs/qa.md`: retitle the July question to "Why does the record open on the year?"; answer from `YearLedgerHelper.summary`.
- [ ] Walk every route at 375 px; no horizontal overflow (`document.documentElement.scrollWidth === innerWidth`).
- [ ] `yarn --cwd app build` and `yarn --cwd app test` clean.
- [ ] Re-score the rubric and fill the table at the end of `docs/phase-10-ux-audit.md`, with evidence per line and the screenshot names.
- [ ] Commit `docs: phase 10 script, README, Q&A and re-score`; open the Track A PR.

---

## Track B: cloud batch for per-snapshot compute

Run in a separate worktree. Each step keeps the browser working with or without the derived doc.

### B1. Functions can compile the core helpers

- [ ] `grep -rn "@app/" app/src/app/core` must be empty; convert any hit to a relative import.
- [ ] `functions/tsconfig.json`: `"rootDir": ".."`, `"include": ["src", "../app/src/app/core", "../app/src/types"]` (drop `lib/firestore/index.d.ts`: `app/src/types/firestore.d.ts` is the source of the same `Detour.Firestore` namespace and including both duplicates it), add `"../app/src/app/core/services/**", "../app/src/app/core/plan/plan-solver.service.ts", "../app/src/app/core/index.ts"` to `exclude` (Angular imports). `functions/package.json`: `"main": "lib/functions/src/index.js"`; add `"highs": "1.15.4"` to dependencies.
- [ ] `functions/tsconfig.dev.json`: mirror the include/exclude.
- [ ] `yarn --cwd functions build` clean; `node -e "require('./functions/lib/functions/src/index.js')"` loads.
- [ ] Commit `chore: functions compile the shared core helpers`.

### B2. Derived signals document

- [ ] `app/src/app/core/models/derived.interfaces.ts`: `export interface IDerivedSignals { version: 1; derivedAt: string; marginalEmissions: IMarginalEmissionsSeries[]; averageEmissions: ReturnType<typeof EmissionsHelper.averageIntensity>; forecastScore: ReturnType<typeof ForecastScoreHelper.score>; loadForecast: ILoadForecast | null }` — name the two `ReturnType`s with their real interfaces from `signals.interfaces.ts`. Export from `models/index.ts`.
- [ ] `functions/src/derive/derive-signals.service.ts`: `export class DeriveSignalsService { public static build(manifest: Detour.Firestore.Snapshot.IManifest, gridMonths: IGridMonth[], weatherMonths: IWeatherMonth[]): IDerivedSignals }` using `EmissionsHelper.buildRows / marginalSeries('fossil-generation' and 'demand') / averageIntensity`, `ForecastScoreHelper.score`, and `LoadForecastHelper.build(gridHours, weatherHours, manifest.targetDate, manifest.weatherPulledAt.toDate().toISOString())` (null when `weatherMonths.length === 0`). Sort grid hours by `utcHourEnding` exactly as `GridSignalsService.history$` does.
- [ ] `functions/src/ingest/ingest-store.service.ts`: `public async writeDerived(snapshotId: string, derived: IDerivedSignals): Promise<void>` → `snapshots/{id}/derived/signals`; `public async readMonths(snapshotId, collectionName)` for the admin command. Log the JSON byte size; it must be under 900,000.
- [ ] `functions/src/ingest/ingest-run.service.ts:230` (after `writeSnapshot`): `await storeService.writeDerived(manifest.id, DeriveSignalsService.build(manifest, result.gridMonths, result.weatherMonths))`; wrap in try/catch that logs a warning and continues (a failed derive must not reject the snapshot).
- [ ] `functions/src/dev/derive-admin.ts` and `package.json` script `"derive": "tsx src/dev/derive-admin.ts"`: argument `snapshotId` optional, default served (pinned ?? current); reads months, builds, writes, prints the byte size and `targetHours.length`.
- [ ] Run `yarn --cwd functions derive` against the pinned snapshot; confirm the doc in the Firebase console.
- [ ] Commit `feat: derived signals written by the snapshot run and a derive command`.

### B3. Browser reads the derived doc, falls back to local compute

- [ ] `snapshot.service.ts`: `public readonly derived$: Observable<IDerivedSignals | null>` reading `snapshots/{manifest.id}/derived/signals`, `shareReplay(1)`, null on missing or error (log once).
- [ ] `grid-signals.service.ts`: `marginalEmissions$`, `averageEmissions$`, `forecastScore$` = `derived$` → if non-null use its fields, else the existing `history$` computation. Add `recentHistory$`: grid hours for the months covering `targetDate − trafficConfig.TREND_DAYS` to `targetDate` (two months at most).
- [ ] `traffic-view-state.helper.ts` and `traffic.component.ts:83-88`: find every consumer of `history$`; the chart series (F2 and the hero stack) switch to `recentHistory$`; anything that needs the full history (confirm with grep: ranking, rush heuristic, fuel-mix 14-day average) is either already covered by a derived field or must stay on `history$`. If a consumer needs full history and no derived field covers it, extend `IDerivedSignals` rather than keep the two-year read.
- [ ] `load-forecast.service.ts`: `forecast$` = `derived$.loadForecast` when present, else the existing path.
- [ ] Verify with the derived doc present: Network tab shows no `gridMonths` reads older than two months on Forecast; Decide's MEF matches the previous plan figures to the dollar (compare against a screenshot from `main`). Verify with the doc deleted (use a scratch snapshot id or temporarily point `derived$` at a wrong path): every screen still renders from local compute.
- [ ] Commit `feat: Forecast, Decide and Record read derived signals with local fallback`.

### B4. Month replays as static JSON

- [ ] `app/scripts/precompute-year.ts`: after each `BacktestRunnerHelper.run`, also write `public/data/replays/${month}-${site.id}-${schedule.id}.json` for `site.id === 'airport'` only (the demo path; make the site list a constant so all three is a one-line change). Trim before writing: drop `intervals` on `shaver`, `oracle`, `perfectLoad` and on every entry of `strategies` except the lead and baseline; round every number to 2 decimals. Confirm `IBacktestResult` round-trips through JSON (no `Date`, `Map` or `undefined`-dependent fields); if `backtest.helper.ts` reads intervals of a trimmed strategy, keep that strategy's intervals.
- [ ] Target size: under 500 KB per file; print sizes.
- [ ] `backtest.service.ts:run`: before the local run, `this._http.get<IBacktestResult>('/data/replays/' + key + '.json')` with `catchError(() => local run)`; cache in `_resultCache` as today. `backtest.component.ts` loading message no longer mentions ten seconds (A2 already changed the constant).
- [ ] Verify: Record (airport, Schedule 8, July) renders from the file with no spinner beyond the HTTP fetch; cement plant still replays locally; figures match the local replay to the dollar.
- [ ] Commit `feat: precomputed month replays for the demo site`.

### B5. Architecture tells the cloud-batch story (S3, S4)

- [ ] `architecture.constants.ts`: cloud stage title `'Every day at 3 p.m. MT'`, items `refreshSnapshot: 'Fetch, validate, publish'` and `deriveSignals: 'Marginal CO2, forecast, score'`; store stage items `Firestore snapshot: 'Rows and derived signals'` and `Hosting: 'Month replays, pinned'`; browser stage title `'Live on your screen'`, items `Tariff engine`, `Site generator`, `LP text + HiGHS WASM: 'The plan, solved live'`. Check `architectureWideLayout.ITEM_HEIGHTS` and the narrow layout still fit; adjust column widths, not copy.
- [ ] `architecture.component.html` caption: `The cloud does the daily batch at 3 p.m.: fetch, validate, regress, forecast, replay. Your screen does the live part: the tariff maths and the LP re-solve. No upstream API is called while you use the app.`
- [ ] `docs/qa.md`: add "What runs where?" with the same two sentences; keep "Is the LP running on a server? No."
- [ ] Commit `docs: architecture shows the cloud batch and the live solve`.

### B6. Ship

- [ ] `yarn --cwd functions build`, `yarn --cwd app build`, `yarn --cwd app test` clean.
- [ ] Deploy functions (ask first); run `yarn --cwd functions derive` for the pinned snapshot; deploy hosting with the replay files (ask first).
- [ ] Phone check on the live URL: Forecast loads in under 3 s on cellular; Record opens on the year with no replay wait.
- [ ] Open the Track B PR. If not green by Wed 1 p.m. MT, ship Track A alone; the app is unchanged in behaviour without B.
