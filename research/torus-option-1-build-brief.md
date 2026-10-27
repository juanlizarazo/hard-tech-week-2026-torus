# Torus Bounty, Option 1: "Rush Hour for Electrons"
## Build brief for Hard Tech Week Hackathon, Salt Lake City

**Bounty:** $5,000 (one bounty, two prompt options, pick one)
**Build window:** Mon Oct 26 ~5pm to Wed Oct 28 5pm
**Judging:** Wed Oct 28, 5:00 to 6:00 PM, demo one on one to Torus judges
**Winners announced:** Thu Oct 29, 9:15 AM, Zero Gravity Summit main stage
**Venue:** Aernata, 250 E 200 S Ste 320, Salt Lake City
**Competing:** solo

---

## 1. The prompt, verbatim

> **Rush Hour for Electrons**
> The grid has a rush hour: demand spikes, prices jump, solar fades. Most software ignores it.
> **Build software that knows when the grid is jammed and stays out of traffic.**
> - A navigation app for electricity
> - A traffic report for tomorrow's grid
> - Agents that schedule around clean power
>
> *How would you manage the grid's congestion?*
> Data: EIA, CAISO, ERCOT, Open-Meteo, Electricity Maps

**Sponsor judging guidance:**
- "We don't expect you to be energy and grid experts, they are very complex systems. We care more about engineering skill and creativity."
- "Free and open-source data only. Simulated data is fine if labeled."
- Judged on **creativity, technical complexity, and a complete solution**.
- From the live talk: "the more technical and insightful you can go, the better."

No published percentage rubric. Execution and insight carry the weight.

---

## 2. Who Torus actually is

Getting this right matters. Say the wrong thing and someone in the room corrects you.

**Product.** Torus (South Salt Lake, UT) sells a hybrid energy storage system:
- **Nova Spin**, a mechanical flywheel storing energy in a spinning steel rotor. Near instant, short duration discharge. Power quality, black start, inertial support.
- **Nova Pulse**, lithium iron phosphate batteries for duration.
- Their own energy management software on top.

The pitch for the hybrid is that the flywheel absorbs surges that would otherwise degrade the battery, roughly doubling battery life.

**Where the systems sit.** Mostly **behind the meter at commercial and industrial sites**, not utility owned at substations. Fast Company describes them as sitting "at the point of demand, between high-demand sites and the grid, easing congestion on distribution and sub-transmission lines and freeing up capacity for utilities."

> If you say "substation asset," expect a correction. The accurate framing is that they relieve substation and feeder loading **from the customer side of the meter**.

**Rocky Mountain Power / PacifiCorp relationship.**
- Jan 2025: MOU for 70 MW of demand response capacity, announced with Governor Cox under Operation Gigawatt.
- Mar 19, 2025: approved as one of only two commercial battery providers to pass RMP testing for the **Wattsmart Battery Program**, covering 30 kW to 1.2 MW systems. Achieved 99% uptime in telemetry testing, met IEEE 2030.5, and in 2024 dispatched 137 demand response events responding within 250 milliseconds.
- Sept 2025: the 70 MW MOU expanded to **500 MW** across six Western states.
- Former RMP CEO Gary Hoogeveen sits on the Torus board.

**How the economics work.** Customers use the systems daily to cut **demand charges**. RMP dispatches them during demand response events, which per Torus's CEO occur in less than 1% of hours each year. Wattsmart had more than 130 response events in 2024, mostly managing late afternoon and evening loads.

**Scale and funding.** $200M from Magnetar (Sept 2025). Founded 2021. Moved into a 540,000 sq ft facility ("GigaOne") near SLC airport. Claims crossing 2 GWh of facility managed power and responding to more than 360 unplanned demand response events. TIME Best Inventions 2024, R&D 100 Award 2025, Fast Company Next Big Things in Tech 2026.

**Customers.** PacifiCorp/RMP on the utility side. On the C&I side: Gardner Group (~26 MWh across commercial properties), Salt Lake City International Airport, Ash Grove Cement, Varex, PWDR/Snowbird, Salt Lake Community College, National Vision. They are also positioning for data centers, including 800V DC designs aimed at GPU racks.

**Their own metaphor.** CEO Nate Walkingshaw has publicly framed Torus as a grid "de-congestant," with their Lattice software as "the smart traffic controller." Their strategic story is a distributed utility: a grid operating system aggregating many small inertial plants.

**What that means for your build.** The most useful entry looks like **a prototype module of that control layer**: forecast grid stress, then decide when a site should draw, shift, store, or discharge.

**One quiet signal.** An independent analyst rated Torus "credible technology, serious capital, missing economics." Do not repeat that to judges. But it tells you software that **quantifies the dollar value of a Torus unit** (demand charge savings, DR value, avoided peak) speaks to the company's own open question.

---

