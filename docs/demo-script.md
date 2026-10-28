# DETOUR demo script

Target length: about 4 minutes 40 seconds, estimated from word count; not yet re-timed with a stopwatch. First person throughout: this is a solo build. Keep the app on the pinned snapshot and use the airport / Schedule 8 defaults unless a judge asks for another site.

## 0:00–0:30 — The hook

Open Start here. Say:

> The grid has a rush hour. One kilowatt of summer peak demand costs $16.84 every month, versus only about 3.1 cents saved once for moving a kilowatt-hour to a cheaper hour. Cutting one kilowatt off the peak saves as much as moving about 550 kilowatt-hours, so I go after the peak first, then use Spin and Pulse to make the trade safely.

Let the map and the launch tiles finish loading while you say it. Explain that the towers are real PACE plants, taller when their fuel supplies more power at their real locations and the streams are shares of power, not a literal road map. Every site number is simulated, seed 42.

## 0:30–1:20 — Tomorrow's grid (1 Forecast)

Open 1 Forecast. The map is already moving at tomorrow's rush hour. Say:

> Every PACE power plant streams into one grid node and on to our simulated airport. At 6 p.m. the solar streams have gone thin and coal and gas carry about 70% of the power. It's a schematic of shares, not a literal road map or real wires.

Drag the hour back to noon, or press Play, and point at the three signal rows moving with it. Then say:

> This is tomorrow's PACE traffic report: load and net load, the EDAM day-ahead price, and marginal CO2. The data is real and frozen for the demo; the site and storage behavior are simulated.

Point out the rush-hour band, the price trough and evening ramp, then the carbon line. Say:

> Carbon barely moves compared with price, so it is a tie-breaker here, not the main signal. Marginal CO2 is the extra emissions from one more megawatt-hour, which is the relevant number for shifting load.

Show the forecast comparison figures and say:

> My forecast beats PACE's own day-ahead forecast by the margin shown here. The plan still takes its rush window from PACE's forecast, because that is the utility's own view of when it is jammed.

Then add one line on carbon: marginal and average CO2 rank tomorrow's hours differently, and marginal is the one a shift actually changes.

## 1:20–3:10 — Tomorrow's plan (2 Decide)

Open 2 Decide. Say:

> Now the signal becomes a decision. This is a 48-hour linear program in the browser, with 15-minute steps. It prices the tariff, energy, marginal CO2, machine wear and a Wattsmart reserve together.

Point to the result figures and load chart:

> The dark line is the site without storage; the green area is grid draw with the station. Spin takes the spikes at about a third of the wear, so Pulse can hold the reserve and carry the longer energy blocks.

Move the CO2 weight. Say:

> Watch the plan re-solve. Because PACE's carbon signal barely varies in this snapshot, this dial nudges the result; the tariff peak and rush-hour constraints do most of the work.

Move the Wattsmart reserve slider. Say:

> More reserve protects a future grid call, but leaves less energy available for today's bill. That is the operational trade Torus hardware makes visible.

Point at D0, tomorrow's route, and read it top to bottom. Say:

> This is tomorrow's route: a handful of timed turns, each with its reason. Charge in the price trough, cap the grid through the on-peak window, discharge through rush hour, and arrive with 531 kW off PACE's rush hour and 800 kWh still held for Wattsmart. The plan never saw today's load: it planned from a forecast of the last four weeks and is checked against the simulated day.

Read the numbers off the Arrive row; they change when the snapshot re-freezes. If asked whether it runs itself, open the run log in the solver rail: each cloud step has its real timestamp, and the last row is the re-solve in this browser. The summary says "Ran itself at" only when the data was pulled in the 3 p.m. window; otherwise it says "Data pulled at".

Press Approve and queue for Lattice. Say:

> These are the dispatch orders DETOUR hands Lattice. Approve, and Lattice runs them; Wattsmart calls still override them.

Open Share and choose Download PDF, or Copy link. Hand the judge the printed sheet or point a phone at its QR code. Say:

> Take it home: the link opens this exact plan, re-solved in your browser from the same frozen grid data.

Click See if this pays off beside the Approved stamp; it opens Record. Say that Approve is the only real action, and Record is where the plan is judged. Then, if time allows, go back and switch the rate plan between Schedule 6 and Schedule 8 and say:

> On Schedule 6 demand counts in any hour, so the station has to shave every spike; on Schedule 8 it only has to protect the on-peak window. Same engine, different plan.

Skip Under the hood unless a judge asks.

## 3:10–4:15 — The record

Open Record. Say:

> This is the honest backtest: a fixed-threshold battery that discharges whenever load passes 80% of the site's peak, DETOUR planning one day ahead, and perfect hindsight as the ceiling. The capture rate is how much of that ceiling DETOUR reaches.

Read the lead sentence on the screen aloud:

> $11,546 saved on a simulated 2 MW Schedule 8 site, 85% of it from demand, 76% of the perfect-hindsight optimum, and 946 kWh held for Wattsmart.

Point to the year ledger at the top, which is the lead, then the calendar and the peak note:

> Same engine, every month: best is September at $13,000 and 78%, weakest is June at about 21%, and here's why: June's peak days are hard to forecast from the last four weeks, so the day-ahead plan misses the spike that sets the month. With a perfect load forecast the same planner captures 96%. January to March run 63 to 69%; April and May are weaker, at 35% and 24%. October is the month to date.

Then click July in the ledger and say:

> One 15-minute interval sets the month's demand charge. The component bars show where the saving comes from, and the cycle bars show that a month uses only a small fraction of either machine's life.

## 4:15–4:35 — Close

Return to Start here and open How DETOUR works. Say two steps and the record, then:

> DETOUR plans every Torus station for tomorrow's rush hour. At this site it takes 531 kW off PACE's peak, planned a day ahead from a forecast, and still saves the customer $8,591 a month at October's $14.90 demand rate if that day sets the month's peak. Every simulated number is labeled; every public input has a source.

Read the kW and dollar figures off Decide on the day; they are today's airport, Schedule 8 defaults and move when the snapshot re-freezes.

Timing note: phase 12 adds the route and Share beats (about 25 seconds); trim the Schedule 6/8 beat first if the run goes over 5 minutes. The added Approve then Record click costs about five seconds. the lead sentence, ledger line and Schedule 6/8 beat are required; the info-panel and dotted-term demo on Forecast was cut to make room. The total is estimated from word count, not yet re-timed with a stopwatch.
