# Phase 01 — Foundation

**Goal:** A frozen, provenance-tagged PACE snapshot in Firestore, a Schedule 6/8 tariff engine, three seeded site archetypes with Spin/Pulse assumptions, and the shared contracts, shown on three routes running locally.
**Brief requirements covered:** §6 must-have 1 (EIA-930 ingest, UTC→America/Denver, DST, implausibility filter), 2 (tariff engine 6 & 8), 3 (three seeded archetypes), 7 (three screens, shells only; deploy deferred, local runs for now); §4 SIMULATED badge, frozen snapshot with pull date.
**Depends on:** 00 (merged on main).

## Checklist

### Verification pass (before ingest code)
- [x] EIA DF for tomorrow: query region-data `type=DF`, respondent PACE, `end` = tomorrow. Record the latest UTC row. If tomorrow is missing, use the OASIS `SLD_FCST` DAM PACE forecast (`SYS_FCST_DA_MW`) and label it in provenance
- [x] OASIS `PRC_LMP` DAM `ELAP_PACE-APND`: hourly, zipped CSV, GMT columns. Tomorrow posts ~2 p.m. MT
- [x] Torus public Spin/Pulse figures (power, duration, 10C, 7,500 / 25,000 cycles), with URLs. Anything unpublished is a labeled assumption
- [x] Schedule 8: demand interval (15-min?), how facilities kW is measured, customer charge, holidays excluded from on-peak, with the tariff-sheet URL
- [x] Record results in a "Verified" list at the bottom of this file

### Shared contracts (first, before parallel work)
- [x] Firestore docs in `functions/lib/firestore/index.d.ts` and `app/src/types/firestore.d.ts` (`Detour.Firestore.Snapshot.*`): pointer, manifest, grid month, price month, provenance
- [x] App domain contracts in `app/src/app/core/models/`: tariff, site, asset, plan request/result, MEF series, provenance

### Ingest + frozen snapshot
- [x] `functions/src/dev/ingest-snapshot.ts` (tsx, Admin SDK), with the key from `firebase functions:secrets:access EIA_API_KEY`
- [x] EIA region-data (D, DF, NG, TI) + fuel-type-data, PACE, 2 years hourly, paginated at 5,000
- [x] OASIS EDAM price May 1, 2026 → latest, in 31-day chunks
- [x] UTC hour-ending → America/Denver; DF/D ratio outside [½, 2] → null + flag; counts in the manifest
- [x] Writes `snapshots/{id}` + month subdocs, then flips `config/snapshot`, keeping the previous id as the fallback
- [x] Open-Meteo: dropped, moves to 05

### Tariff engine
- [x] Schedules 6 and 8 constants (Sept 25, 2026 base rates, "riders excluded")
- [x] 15-min local-day intervals (92/96/100), on-peak mask, billing determinants, peak-so-far, bill by component with a source per line
- [x] One hand-checked day (numbers recorded below)

### Sites + assets
- [x] Three seeded archetypes (cement plant, airport, ski resort), seed 42, deterministic for any date
- [x] Spin/Pulse parameters, each tagged `torus-spec` or `assumption`

### App
- [x] Shell with nav to `/traffic`, `/plan`, `/backtest`; snapshot-date badge everywhere; SIMULATED — seed 42 badge on synthetic content
- [x] Each route has loading, empty and error states (AlertBanner), and works on a phone

### Sanity checks ([HACK-10], one spec file)
- [x] Battery-off dispatch bill == baseline bill
- [x] Mar 8, 2026 = 92 intervals, Nov 1, 2026 = 100
- [x] Hand-checked day matches the engine

## Done when

- [x] Local (`yarn --cwd app start`): three routes load, the snapshot date shows, the badges show, the snapshot reads from Firestore with no upstream calls
- [ ] Committed and PR opened

## Verified

