# DETOUR: The Winning Build for Torus "Rush Hour for Electrons"

**Build a day-ahead co-optimizer for one labeled, simulated Torus Station (Nova Spin flywheel plus Nova Pulse LFP) at a Utah C&I site.** It should read tomorrow's real PACE grid conditions (EDAM day-ahead prices, PACE load forecast and stress, marginal CO2) and solve an LP that minimizes the customer's real Rocky Mountain Power bill, including the monthly on-peak demand charge. It also has to hold back enough state of charge to answer a Wattsmart demand-response call. Then backtest it against a naive peak-shaver and a perfect-foresight optimum. This touches Torus's actual business (demand charges, Wattsmart dispatch, the hybrid power split). It shows real technical depth (forecasting, marginal-emissions regression, MILP/LP), and it fits your strengths: multi-source ingestion, deterministic engines and polished dashboards.

## TL;DR
- **Build DETOUR, a "Lattice-lite" planner.** It turns tomorrow's PACE traffic report into a 15-minute dispatch plan for a Spin+Pulse hybrid under real Utah tariffs, and proves its savings against a naive rule and a perfect-foresight oracle. Do not build a carbon-intensity "when should I run my dishwasher" app. That is the crowded answer.
- **The winning insight is that a Torus site lives on three clocks that disagree.** On Schedule 8, a kW of summer on-peak demand costs $16.84/month. Shifting a kWh from on-peak to off-peak earns only about 3.1¢. PACE's grid clock has gone negative at midday since EDAM (17% of May hours).\[1\] The utility's Wattsmart clock can drain the battery right before the customer's own peak. DETOUR quantifies those conflicts and resolves them in one optimization.
- **Make it bulletproof with honest benchmarks.** Score the load forecast against PACE's own EIA-930 day-ahead forecast. Estimate marginal (not average) CO2 with the Siler-Evans first-difference regression, with confidence intervals. Report the "capture rate" of the rolling daily LP against the monthly oracle. Label every synthetic site profile clearly.

## Key Findings

**The money is in demand charges, not energy arbitrage, and the tariff structure changes the optimal strategy.**

These are the current Utah rates from Rocky Mountain Power's price summary in effect September 25, 2026.\[2\] They are base rates; riders such as the EBA (Schedule 94) add percentages on top.

| Schedule | Who | Demand (power) charge | Energy | On-peak window |
|---|---|---|---|---|
| 6 | General service under 1,000 kW (not registering ≥1,000 kW more than once in 18 months) | $14.49/kW Jun–Sep, $12.82/kW Oct–May, on **all** kW, plus $4.36/kW facilities | 4.0175¢ summer, 3.5527¢ winter, flat | None for demand |
| 6A | Energy time-of-day option | No power charge; high on-peak energy (27.6525¢ for kWh under 50 kWh/kW in summer) plus an off-peak credit | — | 6–10 p.m. weekdays |
| 8 | ≥1,000 kW, distribution voltage | **On-peak only**: $16.84/kW summer, $14.90/kW winter; off-peak none; plus $5.15/kW facilities | On-peak 6.2395¢ / off-peak 3.1714¢ (summer); 5.5217¢ / 2.8070¢ (winter) | Jun–Sep 3–10 p.m. M–F; Oct–May 6–9 a.m. and 6–10 p.m. M–F |
| 9 | High voltage | On-peak only: $15.54/kW summer, $13.75/kW winter; plus $2.47/kW facilities | 5.5841¢ / 2.8383¢ summer; 4.9417¢ / 2.5118¢ winter | Same as Schedule 8 |
| 23 | Small (≤30 kW in 7 of 12 months, never >35 kW) | $9.54/kW summer, $8.44/kW winter on kW above 15 | — | — |

What this means for the build:
- **A kW of demand is worth far more than a kWh of shifting.** On Schedule 8 in summer, a kW of on-peak demand costs $16.84/month. The on-peak to off-peak energy spread is 3.07¢/kWh. One kW of on-peak peak reduction is worth about as much as shifting about 550 kWh in a month, before round-trip losses.
- **Example site.** A 2 MW Schedule 8 site that shaves 300 kW of on-peak demand saves about $5,052 in a summer month on the power charge alone. Shifting 1 MWh every weekday earns roughly $675.
- **Schedule 6 and Schedule 8 need different dispatch logic.** Schedule 6 bills the monthly maximum 15-minute demand at any hour, so the storage must catch every spike, day or night. Schedule 8/9 bills demand only inside the on-peak window, so an off-peak spike costs nothing on the power charge (verify how the facilities charge is measured). This is a schedule-aware detail most entrants will miss, and a Torus engineer will notice it immediately.

**EDAM changed what is knowable about tomorrow's Utah grid.**
- **Tomorrow's PACE prices are now public before the day starts.** PacifiCorp joined CAISO's Extended Day-Ahead Market on May 1, 2026,\[3\]\[4\] and CAISO's June EDAM report notes results were posted before 1:00 p.m.\[5\]\[6\] The "traffic report for tomorrow" is published, not guessed. Grid Status's blog post "Off to the races: Starting line of EDAM" observed that "On average, Day-Ahead prices in PACE have been negative during the daytime hours due to an influx of solar generation," and reported a first-day PACE DART of −$16.78/MWh.
- **PACE prices in May.** Utility Dive (Tapas Peshin, PCI Energy Solutions) reported PACE day-ahead prices averaged $8.62/MWh in May. They cleared negative in 17% of hours, bottomed at −$41.78/MWh, and averaged below zero across the midday block. PACE's cleared energy was roughly one-third coal and about half wind and solar. Per the same Utility Dive op-ed by Tapas Peshin, senior product manager at PCI Energy Solutions ("A month into EDAM, the data already shows two very different grids"), PACE's "day-ahead schedule averaged about 5,600 MW in May against PACW's roughly 2,200 MW, and peaked near 7,650 MW."
- **Summer peaks.** CAISO's July EDAM report lists PACE's highest single-hour day-ahead demand forecast as 8,047 MW in May, 9,358 MW in June and 10,527 MW in July.\[6\]
- **Early price behavior.** In the first two weeks after go-live, PACE day-ahead prices were frequently $10–$20 below 15-minute-market prices.\[5\] CAISO's Department of Market Monitoring (August 2026 update memo, E. Hildebrandt) reported that across the EDAM footprint for May–July, "Day-ahead market and 15-minute market prices averaged around $26/MWh, while prices in the 5-minute market averaged about $28/MWh." Treat all of this as early-market behavior from a small sample: CAISO's July EDAM performance report (August 24, 2026) noted that "Real-time prices were higher than day-ahead prices in PACE" in July and that "July saw a small increase in price volatility, particularly in PACE."

