# Hard Tech Week 2026 Hackathon — Working Context

**Event:** Hard Tech Hackathon, Hard Tech Week 2026 (47G + Utah Tech Week) · kickoff Mon Oct 26 4–5 PM, build Mon–Wed · Aernata, 250 E 200 S Ste 320, Salt Lake City
**Format:** Solo · ~42 build hours · present to sponsor judges Wed Oct 28 5–6 PM (one-on-one per the talk; no official time limit published — target under 5 minutes) · winners announced Thu Oct 29, 9:15 AM, Zero Gravity Summit main stage
**Event judges (kickoff deck):** Ryan Byrd (former CTO of Entrata, Aptive and Pattern) · Angela Smith (COO, Nucleus Fund) · Nicole Witmyer (Strategic Events Leader, Torus) · Scott Holley (Executive Director, Lassonde Center, U of U) · Tanner Potter (Partner, Kickstart). "Each sponsor defines what winning looks like" — the Torus bounty is judged by Torus. Don't assume a grid engineer is in the room: the insight has to land for a non-specialist too
**Prize:** Torus bounty, $5,000 · **Option 1: Rush Hour for Electrons**

---

## 1. The problem in one paragraph

The grid has a rush hour: demand spikes, prices jump, solar fades, and most software ignores it. Torus sells hybrid storage (Nova Spin flywheel + Nova Pulse LFP battery) that sits behind the meter at Utah commercial and industrial sites. Customers use it daily to cut demand charges, and Rocky Mountain Power dispatches it for Wattsmart demand-response events. A Torus site lives on three clocks that disagree: the customer's demand-charge clock (one 15-minute spike sets the month's bill), the grid's price clock (PACE day-ahead prices go negative midday since EDAM went live on May 1, 2026), and the carbon clock (marginal, not average, emissions). On top of that, a Wattsmart call can drain the battery right before the customer's own peak. No public tool plans tomorrow for a Utah site across all of these at once.

## 2. The pitch (one sentence)

**DETOUR** reads tomorrow's real PACE traffic report and plans a labeled, simulated Torus Station around it: one optimization that cuts the customer's Rocky Mountain Power bill, avoids dirty marginal hours and keeps enough charge in reserve for a Wattsmart call, then proves the savings against a naive peak-shaver and a perfect-foresight oracle.

## 3. Judging rubric — everything follows from this

No weights published. Official card: **creativity, clarity of insight, and execution**. Card also says: "We care more about engineering skill and creativity." Live talk: judged on "creativity, technical complexity, and a complete solution," and "the more technical and insightful you can go, the better." The card is the written rule; the talk version says the same thing with more emphasis on depth.

| Criterion | Weight | How to win it |
|-----------|--------|---------------|
| Creativity | — | Not the crowded "run your dishwasher when it's green" app. A planning layer for Torus's own hardware on real Utah tariffs, with the traffic/detour metaphor in the copy only |
| Clarity of insight | — | Lead with "three clocks that disagree": $16.84/kW-month on-peak demand vs a 3.1¢/kWh shift spread. The flywheel absorbs short spikes at ~⅓ the wear of LFP, freeing the battery to hold the Wattsmart reserve. Marginal vs average CO2 ranks hours differently |
| Execution | — | A working pipeline (forecast → signal → decision → proof) on a public URL. Live LP re-solve in the browser. Every number traces to a tariff line, an EIA series or a constraint. Honest benchmarks: capture rate vs oracle, forecast error vs PACE's own day-ahead forecast |

## 4. Hard requirements

From the bounty card:

- Build software that knows when the grid is jammed and stays out of traffic
- Free and open-source data only
- Simulated data is fine if labeled

Self-imposed:

- Every synthetic chart carries a "SIMULATED — seed 42" badge
- Never call an upstream API live during the demo — serve a cached, frozen snapshot with its pull date shown

## 5. Data provided

No files provided. The card suggests EIA · CAISO · ERCOT · Open-Meteo · Electricity Maps. All sources are free and public; see `research/torus-option-1-build-brief.md` §3 for access and limits.

- **EIA API v2 / EIA-930** — PACE hourly demand, PACE's own day-ahead forecast, generation by fuel, interchange. Free key. UTC hour-ending, paginates at 5,000 rows
- **CAISO OASIS** — PACE EDAM day-ahead prices (`ELAP_PACE-APND`). No auth, zipped CSV, 31 days per request
- **Open-Meteo** — forecast, historical, previous-runs weather and solar for Wasatch Front points. No auth
- **Rocky Mountain Power Utah price summary** — Schedules 6, 8, 9 (effective Sept 25, 2026, base rates)
- **Skip:** ERCOT (irrelevant to Utah), Electricity Maps and WattTime (free tiers too narrow)
- Reference material: `brief/torus-bounty.md`, `research/`