## 3. Data sources: access, limits, verdict

Everything on the core path is free and instant. No scraping, no approval queues.

| Source | What it has | Auth | Limits | Verdict |
|---|---|---|---|---|
| **EIA API v2** `/v2/electricity/rto/` | EIA-930 hourly demand, day-ahead demand forecast, net generation, interchange per balancing authority; generation by fuel type. Includes **PACE** and **PACW** | Free key, email signup, minutes | 5,000 rows per JSON request, paginate with `offset`; throttled per second and hour with temporary suspension | **Core. Use it.** |
| **CAISO OASIS** `oasis.caiso.com/oasisapi/SingleZip` | LMPs including EDAM nodes such as `ELAP_PACE-APND`, demand and renewable forecasts | **None** | 31 days per request; returns ZIP, use `resultformat=6` for CSV; pace requests politely | **Core for price.** |
| **Open-Meteo** | Forecast (16 day hourly), historical (ERA5 since 1940), historical-forecast archive (since 2021), solar radiation GHI/DNI/diffuse | **None** | 600/min, 5,000/hr, 10,000/day non-commercial | **Core.** |
| **NREL / developer APIs** (PVWatts v8, NSRDB) | PV output modeling, satellite solar resource | Free key, instant | 1,000/hr default | Optional, for a solar-on-site module |
| **NASA POWER** | Hourly solar and meteorology, point queries | None | No published hard limit | Backup to Open-Meteo |
| **WattTime** | Marginal MOER and forecasts | Free self-registration | Free plan gives full data **only for CAISO_NORTH**; relative 0-100 index elsewhere | Optional comparison layer only |
| **Electricity Maps** | Average/consumption-based intensity; zone `US-NW-PACE` exists | 14-day commercial trial; free tier effectively one zone for Home Assistant | ToS default 150 req/min | **Do not depend on it** |
| **ERCOT Public API** | Prices, load, AS, outages | Registration required (free, self-serve, OAuth) | Per subscription; history from Dec 11, 2023 | Skip, irrelevant to Utah |
| **GridStatus.io** | Normalized ISO data | Free account + key | 500,000 rows/month free | Optional, does not add PACE |

**Traps that will cost you hours:**
1. EIA paginates at 5,000 rows and timestamps are **UTC**, while PACE is Mountain. Handle DST explicitly.
2. OASIS returns zipped CSV, not JSON.
3. Electricity Maps and WattTime free tiers are narrower than blog posts claim. Do not put them on the critical path.

**Rule: backfill and cache everything to Postgres or Firestore Monday night. Never call an upstream API live during the demo.**

---

## 4. The hard part

What separates this from a pretty dashboard is **a decision made under conflicting signals, with a stated model.**

### 4.1 Forecast tomorrow, do not report today
Net load (load minus wind and solar) drives the evening ramp and price spikes. Build a day-ahead PACE net-load forecast from EIA-930 history plus Open-Meteo temperature and irradiance. Score it against **EIA's own published day-ahead demand forecast** and report a backtested MAPE. A forecast with a stated error metric is the single clearest signal of technical seriousness.

### 4.2 Marginal carbon, not average
This is the insight almost nobody gets right.

- **Average intensity** = total emissions divided by total generation. Correct for Scope 2 inventory accounting.
- **Marginal intensity** = the emissions change from one additional MWh. Correct for "should I shift load?"

WattTime's own documentation says shifting load on average intensity "wouldn't reduce emissions." In PACE, coal and gas are frequently on the margin even when hydro, wind and solar output is high, so the two signals rank hours **differently**.

You can derive a marginal emission factor yourself: regress hourly changes in emissions on hourly changes in generation, using EIA-930 fuel-type data and standard per-fuel emission factors. That converts a paywalled commercial signal into your own transparent model. It is the strongest talking point available to you.

### 4.3 The optimization
An LP or MILP that schedules a flexible load plus a Torus-like asset, minimizing a weighted sum of:
- energy cost
- **monthly demand charge exposure (max kW)**
- marginal CO2
- a penalty for drawing during forecast system-peak hours

Asset model: battery (kWh, kW, state of charge limits, round-trip efficiency) and flywheel (high kW, minutes of energy). Flexible load with energy-by-deadline constraints.

Show the **Pareto frontier**. That is the insight: cleanest, cheapest and least congested hours often differ.

### 4.4 Hybrid storage logic
Split the site's net load into a low-frequency component (battery) and a high-frequency residual (flywheel) with a simple filter. This shows you understand **why Torus pairs the two technologies**, without pretending a web app does sub-second control.

### What makes a Torus engineer sit up
- "Here is my marginal emission factor for PACE and here is how I computed it."
- "Here is my forecast error against EIA's own day-ahead forecast."
- "Here is how much demand charge exposure a 500 kW Torus unit removes at this site, and the DR hours it would be dispatched."