**Utah context a judge will recognize.**
- **Operation Gigawatt** was announced by Gov. Spencer Cox at the One Utah Summit in Cedar City, per the Utah Governor's Office release of October 8, 2024, as "an initiative to double Utah's power production over the next 10 years."
- **SB 132 large-load agreement.** On February 4, 2026, Gov. Cox and Rocky Mountain Power announced the first agreement under SB 132, the 2025 large-load law, framed as protecting existing customers from added costs.\[7\]
- **Utility-scale storage.** PacifiCorp's 2025 IRP lists 1,072 MW of contracted battery storage, including five facilities totaling 520 MW projected online before the 2026 summer peak.\[8\]
- **System peaks.** Berkshire Hathaway Energy's FY2025 10-K reports PacifiCorp system-wide hourly peaks of 11,263 MW (summer 2025) and 9,302 MW (winter 2025). The annual peak "occurs in the summer when air conditioning and irrigation systems are heavily used."\[9\] These are PacifiCorp-wide numbers, not PACE alone.
- **Peak timing.** NERC's 2025 Summer Reliability Assessment says WECC-Basin, which includes PACE, is summer-peaking and "expected to peak in early July around 3:00 p.m." It forecasts about 1,274 MW of net firm imports at peak, which means PACE leans on interchange.\[10\]

**Wattsmart, current terms.**
- Rocky Mountain Power's Wattsmart Battery page (changes effective June 15, 2026) says commercial battery incentives are $200/kW. C&I batteries larger than 30 kW require pre-approval and a custom incentive offer letter, and commercial batteries are not eligible for bill credits.\[11\]
- The original 2020 program design let the company use batteries 24/7/365, with dispatches "up to two full duty cycles of the battery" per day.\[12\] That is exactly why reserving state of charge for utility calls matters to customer economics.

## Details

### 1. Concept ranking

Scores run 1–5 against (a) creativity, (b) technical complexity, (c) completeness achievable solo in about 40 hours, (d) Torus relevance and (e) whether it demos in under 5 minutes.

| # | Concept | a | b | c | d | e | Total | Verdict |
|---|---|---|---|---|---|---|---|---|
| 1 | **DETOUR: day-ahead traffic report → hybrid co-optimizer → backtest** (fusion of B+C+A-lite+D-lite) | 4 | 5 | 4 | 5 | 5 | **23** | **Build this** |
| 2 | B. Co-optimizing scheduler alone (flexible load + Spin/Pulse; $ + demand + CO2) | 3 | 5 | 4 | 5 | 4 | 21 | Core of #1 |
| 3 | C. Demand-charge assassin (find the intervals that set the monthly peak; what a Torus unit would have saved) | 3 | 3 | 5 | 5 | 5 | 21 | Becomes screen 3 of #1 |
| 4 | D. Wattsmart VPP aggregator/dispatch simulator | 4 | 4 | 3 | 5 | 3 | 19 | Fold in as the DR-reserve constraint, not a separate product |
| 5 | A. PACE day-ahead net-load/stress "traffic report" only | 3 | 4 | 4 | 3 | 4 | 18 | Becomes screen 1 of #1 |
| 6 | G. Agent that negotiates or bids flexible load into clean hours | 4 | 3 | 3 | 2 | 3 | 15 | Customers on Utah tariffs can't bid into EDAM; the premise breaks under questioning |
| 7 | F. Literal "navigation app" routing metaphor | 5 | 2 | 4 | 2 | 4 | 17 | Charming, but electrons don't route; a judge will ask "what's the physics?" |
| 8 | E. Wasatch Front feeder congestion heat map | 4 | 3 | 2 | 3 | 4 | 16 | I found no public RMP hosting-capacity or feeder-loading dataset, so it would be almost entirely invented data |

How each candidate plays out:
- **A, traffic report alone.**
  - Impressive: a forecast scored against PACE's own forecast is credible.
  - Falls flat: it is a dashboard with no decision, and since EDAM PACE already publishes tomorrow's prices.
  - Core: ridge or gradient-boosted net-load model.
  - Risk: you spend 15 hours to land at about 4% MAPE, which is roughly what PACE already does.
- **B, co-optimizer.**
  - Impressive: this is literally what Lattice does. The LP formulation is the technical meat.
  - Falls flat: if it runs on fake load with no benchmark, it is just a number generator.
  - Core: LP or MILP with a demand-charge epigraph variable and SOC dynamics.
  - Risk: infeasibility bugs and unit errors (kW vs kWh at 15-minute steps).
- **C, demand-charge assassin.**
  - Impressive: a dollar figure Torus sales would actually use.
  - Falls flat: it is a spreadsheet, and "peak shaving" is well known.
  - Core: billing-determinant engine plus a threshold search.
  - Risk: low perceived complexity on its own.
