# General Plan

**Demo path (one sentence):** On the public URL, the Traffic Report shows tomorrow's real PACE rush hour (load vs PACE's own forecast, EDAM price, marginal CO2); the Plan screen re-solves the LP live as the judge drags the CO2 weight or Wattsmart reserve and toggles Schedule 6 vs 8, showing Spin taking the spikes and the grid draw dropping out of the rush-hour band; the Backtest proves July's savings against a naive shaver and a perfect-foresight oracle; we close on the generated LP text and the architecture.

## Phases

| # | Phase | Blocking? | Can run in parallel with | Plan file | Status |
|---|-------|-----------|--------------------------|-----------|--------|
| 00 | Angular skeleton + Firebase project (branch `chore/firebase-setup`, separate session) | Yes — 01 branches from it | — | — | In progress |
| 01 | Foundation: frozen data snapshot, tariff engine, seeded sites, shared types, three routes | **Yes — everything after it waits on this** | — | `phase-01-foundation.md` | Not started |
| 02 | LP engine + Plan ("Three Clocks") screen | No | 03, 04 | `phase-02-plan.md` | Not started |
| 03 | Grid signals (marginal CO2, PACE forecast score) + Traffic Report screen | No | 02, 04 | `phase-03-traffic.md` | In progress |
| 04 | Month backtest + Backtest screen | No | 02, 03 (rolling LP and oracle plug in once 02 merges) | `phase-04-backtest.md` | Not started |
| 05 | Stretch: our own PACE net-load forecast vs PACE's day-ahead forecast | No — only if the demo path works end to end by hour 24 | 04 (starts after 03 merges, same screen) | `phase-05-forecast.md` | Not started |
| 06 | Last mile: re-freeze tomorrow, audit, persona reviews, UI polish, rehearsal | — | — | — | Not started |

### Phase scope

- **01 Foundation (blocking).** Start with a 30-minute verification pass: EIA-930 respondent facet includes PACE; tomorrow's DF is present in the API; the OASIS EDAM query for PACE returns prices; Torus's public Spin/Pulse figures (power, duration, cycle life) so the labeled assumptions match the spec sheet; Schedule 8's demand interval and facilities-charge measurement. Then: one local ingest script pulls the sources in the Data snapshot section and writes a frozen snapshot to Firestore with a pull-date manifest; the app reads it once at load. UTC → America/Denver, DST and implausibility filtering happen here, once. Tariff engine for Schedules 6 and 8: billing determinants, on-peak masks, peak-so-far, bill by component, with a hand-checked day. Three seeded, labeled site archetypes (cement plant, airport, ski resort) and the Spin/Pulse parameters as labeled assumptions. Shared contracts every later phase codes against: snapshot, tariff, site, asset, plan request/result, MEF series, provenance. Three empty routes, the SIMULATED and snapshot-date badges, deployed to the public URL. **Assumed in place from branch `chore/firebase-setup` (not this phase's work):** the Angular 21 skeleton in `/app` (project `detour`, Material + SCSS + Tailwind 3, theme vars `--dt-theme--*`), Firebase project, Hosting at https://hard-tech-week-2026-torus.web.app, Firestore in `us-central1`, `/functions` scaffold, anonymous auth at boot. Firestore rules are signed-in read / no client writes, so 01 must confirm Anonymous sign-in is enabled in the console before the snapshot is readable; fallback is public read on the snapshot collection (the data is public anyway). *Traces to:* execution ("every number traces to a tariff line, an EIA series or a constraint"), the hard requirements, every demo beat.
- **02 LP + Plan.** LP text generated in TypeScript and solved in the browser with highs-js, 48 hours in 15-minute steps: tariff energy, on-peak demand with peak-so-far, marginal CO2, Spin/Pulse degradation, battery ramp limit, Wattsmart reserve, terminal SOC. Plan screen: the hook sentence as the header, site load before and after, Spin vs Pulse stacked, the three clocks as labeled bands on one chart, sliders for CO2 weight, Wattsmart reserve and Schedule 6/8 with live re-solve, the traffic-avoided number, a date picker (real tomorrow, July 2026 peak day), and a view of the generated LP text. *Traces to:* demo 1:30–3:30 and 4:30 close; creativity (planning layer for Torus hardware); clarity (flywheel takes short spikes, battery holds the reserve).
- **03 Signals + Traffic Report.** Siler-Evans first-difference MEF by hour × season with confidence intervals, run both ways (Δ fossil generation and Δ demand) with the gap shown as the import band. PACE's own DF scored against actuals over the snapshot window (MAPE, peak-hour under-forecast rate). Traffic Report: tomorrow's PACE load and net load with PACE's DF overlay, EDAM day-ahead price, MEF by hour with its interval, the rush-hour band where stress, price and carbon coincide, and a marginal-vs-average hour ranking. *Traces to:* demo 0:30–1:30; clarity (marginal vs average rank hours differently); execution (forecast error vs PACE's DF).
- **04 Backtest.** July 2026, three strategies: naive threshold shaver, rolling daily LP with peak-so-far, perfect-foresight monthly oracle. Capture rate. Screen: month calendar with the 15-minute interval that set the peak, $ by component, capture rate, cycles on Pulse vs Spin, kWh held for Wattsmart, traffic avoided. Produces the lead number. Built first against 01's contracts with the naive shaver; the LP strategies drop in when 02 merges. *Traces to:* demo 3:30–4:30; execution (honest benchmark: capture rate vs oracle); Torus's own open question (the dollar value of a unit).
- **05 Forecast (stretch).** Ridge net-load forecast with P10/P90 from empirical residual quantiles, trained on Open-Meteo previous-run forecasts (not observed weather), scored against PACE's DF and a seasonal naive. Added to the Traffic Report. *Traces to:* execution ("forecast error vs PACE's own day-ahead forecast"). If cut, 03's PACE-DF score still covers the benchmark line.
- **06 Last mile.** Wednesday ~1:30 p.m.: re-run the ingest for tomorrow's DF and EDAM prices, redeploy, keep the Tuesday snapshot as the fallback. Requirements audit in a fresh session (`prompts/05-audit.md`), persona reviews including Torus (`prompts/06-persona-review.md`), 2–3 hours of UI polish, phones not broken, README with live link and demo flow, architecture view for the close. Rehearse under 5 minutes with the "likely Torus questions" from the research as the Q&A drill. *Traces to:* execution and the demo path.

