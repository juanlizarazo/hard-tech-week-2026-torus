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

> I beat PACE's own day-ahead forecast by the margin shown here, so the plan starts from a better forecast than the utility's own.

Then add one line on carbon: marginal and average CO2 rank tomorrow's hours differently, and marginal is the one a shift actually changes.

## 1:20–3:10 — Tomorrow's plan (2 Decide)

Open 2 Decide. Say:

> Now the signal becomes a decision. This is a 48-hour linear program in the browser, with 15-minute steps. It prices the tariff, energy, marginal CO2, machine wear and a Wattsmart reserve together.

Point to the result figures and load chart:

> The dark line is the site without storage; the green area is grid draw with the station. Spin takes the spikes at about a third of the wear, so Pulse can hold the reserve and carry the longer energy blocks.

Move the CO2 weight. Say:

> Watch the plan re-solve. Because PACE's carbon signal barely varies in this snapshot, this dial nudges the result; the tariff peak and rush-hour constraints do most of the work.

Click “Hold 1,000 kWh for Wattsmart” or move the reserve slider. Say:

> More reserve protects a future grid call, but leaves less energy available for today's bill. That is the operational trade Torus hardware makes visible.

Point at the dispatch orders and press Approve and queue for Lattice. Say:

> This is what DETOUR hands Lattice for tomorrow. Approve, and Lattice runs it; Wattsmart calls still override it.

Click See if this pays off beside the Approved stamp; it opens Record. Say that Approve is the only real action, and Record is where the plan is judged. Then, if time allows, go back and switch the rate plan between Schedule 6 and Schedule 8 and say:

> On Schedule 6 demand counts in any hour, so the station has to shave every spike; on Schedule 8 it only has to protect the on-peak window. Same engine, different plan.

Skip Under the hood unless a judge asks.

## 3:10–4:15 — The record

Open Record. Say:

> This is the honest backtest: a simple shaver, DETOUR planning one day ahead, and perfect hindsight as the ceiling. The capture rate is how much of that ceiling DETOUR reaches.

Read the lead sentence on the screen aloud:

> $11,546 saved on a simulated 2 MW Schedule 8 site, 85% of it from demand, 76% of the perfect-hindsight optimum, and 946 kWh held for Wattsmart.

Point to the year ledger at the top, which is the lead, then the calendar and the peak note:

> Same engine, every month: best is September at $13,000 and 78%, weakest is June at about 21%, and here's why: summer shoulder months have a smaller demand charge to shave. Winter runs 63 to 69%, so about two-thirds. October is the month to date.

Then click July in the ledger and say:

> One 15-minute interval sets the month's demand charge. The component bars show where the saving comes from, and the cycle bars show that a month uses only a small fraction of either machine's life.

## 4:15–4:35 — Close

Return to Start here and open How DETOUR works. Say two steps and the record, then:

> DETOUR is a planning layer above a Torus Station's real-time controller: public grid data becomes a forecast, the forecast becomes a constrained dispatch, and the month-by-month replay proves what the strategy earned. Every simulated number is labeled; every public input has a source.

Timing note: the added Approve then Record click costs about five seconds. the lead sentence, ledger line and Schedule 6/8 beat are required; the info-panel and dotted-term demo on Forecast was cut to make room. The total is estimated from word count, not yet re-timed with a stopwatch.