- **D, VPP aggregator.**
  - Impressive: speaks to the "distributed utility" thesis and the 500 MW MOU.
  - Falls flat: Wattsmart event data isn't public, so it is all simulated, and fleet maps are eye candy.
  - Core: fleet dispatch allocation.
  - Risk: you build a map, not an engine.
- **E, feeder heat map.**
  - Falls flat: no public distribution data was found, and a Torus engineer will ask where the feeder loadings came from.
  - Avoid.
- **F, navigation app.**
  - Impressive: wins "creativity" for 30 seconds.
  - Falls flat: there is no technical core unless it is a skin over B.
  - Use the metaphor for copy only ("Detour," "traffic report," "congestion ahead").
- **G, bidding agent.**
  - Falls flat: behind-the-meter Utah customers pay regulated tariffs, not LMPs. An agent "bidding into clean hours" misreads the market structure Torus operates in.
  - LLM agents are also the crowded answer.

**Why the fusion wins.** It produces one coherent pipeline: forecast → signal → decision → proof. Each stage is individually defensible, and together they mirror Torus's own stack (grid signals → Lattice EMS → Spin/Pulse → Wattsmart dispatch).

### 2. What the competition will likely build

These predictions are reasoned from typical hackathon patterns, not sourced.
1. **Carbon-aware appliance or EV scheduler.** It uses Electricity Maps or WattTime average intensity, with a chatbot ("Run your dishwasher at 1 p.m."). This is the obvious, crowded answer. It also uses the wrong signal: average intensity is not what changes when you shift load.\[13\]\[14\]
2. **ERCOT/CAISO price "traffic map" dashboard.** Pretty charts of LMPs or a duck curve with a red/yellow/green banner. Lots of data, no decision.
3. **LLM agent that "negotiates" with the grid.** It fails on market structure, as explained above.
4. **LSTM or Prophet load-forecast notebook** that reports MAPE without comparing to the BA's own forecast or a seasonal-naive baseline.
5. **Literal Google-Maps-for-electricity UI** routing power across Utah lines.

**How to differentiate:**
- **Utah/PACE, not ERCOT.** Torus is a Utah company with Utah customers on RMP tariffs.
- **Marginal, not average, emissions.**
- **Real tariff billing determinants**, including Schedule 6 vs Schedule 8 logic.
- **Hybrid-specific dispatch.**
- **Benchmarks:** against PACE's own forecast, against a naive rule, and against an oracle.

### 3a. Net-load forecasting for PACE

**Data.**
- Use EIA-930 for PACE: demand (D), PACE's own day-ahead forecast (DF), net generation by fuel and total interchange.\[15\]
- The six-month balance files include EIA imputation flags and need no API key.\[16\]
- Net load = demand − wind − solar (in-BA, utility-scale).
- Weather comes from Open-Meteo. Train on forecasts that were actually available a day ahead, not observed weather. The Previous Runs API gives fixed 1–7 day lead-time series from January 2024 (GFS 2 m temperature from March 2021).\[17\]\[18\] The Historical Forecast API archives from about 2021–2022.\[18\]\[19\] A public study framed this as how much observed weather overstates day-ahead accuracy, so this choice matters for honesty.\[20\]
- Use a population-weighted average of 3–5 Wasatch Front points (Salt Lake City, Ogden, Provo, plus Idaho Falls and Casper for the PACE fringe).

**Methods, in order of value per hour of effort:**
1. **Seasonal naive** (same hour last week). Mandatory baseline.
2. **Similar-day matching**: k nearest historical days on forecast max/min temperature, day type and month; average their profiles.
3. **Ridge regression** with hour-of-week dummies, HDD/CDD splines (base around 65°F, with hinge terms at 2–3 knots to capture nonlinearity), lags at 24h and 168h, a 7-day rolling mean, a holiday flag (include Pioneer Day, July 24), and forecast GHI as a behind-the-meter PV proxy. The closed form (XᵀX+λI)⁻¹Xᵀy is about 50 lines of TypeScript.
4. **Gradient boosting (LightGBM)** if you'll accept a Python step. Typically better at temperature nonlinearity, but it costs you explainability.
5. **Skip Prophet and LSTMs.** Prophet handles multiple seasonality but is weak with exogenous weather. LSTMs aren't worth it in 40 hours.

**Feature engineering that matters most:** temperature nonlinearity (cooling degrees dominate the summer peak), hour × day-type interaction, the 168h lag and holidays. Solar irradiance matters because Utah small-scale solar delivered about 1,105 GWh in 2025 (per EIA figures cited by Wikipedia; verify), which depresses midday measured demand.\[21\]

**Metrics.**
- Report MAPE, RMSE (MW) and peak-hour error, plus pinball loss on the P10/P90 bands if you produce quantiles. A cheap way: empirical residual quantiles by hour and season.
- The public BA Forecast Scorecard (cardinalgrid/ba-forecast-scorecard on GitHub) reports in its README, covering EIA-930 data through September 16, 2026, a "Demand-weighted day-ahead MAPE across eligible BAs: 3.56%; median BA: 4.20%," with the best at about 1.8% (PGE); its v0.1.1 release notes (July 2015–June 2026, 42 eligible BAs) give 3.54%, so state which version you cite.
- At the hour of the actual daily peak, BA forecasts were below actual demand on 59% of BA-days.\[16\] That makes peak-hour under-forecast a great metric to show.
- Target: clearly beat seasonal naive, and land within a point of PACE's DF. Do not claim to beat PACE unless your held-out test shows it.