### What looks naive
- Average-intensity green/red badges
- "Real time LMP for Utah retail customers"
- Implying flywheels store hours of energy
- Treating the grid as one copper plate

---

## 5. Domain knowledge: do not be subtly wrong

**Congestion** is a transmission or distribution constraint. A line, transformer or path at its thermal, voltage or stability limit, so cheaper power cannot reach load and more expensive local generation must run. In nodal markets it appears as the congestion component of the LMP (LMP = energy + congestion + losses, plus a GHG component in CAISO). Torus's "grid rush hour" is mostly **peak loading of local distribution and sub-transmission plus system peak**, not a published LMP spread.

**Balancing authority vs ISO/RTO.** A BA balances supply and demand in its footprint. An ISO/RTO also runs organized markets. **PacifiCorp is a vertically integrated utility running two BAs: PACE (Utah, Wyoming, Idaho) and PACW.** It is not an ISO. Utah retail customers pay regulated tariffs, not LMPs.

**What Utah actually has now.**
- PacifiCorp has been in the CAISO-run **Western Energy Imbalance Market (WEIM)** since 2014, clearing 5-minute real-time imbalance. PacifiCorp reports more than $1.2 billion in customer benefits since joining.
- On **May 1, 2026, PacifiCorp went live as the day-one participant in CAISO's Extended Day-Ahead Market (EDAM)**. Day-ahead and real-time prices now exist at PacifiCorp nodes in OASIS.

> Correct statement: *Utah now has wholesale day-ahead and real-time prices via EDAM and WEIM, but no Utah ISO, and those prices are not passed through to retail customers.* If you use OASIS PACE prices, label them "wholesale signal / proxy."

**Duck curve and net load.** Midday solar depresses net load. The evening ramp as solar fades is the expensive, stressful period. Load is not net load. Forecast both.

**Demand charges vs energy charges.** C&I bills have an energy charge ($/kWh, sometimes time of use) and a **demand charge** ($/kW on the monthly peak interval). Torus customers' daily value comes mainly from shaving that peak. **One 15-minute spike can set the entire month's demand charge.** Label any tariff numbers you use as illustrative unless you verify RMP's current Utah schedules.

**Ramping and ancillary services.** Regulation (seconds to minutes), spinning and non-spinning reserves, frequency response, inertia. Flywheels excel at the fast end, batteries cover minutes to hours.

**What storage at the edge does.** Peak shaving and demand charge reduction, DR dispatch for the utility (the Wattsmart VPP), power quality and ride-through, relief of feeder and substation loading that can defer upgrades, frequency support.

**Cleanest is not cheapest is not least congested.** Midday solar hours can be cheap and clean in CAISO but not always in PACE. Coal-heavy night hours can be cheap but dirty. Local peaks follow building HVAC, not system marginal carbon.

**Curtailment.** Renewables turned down due to oversupply or transmission limits. Shows up as zero or negative prices in CAISO. The best moment to **add** load.

**Amateur tells to avoid:**
- Mixing MW and MWh
- Ignoring time zones and DST (EIA is UTC, PACE is Mountain)
- Calling EIA-930 "real time" (it is near real time and revised)
- Quoting carbon to three decimals with no uncertainty
- Claiming "LMP in Utah" without the EDAM nuance

---

## 6. What already exists

| Category | Examples | Gap |
|---|---|---|
| Carbon signal APIs | WattTime (marginal MOER), Electricity Maps (average) | Paywalled for most regions; signal only, no decisions |
| SDKs and orchestrators | Green Software Foundation Carbon Aware SDK, KEDA carbon-aware scaler, Green Web Foundation grid-intensity exporter | Shift on average intensity or a relative index; ignore price and congestion |
| Hyperscaler practice | Google Carbon-Intelligent Computing System (day-ahead virtual capacity curves) | Time shifting only; spatial shifting described as future work |
| Market data | GridStatus (hosted API + open-source Python library) | Covers ISOs; PACE only via EIA and CAISO EIM |
| Measurement | CodeCarbon, Climatiq | Accounting, not control |
| Consumer price following | Octopus Agile style apps, EV smart charging | Assume dynamic retail rates, which Utah C&I customers mostly do not have |

**Done to death:** a carbon intensity map with a green/red badge, and "delay my CI job until the grid is green."

**Gaps you can own:**
1. Utah and PACE have no organized-ISO tooling
2. Almost nobody co-optimizes carbon **and** demand charges **and** grid stress together
3. Almost nobody models the storage hardware itself (flywheel vs battery split) as part of the schedule

---

## 7. Build concept: "GridRush PACE"

A day-ahead traffic report for Utah's grid that schedules a flexible C&I load and a hybrid flywheel plus battery around three signals that pull against each other: congestion and peak risk, price, and marginal carbon.

