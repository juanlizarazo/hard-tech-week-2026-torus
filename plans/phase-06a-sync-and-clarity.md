# Phase 06a — Daily auto-sync with a demo backup, and a UI a first-timer can read

**Goal:** (A) The snapshot refreshes itself every afternoon from a scheduled Cloud Function, never replaces good data with bad, and can be pinned so the demo always has a known-good snapshot. (B) A first-time viewer (and a judge who is not a grid engineer) understands what each screen shows, what to notice and what the words mean, in a distinctive "road report" visual identity instead of the default Material/Tailwind look.

**Brief requirements covered:** §3 clarity ("don't assume a grid engineer is in the room"), §3 execution (working pipeline, every number traced to a source), §7 demo path, `[HACK-14]` deployable at all times, `[HACK-15]` loading/empty/error states, `[HACK-16]` mobile, `[HACK-21]` UI refinement.

**Depends on:** 01–05 merged (done). A and B touch disjoint folders (`functions/` vs `app/`), so per `[AGT-02]` they run as two parallel agents. The only shared file is `app/src/types/firestore.d.ts` (pointer fields), and A owns it.

**Changes to `00-general.md`:** this phase overrides two earlier decisions. "No Cloud Functions on the demo path" still holds, because the function runs off the demo path and only writes snapshots. "Live or scheduled data refresh" moves from *cut* to *done*, now with a pin. Row 05 → Done, row 06 → In progress.

---

## Part A — Scheduled ingest with backup

### Design

- A daily `onSchedule` function, `refreshSnapshot`, runs at **3:00 p.m. America/Denver** (`0 15 * * *`, `timeZone: 'America/Denver'`). It retries up to 3 times, 10 minutes apart, because OASIS posts tomorrow's day-ahead prices and forecast at about 2 p.m. MT and sometimes late.
- Runtime: `timeoutSeconds: 540`, `memory: '1GiB'`, `secrets: [EIA_API_KEY]`, and no disk cache. A full run is about 60 HTTP requests and 1.5–3 min, mostly OASIS pacing.
- **Write first, flip second.** A run always writes a full new `snapshots/{id}` (months first, manifest last, as today). Only after validation does it move `config/snapshot`. A failed run never touches the pointer.
- **Validation gate**, all of which must pass before the flip:
  - `targetDate` is later than the current snapshot's target date. If OASIS hasn't posted yet, throw so the retry fires.
  - The target day has its full hours: 24, or 23/25 on DST days, with both a forecast and a price.
  - The OASIS price and forecast chunks are not empty. Today a failed last chunk silently returns `[]`, so check explicitly.
  - Every month doc is under 1 MiB.
  - The grid row count is at least 95% of the current manifest's.
- **Backup and pin.** The pointer doc `config/snapshot` gains these fields:
  - `lastGoodSnapshotIds: string[]` — the last 5 validated ids, newest first. Never pruned below 5. There is no deletion this phase.
  - `pinnedSnapshotId?: string` — when set, the app serves this snapshot and the function still writes new snapshots but does **not** flip.
  - `lastRun: { at, status: 'flipped' | 'pinned-skip' | 'rejected' | 'failed', snapshotId?, targetDate?, message }` — shown in the app badge.
- **App fallback.** `snapshot.service.ts` resolves `pinnedSnapshotId ?? currentSnapshotId`. If that manifest is missing or fails to load, it walks `lastGoodSnapshotIds`. Today it only falls back to `previousSnapshotId` when the doc is missing.
- **CLI for the demo**, added as `functions/package.json` scripts and run locally with the existing gcloud token auth:
  - `yarn --cwd functions snapshot:status` — print the pointer, the last run and the last good ids.
  - `yarn --cwd functions snapshot:pin [id]` — pin the current snapshot, or the given id.
  - `yarn --cwd functions snapshot:unpin`
  - `yarn --cwd functions snapshot:rollback` — move current to the previous good id.
  - `yarn --cwd functions ingest` keeps working and goes through the same validation and pointer code.

### Checklist