**EIA-930 pitfalls:**
- **Raw data contains outliers, missing values and asymmetric interchange.** PUDL publishes imputed demand columns,\[22\] and those imputations are themselves not perfectly reproducible between builds.\[23\] An older cleaning study found 2.2% of hourly values missing and flagged about 0.5% as anomalous.\[24\]
- **Timestamps are UTC hour-ending.** Convert to America/Denver after joining, and handle DST with the 23- and 25-hour days explicitly.
- **Revisions happen.** Snapshot your pull and state the pull date on screen.
- **Know your quantities.** Demand + net interchange ≈ net generation is EIA's expected hourly balance.\[25\] Storage charging should be excluded from demand.\[26\]
- **PACE has a known bad day.** The scorecard's worst eligible BA-day was PACE on April 2, 2016, with the forecast 50% below a 10,048 MW peak. Train on 2022+ and filter implausible hours (the scorecard rejects forecast/demand outside [½, 2]).\[16\]
- **Mid-2024 solar categories changed.** This created gaps in some processed datasets, so check the solar series continuity around July 2024.\[27\]

### 3b. Marginal emissions for PACE

**Method: Siler-Evans, Azevedo and Morgan (2012) first-difference regression.**
1. Build hourly emissions: E_t = Σ_f G_{f,t}·θ_f over EIA-930 fuel types.
2. Fit ΔE_t = α + β·ΔG_t + ε within strata (hour-of-day × season, optionally × load decile). β is the marginal emissions factor (MEF).\[28\]\[29\]
3. Run it two ways:
   - ΔG = Δ(in-BA fossil generation), which is the Siler-Evans convention.\[30\]\[31\]
   - ΔG = Δdemand. This captures the share of a load change met by imports or exports, which are significant for PACE.
4. Report the gap between the two as your import-uncertainty band, and report the net-import share per stratum.

The open Marginalis project applies exactly this (Hawkes 2010; Siler-Evans 2012) to EIA-930 with held-out validation.\[13\] It is a direct template.

**Emission rates (θ_f):**
- EIA's own figures are 2.26 lb CO2/kWh for coal and 0.97 lb/kWh for natural gas (national annual, from EIA's FAQ).\[32\] In other words 2,260 and 970 lb/MWh.
- EIA's Grid Monitor applies a single national coal factor (2.23 lb/kWh for 2022).\[33\]
- EIA-930 does not split gas into combined-cycle vs combustion turbine, so a single gas factor understates CT-on-the-margin hours. State that.
- For a more Utah-specific coal factor, use plant-level eGRID rates for Hunter, Huntington and the Wyoming units if time allows.

**Sanity anchors:**
- **EPA AVERT** puts Utah in its Rocky Mountains region. Its 2018 avoided-CO2 rates were 1,622 lb/MWh (wind), 1,576 (utility PV), 1,723 (portfolio EE) and 1,758 (uniform EE).\[34\]\[35\]
- **eGRID2023 non-baseload rates.** The RMPA (WECC Rockies) non-baseload CO2 rate is 1,620.6 lb/MWh, against a total output rate of 1,036.0.\[36\] Note that Utah generally maps to eGRID's NWPP subregion, whose average is diluted by Pacific Northwest hydro. That is one more reason to compute at BA level.
- If your PACE MEF lands in roughly the 1,000–2,000 lb/MWh range with sensible hour-to-hour structure, you're plausible.

**Known limitations to state on screen:**
- Fuel-level, not unit-level, data.
- Imports are not attributed.
- Coal must-run and curtailment behavior make the midday MEF noisy.
- A linear MEF assumes small perturbations.

I found no published hourly PACE MEF profile, so present your own estimate with confidence intervals rather than asserting a shape. The arXiv paper "Retail electricity costs and emissions incentives are misaligned for commercial and industrial power consumers" (2511.10775) gives you academic cover for the three-clocks thesis.\[14\]

### 3c. The optimization (LP, 15-minute steps, 48-hour horizon)

**Sets and parameters.**
- t ∈ 1..192, Δt = 0.25 h.
- Site load L_t (labeled simulated) and PV_t.
- Energy price p_t from the tariff (customer cost). Show the EDAM LMP only as a system-stress signal.
- MEF_t, and on-peak mask ω_t from the schedule.
- Peak-so-far this month P̂ (on-peak) and P̂_all (facilities/Schedule 6).

**Variables.**
- Grid import g_t ≥ 0; set export to 0 (Schedule 137 net billing is a separate case).
- Battery charge and discharge b⁺_t, b⁻_t; flywheel f⁺_t, f⁻_t.
- SOC sᴮ_t and sᶠ_t.
- Flexible load shift x_t with Σx_t = 0 and bounds.
- Demand variable D ≥ P̂.

**Constraints.**
- Balance: g_t = L_t − PV_t + x_t + b⁺_t − b⁻_t + f⁺_t − f⁻_t.
- Battery SOC: sᴮ_{t+1} = sᴮ_t + ηᴮ_c b⁺_t Δt − b⁻_t Δt/ηᴮ_d, bounded to 10–95% of capacity, with power ≤ C-rate × capacity (for example 0.5C).
- Flywheel SOC: sᶠ_{t+1} = (1−σ)sᶠ_t + ηᶠ f⁺_t Δt − f⁻_t Δt/ηᶠ. Here σ is a self-discharge parameter per step; flywheels lose energy continuously. Keep this a labeled assumption. Power ≤ 10C (Torus publishes a 10C rating for Spin).\[37\]
- Demand: D ≥ g_t for all t with ω_t = 1. This is the epigraph trick that linearizes the max. For Schedule 6, apply it to all t.
- Wattsmart reserve: sᴮ_t + sᶠ_t ≥ R_t over the forecast stress window, where R_t = (event probability from the traffic report) × (committed kW × event duration).
- Terminal SOC ≥ initial SOC, so the optimizer doesn't "cheat" by ending the horizon empty.