### Screen 1: Traffic Report (tomorrow, hourly, PACE)
- Forecast load and net load, with EIA's own day-ahead forecast as benchmark and a backtested MAPE
- Your marginal emission factor by hour
- PACE EDAM day-ahead price from OASIS, labeled as wholesale proxy
- A **stress index**: percentile of forecast net load and ramp
- Hours colored green, yellow, red with plain-English rationale ("evening ramp, gas on margin")

### Screen 2: Site Planner
Pick a Utah C&I archetype (labeled simulated load profile: cold storage warehouse, cement grinder) and a Torus-like asset size. Then:
- An LP produces tomorrow's schedule for flexible load plus battery plus flywheel
- Output shows dollars saved (energy plus demand charge), kg CO2 avoided (marginal), peak kW reduced
- A weight slider moves along the Pareto frontier live

### Screen 3: "Why not just pick the greenest hour?"
A backtest over the last 90 days comparing:
- average-intensity shifting
- marginal shifting
- cost-only
- your co-optimized policy

**This is the insight screen. It is what wins.**

### AI usage (keep it at the edges)
LLM only for natural language input ("I run a 1 MW cold storage site in Ogden, flexible 4 hours a night") into structured parameters, and prose explanations on the way out. Same deterministic-core pattern as FundPath. The forecast, the emission factor and the optimization are all code.

### Suggested solvers
HiGHS via `highs-js` WASM, or `javascript-lp-solver` for something simpler.

---

## 8. Schedule

**Monday night (tonight)**
- Register EIA API key (emailed, do it first)
- Backfill EIA PACE region-data and fuel-type-data, 2 years hourly
- Backfill OASIS PACE EDAM day-ahead prices, 90 days
- Backfill Open-Meteo historical and forecast for the Wasatch Front
- Cache all of it. Verify UTC to Mountain conversion. Then stop.

**Tuesday**
- Net load forecaster, scored against EIA day-ahead
- Marginal emissions regression
- LP scheduler
- First working end to end pass

**Wednesday morning**
- UI polish and mobile
- Deploy live
- Requirements audit in a fresh session, scored as a percentage
- Rehearse a 4-minute demo
- Record a backup video

---

## 9. Deliberately do NOT build

- A world carbon map
- A Kubernetes scheduler
- A crypto or token "bidding market"
- A deep learning forecaster (a transparent model you can explain beats a black box here)
- Live upstream API calls during the demo
- Claims of real-time LMP pass-through in Utah
- Any feature implying you know Torus's internal control software

---

## 10. Open items to verify yourself

- RMP's current Utah C&I tariff rates. Label as illustrative until confirmed.
- The exact EIA-930 respondent list. Pull the facet list from the route metadata rather than assuming.
- Whether the demo room has reliable wifi. Assume it does not.

---

## Sources

- [Torus, Wattsmart Battery Program approval](https://www.torus.co/news/torus-receives-commercial-energy-storage-approval-for-rocky-mountain-power-s-watt)
- [Torus raises $200M](https://www.businesswire.com/news/home/20250909631411/en/Torus-Raises-$200-Million-to-Accelerate-Deployment-of-Modular-Power-Plants-for-Utilities-Data-Centers-and-Industry)
- [Utility Dive, Torus and RMP demand response MOU](https://www.utilitydive.com/news/torus-rocky-mountain-power-mou-demand-response-dr/740616/)
- [Energy Storage News, Gardner VPP flywheels and batteries in Utah](https://www.energy-storage.news/us-real-estate-gardner-vpp-flywheels-batteries-in-utah/)
- [Nate Walkingshaw, "Torus Solution Administers Sudafed for the Grid"](https://medium.com/@nwalkingshaw/torus-solution-administers-sudafed-for-the-grid-3b3686effcd8)
- [EIA Open Data API documentation](https://www.eia.gov/opendata/documentation.php)
- [PacifiCorp, EDAM go-live](https://www.pacificorp.com/about/newsroom/news-releases/extended-day-ahead-market-live.html)
- [Modo Energy, EDAM launch explainer](https://modoenergy.com/research/en/caiso-spp-extended-day-ahead-market-launch-edam-western-interconnection-markets-plus)
- [WattTime, marginal vs average data signals](https://watttime.org/data-science/data-signals/)
- [WattTime data plans](https://watttime.org/docs-dev/data-plans/)
- [Open-Meteo](https://open-meteo.com/)
- [NREL developer API rate limits](https://developer.nlr.gov/docs/rate-limits/)
- [Electricity Maps pricing and options](https://help.electricitymaps.com/en/articles/13169258-pricing-and-custom-options)
- [GridStatus open-source library](https://github.com/gridstatus/gridstatus)
- [Green Software Foundation, Carbon Aware SDK](https://greensoftware.foundation/articles/celebrating-the-graduation-of-the-carbon-aware-sdk/)