- [ ] Move the ingest from `functions/src/dev/` into a deployable `functions/src/ingest/`: fetch service, helper, constants, interfaces, store service. Leave `src/dev/ingest-snapshot.ts` as a thin CLI (argument parsing, `process.exit`).
- [ ] Extract `buildIngestResult(fetchService, now)` and `runIngest({ isDryRun, firestore, apiKey, log, useCache })` from `main()` in `ingest-snapshot.ts:66-222`.
- [ ] `IngestFetchService`: take the EIA key in the constructor. The CLI keeps `_getApiKey()`'s `firebase functions:secrets:access` path; the function passes `defineSecret('EIA_API_KEY').value()`. Make the disk cache optional and off in the function.
- [ ] `IngestStoreService`: take a `Firestore` in the constructor. The CLI keeps the gcloud-token client; the function uses `firebase-admin` `getFirestore()`. Split `writeToFirestore` into `writeSnapshot()` and `flipPointer()`.
- [ ] `ingest-validation.helper.ts`: the gate above, returning `{ isValid, reasons[] }`.
- [ ] Pointer type (additive): `lastGoodSnapshotIds`, `pinnedSnapshotId?`, `lastRun?` in `functions/lib/firestore/index.d.ts` and `app/src/types/firestore.d.ts`.
- [ ] `functions/src/index.ts`: export `refreshSnapshot` (`firebase-functions/v2/scheduler` `onSchedule`, `firebase-functions/params` `defineSecret`), and remove the `hello` placeholder.
- [ ] `functions/tsconfig.json`: include `lib/firestore/index.d.ts`. `package.json`: move `fflate` to dependencies, and declare `@google-cloud/firestore` and `google-auth-library` if the CLI still imports them directly.
- [ ] `functions/src/dev/snapshot-admin.ts` and the `snapshot:status|pin|unpin|rollback` scripts.
- [ ] `app/src/app/core/services/snapshot.service.ts`: resolve the pin, walk `lastGoodSnapshotIds`, and expose `lastRun`.
- [ ] `dt-snapshot-badge`: change it to "Grid data from Oct 27 · refreshes daily 3 p.m.". When pinned, show "Pinned for demo". When the last run was rejected or failed, show "Showing last good data (Oct 27)" in a quiet warning tone, never an error.
- [ ] Dry run locally (`yarn --cwd functions ingest --dry-run`), then a real CLI run that exercises validate + flip, then `yarn --cwd functions build` cleanly.
- [ ] **You:** `firebase deploy --only functions`. This needs the Blaze plan; the Cloud Scheduler API turns on automatically. Then trigger it once from the Cloud Scheduler console ("Force run") and check `snapshot:status`.
- [ ] **Demo day:** run `snapshot:pin` after the Wednesday 3 p.m. run succeeds, so nothing moves during the 5–6 p.m. judging.

---

## Part B — Clarity and the "road report" redesign

Built with the `frontend-design` skill, plus the `dataviz` skill for chart colors. Read `rules/ui.md`, `rules/scss.md` and `rules/angular.md` first. Changes are copy, layout and presentation only. The LP, backtest and signal math stay untouched.

### Design system: road report

The traffic metaphor is in the copy (per the brief), and now in the typography and the signage colors, never in literal maps.

| Token | Hex | Role |
|---|---|---|
| `--dt-ink` (asphalt) | `#1B2430` | Text, site load (no storage) line, axes |
| `--dt-paper` (salt flat) | `#F2F4F3` | Page background (cool, not cream) |
| `--dt-panel` | `#FFFFFF` | Chart and table panels |
| `--dt-line` | `#D5DBDD` | Rules, panel borders, grid lines |
| `--dt-muted` | `#5A6672` | Secondary text, PACE's own forecast (dashed) |
| `--dt-rush` (detour orange) | `#F28500` | **Rush hour only**: a 45° striped band on every chart, plus the wordmark plate |
| `--dt-clear` (guide-sign green) | `#0E6B4E` | Savings, grid draw with DETOUR |
| `--dt-spin` | `#1495C7` | Nova Spin flywheel, on every chart |
| `--dt-pulse` | `#6A4BD6` | Nova Pulse battery, on every chart |
| `--dt-price` ramp | `#DCE6F5 → #24477F` | Price clock heat strip, price lines |
| `--dt-carbon` ramp | `#EFE6E1 → #6E4A3B` | Carbon clock heat strip, marginal CO2 lines |
| `--dt-alert` | `#C4302B` | Errors only (no longer doubles as "rush hour") |