**Objective.**
min Σ p_t g_t Δt + r_d (D − P̂) + λ Σ MEF_t g_t Δt + cᴮ Σ b⁻_t Δt + cᶠ Σ f⁻_t Δt

- **Degradation costs.** cᴮ is roughly (replacement cost ÷ (cycle life × usable kWh)). Torus publishes 7,500 cycles for Pulse vs 25,000 for Spin, so the flywheel's per-kWh wear cost is about 3× lower.\[38\] The LP will naturally route frequent, short spikes to Spin.
- **Battery smoothness.** Add a battery ramp limit |b_t − b_{t−1}| ≤ ρ so fast transients must go to the flywheel. That makes the "hybrid split" visible in the plot.

**Handling the monthly demand charge in a daily solve** (the hard part). Practitioners use three tricks, and you should use all three:
- **Peak-so-far.** Only charge for raising D above the month's existing peak P̂. Once a peak is set, there's no value in shaving below it.
- **Demand-charge threshold or target.** The literature often sets a daily threshold and adjusts it in real time.\[39\]
- **Value-function or shadow-price approach.** An arXiv paper on combining frequency control and peak shaving solves the month recursively over peak-so-far, with a convex piecewise-linear value function.\[40\] That is your "future work" slide.

**Benchmark three strategies over a full month:**
1. Naive threshold shaver (discharge whenever load > target).
2. Rolling daily LP with peak-so-far (the realistic case).
3. Perfect-foresight monthly LP. 2,880 intervals × about 10 variables is under 30k variables, which is trivial for HiGHS.

Report the capture rate = (realized savings ÷ oracle savings). This single number signals that you understand the forecast-uncertainty gap.

**Simultaneous charge and discharge.** With positive tariff prices plus efficiency losses and degradation cost, the LP won't charge and discharge at once. If you optimize against negative EDAM LMPs, it can, and you'd need binaries (a MILP). This is another reason to keep the tariff as the customer objective.

**Solvers.**
- **highs-js (npm `highs`, MIT)** compiles HiGHS to WebAssembly. It solves LP, MIP and convex QP in Node and browsers, is single-threaded, and takes CPLEX LP-format text.\[41\]\[42\]\[43\] A 192-step model solves in milliseconds, and the 30-day backtest in seconds.
- **lp-model** gives a JS modeling layer over highs-js, glpk.js and javascript-lp-solver.\[44\]
- Skip javascript-lp-solver for anything but toys.
- **Python (PuLP or CVXPY + HiGHS)** is unnecessary given your TypeScript strength. Generate LP text in TypeScript, solve with highs-js in a NestJS worker, and show the generated .lp file in the demo as proof of rigor.

### 3d. Simple and explainable beats fancy for this audience

The sponsor said "we don't expect you to be energy and grid experts" and "the more technical and insightful you can go, the better." That combination rewards a transparent model that answers expert questions: ridge regression with visible coefficients, an LP with readable constraints, and a regression MEF with confidence intervals. A black-box LSTM invites "how do you know it's right?" Every DETOUR number can be traced to a tariff line, an EIA series or a constraint.

### 4. Utah / PACE numbers you can cite
- **Tariffs**: see the table above. Schedule 8's on-peak demand window is the key one.
- **Generation mix.** One secondary aggregator (GridInfo) shows PACE at about 39.9% coal, 26.2% wind, 17.1% gas, 13.7% solar and 1.5% hydro (rolling, method unstated).\[45\] Compute your own from EIA-930 and show it.
- **Peaks.** PacifiCorp system summer peak was 11,263 MW in 2025. The PACE day-ahead peak forecast was 10,527 MW in July 2026.\[6\]\[46\] WECC-Basin peaks in early July around 3 p.m.
- **Behind-the-meter solar.** About 1,105 GWh of small-scale solar in Utah in 2025 (secondary citation of EIA).\[21\] Utah ranked 16th nationally with 2,780 MW of solar in 2024, about four-fifths utility-scale.\[47\] New RMP solar customers are on Schedule 137 net billing; RMP's Electric Service Schedule No. 137 (effective March 1, 2026) pays "4.855¢ per kWh for all exported kWh" in June–September and "4.033¢ per kWh for all exported kWh" in October–May.
- **Congestion.** I could not find a public RMP hosting-capacity map or feeder-loading data for the Wasatch Front. Say so explicitly. The congestion you can show credibly is system-level: the evening net-load ramp, EDAM price spread, and PACE's import reliance at peak (NERC's roughly 1,274 MW of net firm transfers for WECC-Basin). That is in addition to customer-side peaks, which is where Torus actually operates.

### 5. Demo and pitch (under 5 minutes, one-on-one)

**Lead chart, "Three Clocks."** Show one real recent PACE weekday (a July 2026 date) with:
- the Schedule 8 on-peak band (3–10 p.m.);
- the EDAM day-ahead price curve (negative midday trough, evening ramp);
- your MEF curve with CI;
- the site's net load before and after, with Spin and Pulse stacked in different colors.

**Lead number:** "$X saved this month on a simulated 2 MW Schedule 8 site. Y% of it came from the demand charge, and we captured Z% of the perfect-foresight optimum while holding N kWh in reserve for Wattsmart on high-stress days."

**Script:**
- 0:00–0:30, the hook: "$16.84 vs 3.1¢."
- 0:30–1:30, the Traffic Report screen: tomorrow's PACE stress forecast vs PACE's own forecast.
- 1:30–3:30, the Plan screen: drag the CO2 weight λ or the Wattsmart reserve slider and watch the LP re-solve live in the browser. Live re-solve is your technical-depth moment.
- 3:30–4:30, the Backtest screen: naive vs DETOUR vs oracle.
- 4:30–5:00, one sentence: "this is the planning layer that sits on top of Lattice's real-time control."