## 6. Scope

### Must have (demo path)

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

### Nice to have

- Ridge net-load forecast with P10/P90 vs PACE's forecast and seasonal naive (move up if the core is done by hour 24)
- Wattsmart event-probability model
- Schedule 9
- One-minute sub-simulation of a single spike showing the flywheel response
- LLM-written plain-English "tomorrow's briefing" from the deterministic outputs

### Explicitly out of scope

- Feeder or substation heat maps (no public data)
- Literal routing maps
- LLM agents that "bid" or "negotiate" (Utah C&I customers pay tariffs, not LMPs)
- LSTM, transformer or Prophet forecasters
- Electricity Maps, WattTime or ERCOT integrations
- User accounts or auth, mobile apps, hardware or IEEE 2030.5 mocks
- Any claim about real Torus customer savings or Lattice internals

## 7. Demo script

1. **0:00–0:30, hook.** "$16.84 vs 3.1¢." One kW of summer on-peak demand costs as much as shifting ~550 kWh. The money is in demand charges, and the grid, the bill and the carbon disagree on when to act.
2. **0:30–1:30, Traffic Report.** Tomorrow's PACE stress forecast against PACE's own day-ahead forecast, the EDAM price trough and evening ramp, marginal CO2 with its interval.
3. **1:30–3:30, Plan.** Drag the CO2 weight or the Wattsmart reserve slider and watch the LP re-solve live. Toggle Schedule 6 vs 8 and show the demand window logic change. Point out Spin taking the short spikes.
4. **3:30–4:30, Backtest.** Naive vs DETOUR vs oracle over a month. Lead number: "$X saved on a simulated 2 MW Schedule 8 site, Y% from the demand charge, Z% of the perfect-foresight optimum, with N kWh held for Wattsmart."
5. **4:30–5:00, close.** "This is the planning layer that sits on top of Lattice's real-time control." Show the generated LP text and architecture for 10 seconds each.

## 8. AI approach

The forecast, the emission factor, the tariff engine and the optimization are all deterministic code. Do not say "AI-powered." An LLM sits at the edges only:

- **In:** optional — turn "I run a 1 MW cold storage site in Ogden, flexible 4 hours a night" into structured site parameters
- **Out:** a plain-English "tomorrow's briefing" paragraph generated from the deterministic outputs

## 9. Glossary

- **PACE** — PacifiCorp East, the balancing authority covering Utah, Wyoming and Idaho. PacifiCorp is a vertically integrated utility, not an ISO
- **Balancing authority (BA)** — balances supply and demand in its footprint; an ISO/RTO also runs markets
- **EDAM** — CAISO's Extended Day-Ahead Market; PacifiCorp went live May 1, 2026. Tomorrow's PACE prices are public before the day starts. Wholesale only — not passed to Utah retail customers
- **WEIM** — Western Energy Imbalance Market, 5-minute real-time market PacifiCorp has been in since 2014
- **LMP** — locational marginal price = energy + congestion + losses (+ GHG in CAISO)
- **EIA-930** — EIA's hourly BA operations data. Near real time and revised, not real time
- **Net load** — load minus wind and solar. Drives the evening ramp
- **Duck curve** — midday solar depresses net load; the evening ramp as solar fades is the expensive, stressful period
- **Demand charge** — $/kW on the highest 15-minute interval in the month. Schedule 6 bills any hour; Schedules 8/9 bill only the on-peak window
- **Energy charge** — $/kWh, sometimes time-of-use
- **Peak-so-far** — the month's existing billed peak; no value in shaving below it
- **Marginal emissions (MEF)** — CO2 change from one more MWh; correct for load-shifting decisions. **Average intensity** is for Scope 2 accounting
- **Wattsmart** — Rocky Mountain Power's battery demand-response program; Torus is an approved provider
- **Nova Spin** — Torus flywheel: high power, minutes of energy, ~25,000 cycles
- **Nova Pulse** — Torus LFP battery: duration, ~7,500 cycles
- **Lattice** — Torus's energy management software, "the smart traffic controller"
- **Capture rate** — realized savings ÷ perfect-foresight savings
- **Congestion** — a line, transformer or path at its limit. Torus's "rush hour" is mostly local peak loading plus system peak, relieved from the customer side of the meter

## 10. Open questions

- Facilities-charge measurement and the exact Schedule 8 demand interval in the full tariff sheets (rates are base rates; riders add on top)
- Exact EIA-930 respondent list — pull the facet list from route metadata
- Flywheel efficiency, self-discharge, Pulse C-rate and replacement costs are not published — label them as assumptions
- Whether the demo room has reliable wifi — assume it does not
