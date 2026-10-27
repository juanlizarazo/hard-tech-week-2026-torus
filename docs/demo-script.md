# DETOUR demo script

Target length: 4 minutes 30 seconds. Keep the app on the pinned snapshot and use the airport / Schedule 8 defaults unless a judge asks for another site.

## 0:00–0:30 — The hook

Open Start here. Say:

> The grid has a rush hour, and a Torus Station has to answer three clocks at once. One kilowatt of summer on-peak demand costs $16.84 every month; shifting one kilowatt-hour between energy prices is only about 3.1 cents. So DETOUR protects the peak first, then uses Spin and Pulse to make the trade safely.

Point to the three-clocks strip. Explain that the orange stripes are the four busiest forecast hours, not a literal road map.

## 0:30–1:20 — Tomorrow's grid

Open Tomorrow's grid. Say:

> This is tomorrow's PACE traffic report: load and net load, the EDAM day-ahead price, and marginal CO2. The data is real and frozen for the demo; the site and storage behavior are simulated.

Point out the rush-hour band, the price trough and evening ramp, then the carbon line. Say:

> Carbon barely moves compared with price, so it is a tie-breaker here, not the main signal. Marginal CO2 is the extra emissions from one more megawatt-hour, which is the relevant number for shifting load.

Open one chart's information panel and one dotted term. If asked about forecast quality, show the forecast comparison figures and explain that DETOUR is scored against PACE's own day-ahead forecast.

## 1:20–3:10 — Tomorrow's plan

Open Tomorrow's plan. Say:

> Now the signal becomes a decision. This is a 48-hour linear program in the browser, with 15-minute steps. It prices the tariff, energy, marginal CO2, machine wear and a Wattsmart reserve together.

Point to the result figures and load chart:

> The dark line is the site without storage; the green area is grid draw with the station. Spin catches short spikes because it is high-power and durable. Pulse carries the longer energy blocks and stays above the reserve floor.

Move the CO2 weight. Say:

> Watch the plan re-solve. Because PACE's carbon signal barely varies in this snapshot, this dial nudges the result; the tariff peak and rush-hour constraints do most of the work.

Click “Hold 1,000 kWh for Wattsmart” or move the reserve slider. Say:

> More reserve protects a future grid call, but leaves less energy available for today's bill. That is the operational trade Torus hardware makes visible.

Switch Schedule 6 / 8 if time allows. Open Under the hood and show the LP stats line, then the generated LP text for ten seconds.

## 3:10–4:10 — July's proof

Open July's proof. Say:

> This is the honest backtest: a simple shaver, DETOUR planning one day ahead, and perfect hindsight as the ceiling. The capture rate is how much of that ceiling DETOUR reaches.

Point to the calendar and the peak note:

> One 15-minute interval sets the month's demand charge. The component bars show where the saving comes from, and the cycle bars show that July uses only a small fraction of either machine's life.

## 4:10–4:30 — Close

Return to Start here and open How DETOUR works. Say:

> DETOUR is a planning layer above a Torus Station's real-time controller: public grid data becomes a forecast, the forecast becomes a constrained dispatch, and the July replay proves what the strategy earned. Every simulated number is labeled; every public input has a source.
