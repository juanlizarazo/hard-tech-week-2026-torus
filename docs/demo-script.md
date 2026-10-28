# DETOUR demo script

Target length: 4 minutes 35 seconds. Keep the app on the pinned snapshot and use the airport / Schedule 8 defaults unless a judge asks for another site.

## 0:00–0:30 — The hook

Open Start here. Say:

> The grid has a rush hour, and a Torus Station has to answer three clocks at once. One kilowatt of summer on-peak demand costs $16.84 every month; shifting one kilowatt-hour between energy prices is only about 3.1 cents. So DETOUR protects the peak first, then uses Spin and Pulse to make the trade safely.

Point to the three-clocks strip. Explain that the orange stripes are the four busiest forecast hours, not a literal road map.

## 0:30–1:20 — Tomorrow's grid (1 Forecast)

Open 1 Forecast. The map is already moving at tomorrow's rush hour. Say:

> Every PACE power plant streams into one grid node and on to our simulated airport. At 6 p.m. the solar streams have gone thin and coal and gas carry about 70% of the power. It's a schematic of shares, not a literal road map or real wires.

Drag the hour back to noon, or press Play, and point at the three signal rows moving with it. Then say:

> This is tomorrow's PACE traffic report: load and net load, the EDAM day-ahead price, and marginal CO2. The data is real and frozen for the demo; the site and storage behavior are simulated.

Point out the rush-hour band, the price trough and evening ramp, then the carbon line. Say:

> Carbon barely moves compared with price, so it is a tie-breaker here, not the main signal. Marginal CO2 is the extra emissions from one more megawatt-hour, which is the relevant number for shifting load.

Open one chart's information panel and one dotted term. If asked about forecast quality, show the forecast comparison figures and explain that DETOUR is scored against PACE's own day-ahead forecast.

## 1:20–3:10 — Tomorrow's plan (2 Decide)

Open 2 Decide. Say:

> Now the signal becomes a decision. This is a 48-hour linear program in the browser, with 15-minute steps. It prices the tariff, energy, marginal CO2, machine wear and a Wattsmart reserve together.

Point to the result figures and load chart:

> The dark line is the site without storage; the green area is grid draw with the station. Spin catches short spikes because it is high-power and durable. Pulse carries the longer energy blocks and stays above the reserve floor.

Move the CO2 weight. Say:

> Watch the plan re-solve. Because PACE's carbon signal barely varies in this snapshot, this dial nudges the result; the tariff peak and rush-hour constraints do most of the work.

Click “Hold 1,000 kWh for Wattsmart” or move the reserve slider. Say:

> More reserve protects a future grid call, but leaves less energy available for today's bill. That is the operational trade Torus hardware makes visible.

Point at the dispatch orders in the solver rail and press Approve plan. Say:

> This is what DETOUR hands Lattice for tomorrow. Approve, and Lattice runs it; Wattsmart calls still override it.

Switch Schedule 6 / 8 if time allows. Open Under the hood and show the LP stats line, then the generated LP text for ten seconds.

## 3:10–4:15 — The proof, month by month (3 Prove)

Open 3 Prove. Say:

> This is the honest backtest: a simple shaver, DETOUR planning one day ahead, and perfect hindsight as the ceiling. The capture rate is how much of that ceiling DETOUR reaches.

Point to the year ledger at the top, then the calendar and the peak note:

> Here is every month this year, not just the best one. July is not even the peak; DETOUR still captures about two-thirds of perfect hindsight in winter. October is the month to date.

Then click July in the ledger and say:

> One 15-minute interval sets the month's demand charge. The component bars show where the saving comes from, and the cycle bars show that a month uses only a small fraction of either machine's life.

## 4:15–4:35 — Close

Return to Start here and open How DETOUR works. Say:

> DETOUR is a planning layer above a Torus Station's real-time controller: public grid data becomes a forecast, the forecast becomes a constrained dispatch, and the month-by-month replay proves what the strategy earned. Every simulated number is labeled; every public input has a source.

Timing note: the ledger line adds about five seconds (about 40 spoken words); the total is estimated from word count, not yet re-timed with a stopwatch.
