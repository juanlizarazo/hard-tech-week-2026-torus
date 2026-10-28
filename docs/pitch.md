# DETOUR pitch and demo

Four and a half minutes. Airport, Schedule 8, default dials. **Read every number off the screen**: they change whenever the 3 p.m. snapshot refreshes. The numbers below are from the Oct 28 snapshot.

## Remember

- **LP (linear program):** a solver that finds the cheapest schedule that obeys every rule. Choices: what Spin and Pulse do every 15 minutes for 48 hours. Goal: bill + carbon + wear + grid relief. Rules: power and energy limits, losses, the Wattsmart reserve. HiGHS solves it in your browser in about 50 ms.
- **Spin** = Nova Spin flywheel: short spikes, low wear. **Pulse** = Nova Pulse battery: long blocks, holds the Wattsmart reserve.
- **PACE** = PacifiCorp East, Utah's grid. **EDAM** = CAISO's day-ahead market PACE joined on May 1, 2026.
- **Fixed-threshold battery** = the baseline: same hardware, one rule (discharge above 80% of the site's peak).
- **Perfect hindsight** = the same planner told the whole month in advance. It is the 100% mark.
- Simulated: the site load (seed 42) and the station. Real: PACE grid data, prices, weather, Rocky Mountain Power tariffs.

## The pitch (30 seconds)

> The grid has a rush hour, and most software ignores it. A Utah business with a Torus Station lives on three clocks that disagree: the bill, the grid and the carbon. One kilowatt of summer peak demand costs $16.84 every month; moving one kilowatt-hour to a cheaper hour saves about 3 cents. So one kW off the peak is worth moving 550 kWh.
>
> DETOUR is a navigation app for that station. Every afternoon at 3 it reads tomorrow's Utah grid, plans the flywheel and battery around it with a linear program, and hands Torus's controller a route. Then it replays all of 2026 to prove the plan pays.

## Demo

### 0:30 Start here

Point at the hook and the plant map.

> These towers are real PACE power plants. Every site number is simulated and labeled; every grid number is real.

### 0:50 1 Forecast: is the grid jammed?

The map opens at rush hour. Drag the hour cursor or press Play.

> This is the traffic report: PACE's load, the EDAM day-ahead price and marginal CO2, hour by hour. Rush hour is 6 to 10 p.m., when solar is gone and coal and gas carry the load.

Point at the forecast comparison.

> I also built my own load forecast. It misses by 3.4% in a typical hour; PACE's own day-ahead forecast misses by 4.8%.

### 1:30 2 Decide: stay out of traffic

Read the answer line.

> Tomorrow, the airport takes 531 kilowatts off PACE's rush hour and is worth about $8,600 a month on the bill. The plan never saw tomorrow's load. It planned from a forecast of the last four weeks, and the number you see is checked against the simulated day.

Open D0, Tomorrow's route, and read it top to bottom.

> This is the route: charge overnight in the price trough, cap the grid through the on-peak window, discharge through rush hour, hold 800 kWh for a Wattsmart call. Spin catches the short spikes at a third of the battery's wear, which leaves Pulse free to hold the reserve.

Move the **Grid relief** dial up.

> How would I manage the grid's congestion? I price it. This dial is what one kW off PACE's rush peak is worth. The linear program re-solves in about 50 milliseconds, right here in the browser. Past a point it stops moving: the Wattsmart reserve and the forecast are the limit, not the price.

Press **Approve and queue for Lattice**, then **Share → Download PDF**.

> Approve hands the orders to Torus's controller. Simulated here; no device is connected. The plan leaves the screen as a link or a PDF with a QR code.

Click **See if this pays off**.

### 3:10 Record: does it pay?

Read the year ledger.

> Replayed day by day across 2026, with each day planned from a forecast: $88,928 saved so far, 57% of perfect hindsight, which is the best any planner could do knowing the whole month in advance. September is the best month at $13,000 and 78%.

Click July.

> One 15-minute interval sets the month's demand charge. 85% of July's saving comes from the demand charge, and 946 kWh stayed held for Wattsmart.

### 4:00 Close

> DETOUR knows when Utah's grid is jammed, plans a Torus Station to stay out of it, and proves what that is worth with real tariffs and real grid data. A day-ahead navigation app for electricity.

## If a judge asks

| Question | Answer |
|---|---|
| Is the site real? | No. Simulated, seed 42, labeled everywhere. The grid data, prices and tariffs are real |
| Does it know tomorrow's load? | No. It plans from a forecast of the last four weeks and checks the result against the simulated day |
| Why is June weak? | The forecast, not the planner. June's peak days don't look like the four weeks before them. With a perfect forecast the same planner captures 96% of June |
| Why does the fixed-threshold battery win on Schedule 6? | On Schedule 6 every hour can set the demand charge, so reacting to each spike as it happens beats a plan built a day ahead. A better site forecast closes the gap |
| Why does carbon barely move the plan? | PACE's marginal CO2 is nearly flat by hour in this data. The dial is in the objective; the bill dominates |
| Is it an AI agent? | An autonomous daily planner: a scheduled 3 p.m. data pull, then a linear program makes every decision. No LLM on the decision path |
| Does it run itself? | Scheduled daily at 3 p.m. Mountain. The run log shows each step with its real timestamp |
| Why not ERCOT or Electricity Maps? | ERCOT is Texas; the site is in Utah. Electricity Maps gives average carbon; shifting load needs marginal, which DETOUR computes from EIA-930 |
| Why 100 stations? | Illustrative, and labeled: one site is too small to show up in PACE's load |