**Cross-cutting:** every $, kW and CO2 figure shows its source (tariff line, EIA series, constraint or labeled assumption). Every synthetic chart carries the SIMULATED badge. Every screen shows the snapshot pull date. Nothing on the demo path calls an upstream API.

**Gates:** 00 (`chore/firebase-setup`) merged before 01 starts. 01 merged and the first snapshot frozen before any other phase starts. Demo path end to end (all three screens with real numbers) by hour 24, or 05 is cut. Wednesday-afternoon re-freeze is the last data change. 06 starts no later than Wednesday morning.

## Data snapshot

Pulled once by the ingest script, frozen, pull date shown on every screen. Free and public only.

| Source | Series | Range | Feeds |
|---|---|---|---|
| EIA-930 (API v2, free key) | PACE demand, day-ahead forecast, net generation, total interchange | 2 years hourly, plus tomorrow's DF | 03 Traffic, 03 DF score, 05 forecast, backtest calendar context |
| EIA-930 (API v2) | PACE generation by fuel type | 2 years hourly | 03 MEF regression, Traffic net load |
| CAISO OASIS (no auth) | PACE EDAM day-ahead price (`ELAP_PACE-APND`), 31-day chunks | May 1, 2026 → tomorrow | 03 Traffic price curve, 04 backtest stress overlay |
| Open-Meteo (no auth) | Previous-runs day-ahead temperature and GHI, 3–5 Wasatch Front points | 2 years hourly | 05 forecast only — drop from 01 if it runs long and pull it in 05 |
| RMP Utah price summary (Sept 25, 2026) | Schedules 6 and 8 base rates and on-peak windows | — | 01 tariff engine (labeled "base rates, riders excluded") |
| Seeded generator | Three site archetypes, Spin/Pulse parameters | July 2026 and the demo day | 02, 04 (labeled SIMULATED, seed 42) |

Known traps handled in 01: EIA is UTC hour-ending and paginates at 5,000 rows; OASIS returns zipped CSV; DST days have 92 or 100 intervals; filter forecast/demand outside [½, 2]; check solar-series continuity around July 2024; EIA-930 is revised, so the pull date is part of the data.

## Decisions