Run the palette through the dataviz validator during implementation, and check contrast on `--dt-muted` and on orange text over paper.

- **Type:** Overpass, the open-source descendant of the US interstate-sign typeface Highway Gothic, from Google Fonts, weights 400, 600 and 800. One family throughout, with `font-variant-numeric: tabular-nums` on every number. Scale (1.25): 13 / 15 / 17 / 21 / 27 / 34 / 42 px. Drop Inter and IBM Plex Mono.
- **Avoid:** no uppercase tracked eyebrows (the tile labels today are all caps), no monospace data labels, no gradient washes, and no cards nested in cards. The Traffic charts currently sit in a card inside a card.
- **Hierarchy through radius and weight, not boxes:**
  - Page sections are separated by whitespace and a thin `--dt-line` rule.
  - Charts sit on white panels with a 12 px radius.
  - Chips and toggles use an 8 px or pill radius.
  - Only the hero and the lead number are unboxed and large.
- **The one bold element: the three-clocks strip.** Bill, price and carbon run as three thin heat lanes over 24 hours, with the orange striped rush-hour band cutting through all three. It is the hero on Start here and the header graphic on Plan. The same striped band repeats on every time chart, so "orange stripes = rush hour" is learned once and read everywhere.
- **Motion:** one moment only. On a Plan re-solve, the grid-draw area morphs to its new shape over about 300 ms. No entrance animations. Respect `prefers-reduced-motion`.
- **Strategy names, unified everywhere** (today four different names are in use):
  - **No storage**, the baseline
  - **Simple shaver**, today's "naive"
  - **DETOUR**, the rolling day-ahead LP
  - **Perfect hindsight**, today's oracle (the glossary entry gives "oracle")

  "Share of the oracle" becomes **"Capture rate"**.

### Information architecture

```
DETOUR ▸   Start here   ① Tomorrow's grid   ② Tomorrow's plan   ③ July's proof       [Grid data Oct 27 · daily 3 p.m.]
```

- The nav is a sequence, so the numbered markers are justified: forecast → decision → proof. Each step has a one-line description under its label on desktop. On mobile it is a horizontal scroller.
- `''` routes to a new **Start here** page instead of redirecting to `traffic`.
- **Every screen follows the same skeleton:**
  1. **Question:** the H1 is the question the screen answers, for example "When is the grid jammed tomorrow?"
  2. **Answer:** one or two plain sentences, generated from the data. This is the takeaway.
  3. **Main visuals**, each with a title, a one-to-two line "What to notice" caption *under* the title, and an ⓘ button that opens a how-to-read panel.
  4. **Under the hood:** one collapsed section holding method, scoring tables, sources and the LP text.
- The SIMULATED badge appears once per screen, in the header, next to the snapshot badge, and on simulated charts as a small corner tag. It is no longer repeated four times on Backtest.

### Shared pieces (`app/src/app/shared/`)

- [ ] `glossary/glossary.constants.ts`: one entry per term with `term`, `short` (one plain sentence) and `long` (2–3 sentences plus "why it matters here"). Seed it from `brief/brief.md` §9 and add the terms the audit found undefined:
  - Grid and market: PACE, EDAM, LMP, net load, MAPE, bias, P10–P90, marginal vs average CO2, import band
  - Bill: Schedule 6, Schedule 8, on-peak demand, facilities charge, riders, billed demand, peak so far
  - Plan and assets: CO2 weight, Wattsmart, reserve floor, SOC, Nova Spin, Nova Pulse, equivalent full cycles, LP, HiGHS
  - Backtest: simple shaver, perfect hindsight, capture rate