**Likely Torus questions and correct answers:**
- *"Does the customer pay LMP?"* No. Utah C&I customers pay RMP tariffs. EDAM prices are a grid-stress and value signal, not their bill.
- *"Why model the flywheel at 15 minutes?"* At 15-minute resolution the flywheel's value is cycle allocation and power. Its millisecond frequency and voltage value needs a sub-second simulation, which is out of scope and shown as future work.
- *"Schedule 6 or 8?"* Both. Toggle it: the demand window logic changes.
- *"What if Wattsmart calls an event at 4 p.m. on a peak day?"* That's the reserve constraint. Show the tradeoff curve of customer $ vs reserved kWh.
- *"Where's the load from?"* A labeled synthetic profile (see below).
- *"Average or marginal CO2?"* Marginal, via Siler-Evans regression, with stated limitations.

**Claims that would get you caught out:**
- "Reduces feeder congestion by X%."
- "AI-powered."
- "Real-time" (you're day-ahead).
- Any claim about Lattice internals.
- Treating flywheel round-trip efficiency or self-discharge as known Torus specs. They are parameters; label them.
- Using a "12-minute full cycle" figure for Spin. That appears only in a secondary tech-news article.\[48\]

**Simulated data, presented as a strength.** Generate C&I profiles from documented archetypes: a cement plant with crusher spikes, an airport with HVAC plus a baggage-system pattern, and a ski resort with lift-motor starts. Add a fixed random seed and a "SIMULATED — seed 42" badge on every chart. Run them all through the same engine. Showing that results hold across three archetypes is more convincing than one "real" anonymous meter.

**Code.** Show architecture for 10 seconds, and the generated LP text for 10 seconds. Have the repo link on screen but don't scroll code.

### 6. Open-source code to build on

| Purpose | Repo | License |
|---|---|---|
| ISO/EIA data pulls (EIA fuel mix, CAISO OASIS LMPs) | github.com/gridstatus/gridstatus | BSD-3-Clause |
| Cleaned EIA-930 + imputed demand; docs on 930 irregularities | github.com/catalyst-cooperative/pudl | MIT (code), CC-BY-4.0 (data) |
| Hourly BA-level emissions pipeline, EIA-930 reconciliation | github.com/singularity-energy/open-grid-emissions | MIT (code), CC-BY-4.0 (data) |
| Score BA day-ahead forecasts (PACE DF baseline) | github.com/cardinalgrid/ba-forecast-scorecard | Apache-2.0 |
| Day-ahead forecaster vs operator forecast template | github.com/Jeneidi/balancing-authority | Check before reuse |
| Marginal emissions via first-difference regression on EIA-930 | github.com/VampiricCyborg/Marginalis | Check before reuse |
| Rolling daily battery LP with demand charge (PuLP) | github.com/NasrudeenK/smart-grid-optimization | Check before reuse |
| LP/MIP solver in Node/browser | github.com/lovasoa/highs-js (npm `highs`) | MIT |
| JS modeling layer for highs/glpk | github.com/DominikPeters/lp-model | Check before reuse |
| Cleaned EIA demand (older) | github.com/truggles/EIA_Cleaned_Hourly_Electricity_Demand_Data | Check before reuse |

EIA data is U.S. government public domain. Open-Meteo data is CC BY 4.0.\[20\]\[49\]

## Recommendations

**The concept:** DETOUR, a day-ahead "rush-hour planner" for a Torus Station.

**Technical core:**
1. EIA-930 + Open-Meteo ridge forecast of PACE net load and stress, benchmarked against PACE's DF.
2. Siler-Evans marginal-emissions regression for PACE.
3. A 48-hour, 15-minute LP in highs-js co-optimizing tariff energy, on-peak demand with peak-so-far, marginal CO2, Spin/Pulse degradation and a Wattsmart SOC reserve.
4. A month-long backtest: naive vs rolling LP vs oracle.

**Three screens:**
1. **Traffic Report.** Tomorrow's PACE load/net-load forecast with P10–P90, PACE's own DF overlay, the EDAM day-ahead price, MEF by hour, and a "rush hour" band where stress, price and carbon coincide.
2. **Plan, "Three Clocks."** Site load before and after; Spin vs Pulse stacked; tariff window; sliders for CO2 weight, Wattsmart reserve and Schedule 6/8; live re-solve.
3. **Backtest / Demand-Charge Assassin.** The month calendar with the 15-minute interval that set the peak highlighted; $ by component (demand, energy, CO2-equivalent); capture rate vs oracle; cycles on Pulse vs Spin.

**The one insight that wins:** "For a Utah C&I site, the demand-charge clock, the grid's price clock and the carbon clock disagree, and the Wattsmart call can collide with the customer's own peak. A hybrid wins because the flywheel absorbs the frequent short spikes that set demand charges at about one-third the per-kWh wear of LFP. That frees the battery to hold the reserve the utility needs." This is Torus's "distributed utility" thesis expressed as a constraint set.

**Must-have (in order):**
1. EIA-930 PACE ingestion (D, DF, fuel mix, interchange) with UTC→Denver and DST handling and implausibility filtering.
2. Tariff engine for Schedules 6 and 8 (billing determinants, on-peak masks, peak-so-far).
3. Synthetic site generator (three archetypes, seeded, labeled).
4. LP builder (LP-text generation) + highs-js solve + feasibility tests.
5. Month backtest with three strategies and capture rate.
6. MEF regression by hour × season with CIs.
7. The three screens, deployed to a public URL.

**Nice-to-have:**
- Ridge forecast with P10/P90 vs PACE DF and seasonal naive (move it up if the core is done by hour 24).
- EDAM DA prices for PACE from OASIS (ELAP_PACE-APND) as the stress overlay.
- Wattsmart event-probability model.
- Schedule 9.
- A one-minute sub-simulation of a single spike showing the flywheel response.
- An LLM only for a plain-English "tomorrow's briefing" paragraph, generated from the deterministic outputs. This mirrors your FundPath pattern.

**Do not build:**
- Feeder or substation heat maps.
- Literal routing maps.
- LLM agents that "bid" or "negotiate."
- LSTM or transformer forecasters.
- Electricity Maps or WattTime integrations.
- ERCOT or CAISO-only views.
- User accounts or auth.
- Mobile apps.
- Hardware integration or IEEE 2030.5 mocks.
- Any claim about real Torus customer savings.

**Biggest technical risk:** The LP produces wrong or infeasible results from unit and timestamp errors. Those come from kW vs kWh at Δt = 0.25, from UTC vs local on-peak masks, and from DST days. Wrong dollar figures in front of a Torus engineer are fatal.

**Mitigation:**
- By hour 10, write five deterministic unit tests: battery-off equals the baseline bill; an infinite battery flattens on-peak to the off-peak max; zero CO2 weight makes the λ curves identical; SOC never violates bounds; a DST day has 92 or 100 intervals.
- Hand-compute one day's bill in a spreadsheet and assert equality.
- Freeze a cached data snapshot by hour 30 so the demo never depends on live APIs.

**Rough 42-hour plan:**
- Hours 0–8: ingestion + tariff engine.
- Hours 8–18: LP + tests.
- Hours 18–24: backtest + synthetic sites.
- Hours 24–30: MEF + forecast.
- Hours 30–38: screens + polish.
- Hours 38–42: rehearse the 5-minute script and freeze data.

## Caveats
- **Tariff rates are base rates** from the September 25, 2026 price summary. Riders (EBA and others) add percentages. Verify the facilities-charge measurement and the Schedule 8 demand interval in the full tariff sheets before quoting exact bills.
- **EDAM price facts cover only May–July 2026.** Early-market behavior may not persist.
- **Some figures are secondary or aggregator-sourced:** GridInfo's PACE fuel mix, Utah small-scale solar GWh, and Spin's "12-minute" cycle. Treat them as indicative and recompute from primary data where possible.
- **Torus-specific parameters are labeled assumptions.** Flywheel efficiency and self-discharge, Pulse C-rate, and replacement costs are not published.
- **Marginal-emissions estimates from EIA-930** are fuel-level and don't attribute imports. Present them as estimates with intervals, not as fact.
- **The competitor predictions are reasoned inferences**, not observed data.

## Sources

1. [A month into EDAM, the data already shows two very different grids](https://www.utilitydive.com/news/caiso-edam-day-ahead-pacificorp-analysis/823240/)
2. <https://www.rockymountainpower.net/content/dam/pcorp/documents/en/rockymountainpower/rates-regulation/utah/Utah_Price_Summary.pdf>
3. [WECC: What the launch of EDAM means for renewable investments - Research](https://modoenergy.com/research/en/caiso-spp-extended-day-ahead-market-launch-edam-western-interconnection-markets-plus)
4. [CAISO EDAM Is Live: PacifiCorp Joins Western Day-Ahead Market](https://kilowattlogic.com/news/caiso-edam-launch-may-2026-pacificorp-western-electricity-market)
5. [Extended Day-Ahead Market Performance June Report July 28, 2026](https://www.caiso.com/documents/monthly-extended-day-ahead-market-edam-performance-report-for-jun-2026.pdf)
6. [Extended Day-Ahead Market Performance July Report August 24, 2026](https://www.caiso.com/documents/monthly-extended-day-ahead-market-edam-performance-report-for-jul-2026.pdf)
7. [Rocky Mountain Power advances Utah’s Operation Gigawatt through landmark energy agreement](https://www.rockymountainpower.net/about/newsroom/news-releases/utah-operation-gigawatt.html)
8. [UTAH 2025 Integrated Resource Plan Volume I - March 31, 2025](https://www.pacificorp.com/content/dam/pcorp/documents/en/pacificorp/energy/integrated-resource-plan/2025-irp/2025_IRP_Vol_1_Utah.pdf)
9. [BERKSHIRE HATHAWAY ENERGY CO - Form 10-K - FY2025](https://www.sec.gov/Archives/edgar/data/1081316/000108131626000003/bhe-20251231.htm)
10. <https://www.nerc.com/globalassets/programs/rapa/ra/nerc_sra_2025.pdf>
11. [Wattsmart Battery program](https://www.rockymountainpower.net/savings-energy-choices/wattsmart-battery-program.html)
12. [315565CmntsfrmDPU9 18 2020](https://pscdocs.utah.gov/electric/20docs/20035T07/315565CmntsfrmDPU9-18-2020.pdf)
13. [GitHub - VampiricCyborg/Marginalis: Estimating marginal (not average) CO2 emissions from grid data to test whether load-shifting advice actually holds up — EIA hourly data, first-difference regression, held-out validation. · GitHub](https://github.com/VampiricCyborg/Marginalis)
14. [Retail electricity costs and emissions incentives are misaligned for commercial and industrial power consumers](https://arxiv.org/pdf/2511.10775)
15. [PUDL Raw EIA Form 930 -- Hourly and Daily Balancing Authority Operations Report](https://zenodo.org/records/18524038)
16. [GitHub - cardinalgrid/ba-forecast-scorecard: Daily scoring of every U.S. balancing authority's own day-ahead load forecast, from EIA-930 public data. Launching October 2026. · GitHub](https://github.com/cardinalgrid/ba-forecast-scorecard)
17. [Previous Runs API](https://open-meteo.com/en/docs/previous-runs-api)
18. [⚡️ Features](https://open-meteo.com/en/features)
19. [Historical Forecast API](https://open-meteo.com/en/docs/historical-forecast-api)
20. [GitHub - Miir2003/grid-forecast-extremes: How much does observed weather overstate day-ahead electricity demand forecast accuracy on extreme-temperature days? Reproducible study on EIA-930 data. · GitHub](https://github.com/Miir2003/grid-forecast-extremes)
21. [List of power stations in Utah](https://en.wikipedia.org/wiki/List_of_power_stations_in_Utah)
22. [EIA Form 930](https://docs.catalyst.coop/pudl/en/nightly/data_sources/eia930.html)
23. [Imputed hourly demand values are not reproducible between builds · Issue #5649 · catalyst-cooperative/pudl · GitHub](https://github.com/catalyst-cooperative/pudl/issues/5649)
24. [GitHub - truggles/EIA\_Cleaned\_Hourly\_Electricity\_Demand\_Data: A repository for publishing and versionsing cleaned EIA hourly demand data · GitHub](https://github.com/truggles/EIA_Cleaned_Hourly_Electricity_Demand_Data)
25. [Form EIA-930 Hourly and Daily Balancing Authority Operations Report](https://docs.catalyst.coop/pudl/en/latest/_downloads/2297feef7fae5877a95f4a67bdc3cab2/eia930_instructions_2026-07-31.pdf)
26. [Form EIA-930 Hourly and Daily Balancing Authority Operations Report](https://www.eia.gov/survey/form/eia_930/instructions.pdf)
27. [EIA-930 generation data from 2024 July is missing · Issue #5335 · catalyst-cooperative/pudl · GitHub](https://github.com/catalyst-cooperative/pudl/issues/5335)
28. [Marginal Emissions Factors for the U.S. Electricity System](https://watttime.org/wp-content/uploads/2023/11/Marginal-Emissions-Factors-for-the-US-Electricity-System_April-2012.pdf)
29. [Advanced Models for Hourly Marginal CO2 Emission Factor Estimation: A Synergy between Fundamental and Statistical Approaches](https://arxiv.org/pdf/2412.17379)
30. [Marginal Emissions Factors for Electricity Generation in the Midcontinent ISO](https://depts.washington.edu/airqual/Marshall_86.pdf)
31. [Journal of Economic Behavior & Organization 107 (2014) 248–268 Contents lists](https://watttime.org/wp-content/uploads/2023/11/Spatial-and-temporal-heterogeneity-of-marginal-emissions-Implications-for-electric-cars-and-other-electricity-shifting-policies_March-2014.pdf)
32. [Frequently Asked Questions (FAQs)](https://docs.cpuc.ca.gov/PublishedDocs/Efile/G000/M512/K176/512176987.PDF)
33. [Options for EIA to Publish CO2 Emissions Rates for Electricity](https://media.rff.org/documents/Report_22-08.pdf)
34. [avert emission factors 05 30 19 508](https://19january2021snapshot.epa.gov/sites/static/files/2019-05/documents/avert_emission_factors_05-30-19_508.pdf)
35. [AVERT State Climate and Energy Program Banner AVERT Logo](https://www.epa.gov/sites/default/files/2019-05/documents/avert_emission_factors_05-30-19_508.pdf)
36. [egrid2023 summary tables rev1](https://www.epa.gov/system/files/documents/2025-01/egrid2023_summary_tables_rev1.pdf)
37. [Flywheel Energy Storage for Grid and Industrial Applications with Nova Spin](https://www.torus.co/torus-flywheel)
38. [Full-Stack Energy Storage & AI-Powered Management with Torus Nova - Torus](https://www.torus.co/torus-nova)
39. [(PDF) Energy dispatch schedule optimization for demand charge reduction using a photovoltaic-battery storage system with solar forecasting](https://www.researchgate.net/publication/260558809_Energy_dispatch_schedule_optimization_for_demand_charge_reduction_using_a_photovoltaic-battery_storage_system_with_solar_forecasting)
40. [Optimal Combination of Frequency Control and Peak Shaving with Battery Storage Systems](https://arxiv.org/pdf/1906.06907)
41. [GitHub - DoumarCharles/highs-js: Javascript linear programming library · GitHub](https://github.com/DoumarCharles/highs-js)
42. [lovasoa/highs-js](https://deepwiki.com/lovasoa/highs-js)
43. [highs - npm](https://www.npmjs.com/package/highs?activeTab=versions)
44. [GitHub - DominikPeters/lp-model: JavaScript package for modelling (Integer) Linear Programs · GitHub](https://github.com/DominikPeters/lp-model)
45. [PacifiCorp East | U.S. Balancing Authority](https://www.gridinfo.com/balancing-authority/pacificorp-east)
46. [Form 10-K - Idaho Public Utilities Commission](https://puc.idaho.gov/Fileroom/PublicFiles/ELEC/PAC/General/0Annual%20Report/Form%2010-K%20-%20Period%20ending%2012-31-2025.pdf)
47. [Solar power in Utah](https://en.wikipedia.org/wiki/Solar_power_in_Utah)
48. [Torus Nova Spin uses spinning steel to power AI data centers without lithium](https://gagadget.com/en/717353-torus-nova-spin-uses-spinning-steel-to-power-ai-data-centers-without-lithium/)
49. [🌤️ Free Open-Source Weather API](https://open-meteo.com/)