- **EIA DF:** latest DF row is 2026-10-27T06 UTC (same as "now"); `end=2026-10-29` returns the same row. Tomorrow's DF is not in EIA. **Fallback:** OASIS `SLD_FCST` DAM, `TAC_AREA_NAME=PACE`, `SYS_FCST_DA_MW`, 24 hourly rows for Oct 27 verified; Oct 28 posts ~2 p.m. MT. `dayAheadForecastSource` in the manifest says which source filled the target day, and those hours carry a `df-oasis` flag.
- **EIA PACE facet, OASIS `PRC_LMP` DAM `ELAP_PACE-APND`:** work (hourly, zipped CSV, `*_GMT` columns). OASIS is rate limited (~1 request / 5 s).
- **Tariff mechanics (Utah PSC tariff book P.S.C.U. No. 52, sheets 6.1-6.2 and 8.1-8.3, effective Apr 25, 2025, https://pscdocs.utah.gov/electric/25docs/25035T05/339730Trf5-9-2025.pdf):** demand interval 15 minutes; facilities kW is the greatest 15-minute use at ANY time in the month (all hours, also on Schedule 8); Schedule 8 demand is on-peak only; customer charge $73.00 (Sch 8) / $55.00 (Sch 6); holidays are off-peak (New Year's, Presidents, Memorial, Independence, Pioneer, Labor, Thanksgiving, Christmas; Saturday holiday moves to Friday, Sunday to Monday); on-peak windows match the research doc.
- **Rates mismatch:** the research doc's Sept 25, 2026 price-summary rates are ~3-5% above the April 2025 sheet (Sch 8 summer demand $16.84 vs $16.18, etc.). The engine uses the Sept 25, 2026 rates (newer, and what the brief quotes). The customer charge exists only in the PSC sheet, so it is the April 2025 value; the bill line says so. Both are "base rates, riders excluded".
- **Torus Spin/Pulse:** only Spin's 10C is published (secondary article quoting Torus: https://interestingengineering.com/innovation/flywheel-energy-storage-power-ai-data-centers-grid); Pulse is 4-8 h duration (https://www.ess-news.com/2024/11/26/torus-unveils-flywheel-battery-energy-storage-ai-driven-cybersecurity-solutions/); Wattsmart approval covers 30 kW-1.2 MW systems (BusinessWire, 2025-03-19). Cycle life (25,000 / 7,500), efficiencies, ramp and unit sizes were not found on a primary source: all labeled `assumption`. torus.co spec pages returned no content; worth a manual look.
- **Auth:** anonymous sign-in was not enabled (`auth/configuration-not-found`); initialized Auth and enabled the anonymous provider through the Identity Toolkit admin API. Snapshot reads then work from the app.
- **Deploy:** deferred by decision. One Hosting deploy was done during the build and works; further deploys wait until the last-mile phase.
- **Ingest auth:** ADC is `juan@mindignitestudios.com` (no project access), so the script writes with a `gcloud auth print-access-token --account juan@mindignitegroup.com` token. OASIS rejects 31-day windows, so chunks are 30 days.
- **Snapshot:** `20261027-0652`, target 2026-10-27; re-run `yarn --cwd functions ingest` after ~2 p.m. MT for Oct 28.

## Hand-checked day

Wed 2026-07-15, Simulated Regional Airport (seed 42), Schedule 8, one-day bill (UTC-6, 96 intervals). Recomputed with an independent Python script from the exported 96 intervals; the engine matches to the cent, and the spec asserts these numbers.

| Line | Quantity | Amount |
|---|---|---|
| Customer charge | 1 | $73.00 |
| Facilities | 1,926.2 kW x $5.15 | $9,919.93 |
| On-peak demand (3-10 p.m.) | 1,926.2 kW x $16.84 | $32,437.21 |
| On-peak energy | 10,502.2 kWh x $0.062395 | $655.28 |
| Off-peak energy | 14,936.975 kWh x $0.031714 | $473.71 |
| **Total** | | **$43,559.13** |