- **Snapshot lives in Firestore**, written once by a local ingest script (admin SDK) and read by the app at load. No Cloud Functions on the demo path. The EIA key lives only in the local `.env` for the ingest script.
- **Backtest month is July 2026** (summer rates, EDAM prices exist, PACE's forecast peak).
- **"Tomorrow" is real** (Oct 29, re-frozen Wednesday afternoon). The Plan screen's date picker also carries a July 2026 peak day so the summer hook and the demand-window toggle show their full effect.
- **The LP solves in the browser.** No server round trip for the live re-solve.
- **No LLM on the demo path.** All four engines are deterministic; nothing says "AI-powered."

## Requirements from the brief

### Hard requirements (§4)

From the bounty card:

- Build software that knows when the grid is jammed and stays out of traffic
- Free and open-source data only
- Simulated data is fine if labeled

Self-imposed:

- Every synthetic chart carries a "SIMULATED — seed 42" badge
- Never call an upstream API live during the demo — serve a cached, frozen snapshot with its pull date shown

### Must have (§6)

1. EIA-930 PACE ingestion (demand, day-ahead forecast, fuel mix, interchange) with UTC → America/Denver, DST and implausibility filtering
2. Tariff engine for Schedules 6 and 8: billing determinants, on-peak masks, peak-so-far
3. Synthetic site generator: three seeded, labeled archetypes (cement plant, airport, ski resort)
4. LP builder (LP text) + highs-js solve: 48-hour horizon, 15-minute steps, tariff energy + on-peak demand + marginal CO2 + Spin/Pulse degradation + Wattsmart reserve
5. Month backtest: naive threshold shaver vs rolling daily LP vs perfect-foresight oracle, with capture rate
6. Marginal emissions regression (Siler-Evans first difference) by hour × season, with confidence intervals
7. Three screens deployed to a public URL:
   - **Traffic Report** — tomorrow's PACE load/net load, PACE's own forecast overlay, EDAM price, marginal CO2 by hour, the "rush hour" band
   - **Plan ("Three Clocks")** — site load before and after, Spin vs Pulse stacked, tariff window, sliders for CO2 weight, Wattsmart reserve and Schedule 6/8, live re-solve
   - **Backtest** — month calendar with the interval that set the peak, $ by component, capture rate, cycles on Pulse vs Spin

### Rubric — "How to win it" (§3)

- Creativity: Not the crowded "run your dishwasher when it's green" app. A planning layer for Torus's own hardware on real Utah tariffs, with the traffic/detour metaphor in the copy only
- Clarity of insight: Lead with "three clocks that disagree": $16.84/kW-month on-peak demand vs a 3.1¢/kWh shift spread. The flywheel absorbs short spikes at ~⅓ the wear of LFP, freeing the battery to hold the Wattsmart reserve. Marginal vs average CO2 ranks hours differently
- Execution: A working pipeline (forecast → signal → decision → proof) on a public URL. Live LP re-solve in the browser. Every number traces to a tariff line, an EIA series or a constraint. Honest benchmarks: capture rate vs oracle, forecast error vs PACE's own day-ahead forecast
- Don't assume a grid engineer is in the room: the insight has to land for a non-specialist too

### Demo (§7) and AI approach (§8)

- Lead number: "$X saved on a simulated 2 MW Schedule 8 site, Y% from the demand charge, Z% of the perfect-foresight optimum, with N kWh held for Wattsmart."
- Show the generated LP text and architecture for 10 seconds each.
- target under 5 minutes
- The forecast, the emission factor, the tariff engine and the optimization are all deterministic code. Do not say "AI-powered."

## Cut on purpose

From the brief's out-of-scope list (§6), cut because the brief says so:

- Feeder or substation heat maps — no public data
- Literal routing maps — the metaphor lives in the copy only
- LLM agents that "bid" or "negotiate" — Utah C&I customers pay tariffs, not LMPs
- LSTM, transformer or Prophet forecasters — a transparent model judges can question beats a black box
- Electricity Maps, WattTime or ERCOT integrations — free tiers too narrow or irrelevant to Utah
- User accounts or auth, mobile apps, hardware or IEEE 2030.5 mocks — nothing on the demo path needs them
- Any claim about real Torus customer savings or Lattice internals — we have neither

Our own cuts:

- **Cloud Functions on the demo path** — the snapshot is read straight from Firestore and the LP solves in the browser, so no function sits between the judge and a number
- **Live or scheduled data refresh** — the demo serves a frozen snapshot by rule; the only refresh is the hand-run Wednesday re-freeze
- **Wattsmart event-probability model** — the reserve slider already demos the constraint and the trade-off; a probability model we can't validate in 42 hours adds a number we can't defend
- **Schedule 9** — same on-peak logic as Schedule 8 with different rates; adds no new insight to the 6-vs-8 toggle
- **One-minute flywheel sub-simulation** — the Spin vs Pulse stack plus the battery ramp limit already shows the hybrid split at 15 minutes; sub-second control is Lattice's job, not ours
- **LLM "tomorrow's briefing" and LLM site intake** — not in the demo script; adds a Cloud Function, a secret and a live failure mode, and the presenter delivers the insight in person
- **Pareto-frontier and "greenest hour" screens** — the CO2-weight slider shows the trade-off live, and the marginal-vs-average ranking sits on the Traffic Report
- **Flexible-load shifting, grid export, Schedule 137 net billing** — not in the brief's LP terms; the storage dispatch alone carries the story
- **Monthly value-function demand optimization** — peak-so-far in a rolling daily LP is the realistic case; the value function is a "future work" line at the close
- **Extra Torus research** — `research/` §2 already covers the company, customers, Wattsmart and the Lattice framing; the 30-minute verification pass in 01 is the only addition
- **Test suites** — a handful of sanity checks on the tariff and LP math only (battery off equals the baseline bill, DST day has 92 or 100 intervals, SOC within bounds), because a wrong dollar figure in front of a Torus engineer is fatal (`[HACK-10]`)