- [ ] `components/term/` (`dt-term`): inline jargon with a dotted underline. Hover or focus shows the `short` text in a CDK overlay popover; tap opens it on mobile. A "More" link opens the side panel with the `long` text. Keyboard accessible.
- [ ] `components/side-panel/` (`dt-side-panel`): the component `[UI-07–10]` asks for but that doesn't exist yet. It slides in from the right on desktop and is a bottom sheet at 768 px and below. It hosts glossary entries and the chart how-to-read panels.
- [ ] `components/chart-frame/` (`dt-chart-frame`): wraps every chart with a title, a "What to notice" slot, an ⓘ button that opens a how-to-read panel (axes, each color, the striped band, what "good" looks like), an optional SIMULATED corner tag, and the white panel. Replaces the hint-above-title pattern in all three screens.
- [ ] `components/figure/` (`dt-figure`): one shared KPI figure with a big tabular number, a plain label in sentence case, an optional `dt-term`, and a source chip. Replaces `dt-traffic__tiles`, `plan__tiles` and `dt-backtest__tiles`.
- [ ] `components/source-chip/` (`dt-source-chip`): one provenance chip that replaces the four per-screen chip styles.
- [ ] `components/under-the-hood/` (`dt-under-the-hood`): a collapsed section wrapper.
- [ ] `components/three-clocks/`: lift `dt-clock-bands` out of `plan/components/` into shared, with the new tokens and the striped rush-hour band, so Start here and Plan both use it. Move the chart scaffolding (`_chart-common.scss`, `chart.helper.ts`, `chart.constants.ts`) to `shared/charts/`.
- [ ] `styles.scss` and `tailwind.config.js`: the new tokens with the old `--dt-theme--*` names aliased so nothing breaks mid-migration. Merge the `--dt-viz-*` tokens into the same set (today the chart greys are warm and the UI greys cool). Load the Overpass font, and make the Material theme typography use it.

### Screens

- [ ] **App shell** (`app.component.*`, `app.routes.ts`, `app.constants.ts`):
  - Wordmark set in Overpass 800 on a small orange sign plate.
  - The numbered step nav.
  - Snapshot and SIMULATED badges together on the right.
  - Footer: "Simulated Torus Station. Grid data is real and public; site loads and asset figures are simulated or assumed."
- [ ] **Start here** (new `app/src/app/start/`):
  - **Headline:** "The grid has a rush hour. DETOUR plans a Torus Station around it."
  - **One sentence of hook:** "One kW of summer on-peak demand costs $16.84 a month, as much as shifting about 550 kWh. The bill, the grid price and the carbon all disagree on when that is." The numbers come from `plan.helper.ts`.
  - **Tomorrow's three-clocks strip**, with "Rush hour tomorrow: {window}" generated from the traffic helpers.
  - **The three steps as a route.** Each step shows what it answers and one live number, where it is cheap to compute: the rush-hour window from Traffic, and the July saving from the backtest if it is already computed, otherwise a description. Each has an "Open" link.
  - **"Six words to know":** PACE, rush hour, demand charge, marginal CO2, Spin vs Pulse, capture rate, each a `dt-term`.
- [ ] **① Tomorrow's grid** (`traffic.component.*`, `traffic.helper.ts`, `traffic.constants.ts`):
  - **H1:** "When is the grid jammed tomorrow?"
  - **Answer:** the current insight, rewritten to two sentences. The forecast-miss and rank sentences move into their own sections.
  - **Three charts, each in a `dt-chart-frame`:**
    - **Grid stress:** default to tomorrow plus one day of context. The two-days-back actuals sit behind a "Show last 3 days" toggle. The P10–P90 band is on by default and our forecast is a toggle.
    - **Price.**
    - **Carbon:** the 95% intervals and the import band move into the how-to-read panel, plus a "Show uncertainty" toggle.
  - **What to notice:** one generated line per chart.
  - "Can we beat PACE's own forecast?" stays as a short section: the verdict and one comparison figure row, with the scoring table under the hood.
  - The average-vs-marginal slope chart stays, with a better caption.
  - "How the carbon number is made", the forecast method and sources go under the hood.
- [ ] **② Tomorrow's plan** (`plan.component.*`, `plan.helper.ts`, `plan.constants.ts`):
  - **H1:** "What should the Torus Station do tomorrow?"
  - **Answer:** "Plan for {site}: the grid draw drops out of rush hour and the bill falls ${x} (48 h). Spin takes the short spikes; Pulse holds the energy."
  - **Desktop: two columns.**
    - A sticky **"Dials" rail** (about 300 px): site, day, tariff, demand already set, CO2 weight and Wattsmart reserve. Each dial label is a `dt-term` with a one-line effect hint.
    - **Results** on the right: the four figures, then the three-clocks strip, then load vs grid draw, then station dispatch, then the bill line by line.
  - **Mobile:** the dials go in a collapsible panel above the results, with a summary like "Airport · Schedule 8 · CO2 $0.10".
  - Rename the figures: "Bill change (48 h)", "CO2 change", "Moved out of rush hour" (was "Traffic avoided"), "Held for Wattsmart".
  - The empty state says "Grid data isn't loaded yet. Refresh in a minute." with no developer copy.
  - The LP text and the Torus Station spec table go under the hood.
- [ ] **③ July's proof** (`backtest.component.*`, `backtest.helper.ts`, `backtest.constants.ts`):
  - **H1:** "Would it have paid off last July?"
  - **Answer:** split the four-metric sentence into one sentence plus four big figures: saved, share from the demand charge, capture rate, kWh held for Wattsmart. The secondary figures go in a smaller row.
  - **Month calendar:** check the scaling. Every bar currently renders the same height, so scale them to the actual daily peak against the month max, and say what to notice: "One 15-minute interval on Jul 2 set the whole month's demand charge."
  - Use the unified strategy names and one consistent four-color strategy legend across the component bars and the cycles section.
  - Add a caption to the cycles section saying whether the numbers are good or bad: "Small is good: July used under 1% of either machine's life."
  - "{date} up close" stays.
  - Sources go under the hood.
  - Move the site and schedule controls into a labeled row ("Site", "Rate plan"), with `dt-term` on the schedule.
- [ ] **Copy sweep:**
  - Remove internal jargon: "phase 03 window", "pending LP (phase 02)", "Run the ingest script", "Run the weather ingest".
  - Sentence case everywhere.
  - Every abbreviation is spelled out or wrapped in a `dt-term` on first use per screen.
- [ ] **States:** each screen keeps a loading, an empty and an error state, restyled with the new tokens. The loading copy says what is being read in plain words.

### Verification

- [ ] `yarn --cwd app build` passes. The existing specs still pass (`yarn --cwd app test`); do not delete them, per `[HACK-09]`.
- [ ] Before and after screenshots of all four routes at 1440 px and 375 px. The playwright-core script in the session scratchpad (`shot.mjs`) captures them. No horizontal scroll at 375 px.
- [ ] Walk the demo path (`[HACK-11]`):
  1. Start here.
  2. Tomorrow's grid: open one ⓘ panel and one term popover.
  3. Tomorrow's plan: drag CO2 and reserve, toggle Schedule 6/8, and watch the re-solve.
  4. July's proof: read the lead figures and the peak day.
  5. Under the hood: LP text.
- [ ] Keyboard: tab reaches every term, ⓘ and dial, with visible focus.

## Done when

- [ ] `refreshSnapshot` is deployed, has run once from Cloud Scheduler, and `snapshot:status` shows `lastRun.status = flipped` with a new target date.
- [ ] Pin and rollback each tested once against Firestore.
- [ ] A first-time viewer can say, from Start here alone, what the three screens are and what "rush hour" means. Every jargon word on the demo path has a term popover.
- [ ] The demo path step works in the running app, desktop and phone.
- [ ] Committed and PR opened (squash merge).
