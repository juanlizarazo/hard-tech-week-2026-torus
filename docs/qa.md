# DETOUR judge Q&A

## What is the one-sentence idea?

DETOUR reads tomorrow's PACE conditions and plans a simulated Nova Spin plus Nova Pulse station around the bill, price, carbon and Wattsmart reserve at the same time.

## Is this using real data?

PACE load, PACE's day-ahead forecast, fuel mix, EDAM price data and published Rocky Mountain Power tariff rates are public inputs. The snapshot is frozen so the demo does not depend on an upstream API. Site load profiles, asset parameters that Torus has not published, and the July replay are explicitly simulated or assumed.

## Why use marginal instead of average carbon?

Average carbon describes the existing mix. Marginal carbon estimates the extra emissions caused by one more megawatt-hour, which is the quantity a charging decision changes. DETOUR shows both because they can rank hours differently.

## Why does the carbon dial appear to do little?

PACE's carbon signal barely varies by hour in this snapshot. The dial is still in the objective, but the demand charge and rush-hour constraints dominate the decision. The UI says this plainly rather than implying carbon creates a large effect that the data does not support.

## Why is the Plan's monthly number larger than a month's proof result?

The Plan screen annualizes the peak from the selected 48-hour scenario: it asks what that peak would cost if it held for a full month. The proof uses the actual month and charges only the single peak that occurred, so its realized saving can be smaller.

## Why July? Did you cherry-pick it?

July is only the opening view. The year ledger at the top of Prove replays every month of 2026 from the same frozen snapshot, site and rate plan. July is not the strongest month for every site (September is), and the winter months still earn; the ledger shows each month's saving and capture rate side by side.

## Why is October partial?

The snapshot was pulled on October 27, so October is replayed through the last complete day, October 26. Its demand charge is the peak so far, not the month's final peak, and the ledger marks it as month to date.

## What does the Wattsmart reserve mean?

It is a Pulse-only minimum state of charge held through rush hour for a possible demand-response call. Spin can still handle short spikes; increasing the reserve trades some customer savings for grid-call readiness.

## Is the LP running on a server?

No. The browser generates the LP text and solves it with HiGHS WebAssembly. That makes the dial interaction visible and keeps the demo independent of a live optimization service.

## How honest is the backtest?

It compares no storage, a simple threshold shaver, DETOUR's rolling day-ahead plan with a live cap, and perfect hindsight. Capture rate is realized savings divided by perfect-hindsight savings. The perfect-hindsight row is a ceiling, not a claim that a real controller can see the future.

## Why not optimize the EDAM price directly for the customer?

EDAM is a wholesale signal; the Utah customer pays a Rocky Mountain Power retail tariff. DETOUR uses EDAM as a planning signal but bills the site with the published retail demand and energy charges.

## Is this a Torus customer savings claim?

No. It is a labeled, simulated Torus Station. It demonstrates the planning layer and tradeoffs without claiming real customer results or access to Lattice internals.

## What would you build next?

Validate the assumptions with a real site interval-data export, add exact rider and facilities-charge treatment from a full tariff sheet, and connect the plan to a production controller only after Torus validates the operating constraints.

## Why not ERCOT or Electricity Maps?

The bounty card lists EIA, CAISO, ERCOT, Open-Meteo and Electricity Maps as suggestions, not requirements. I use EIA (EIA-930 region and fuel-type data, EIA-860 plant capacity), CAISO OASIS (EDAM day-ahead price for PACE) and Open-Meteo (the previous-runs day-ahead forecast at three Wasatch Front points). ERCOT is the Texas grid and the site is in PACE, Utah. Electricity Maps gives only average carbon intensity, its free tier effectively covers one zone, and WattTime's own documentation says shifting load on average intensity would not reduce emissions. DETOUR computes marginal CO2 from EIA-930 instead (a Siler-Evans style regression).

## Did storage pay in every month? What about the negative cells?

Perfect hindsight saved money in every site, month and rate plan, so the hardware pays. DETOUR's replay is the part that can lose. The three small ski-resort losses on Schedule 6 (March, April, May) were a replay bug: the replay seeded its charging cap from the previous month's bill, so a falling load let it charge up to last month's peak and set this month's. It now starts each month at zero and may not charge above this month's load peak so far. The losses shrank from up to $2,109 to under $150. The one remaining cement-plant loss (July, Schedule 6, about $84) is unconfirmed; the likely cause is the CO2 weight buying carbon on a flat-rate schedule, which the screen labels as "Storage cost money this month" with the cause.

## Why is June weak and September strong?

The demand charge is most of the saving. In September the airport's evening peak is tall and narrow, so a small amount of stored energy shaves a large kW. In June the peak is flatter, so the same energy shaves fewer kW, and the saving is mostly smaller energy-price differences.

## What is Lattice?

Torus's control software that runs a station in real time. DETOUR is a planning layer above it: it hands Lattice a day of dispatch orders and Lattice still runs the real-time control. Wattsmart calls override the plan.

## What does seed 42 mean?

Every site load you see is simulated; there is no real customer. I generate it from a documented archetype (airport, cement plant, ski resort) plus seeded random noise. Seed 42 is a fixed seed, so the numbers are reproducible: re-run it anywhere and you get the same $11,546. The grid data underneath is real.

Why 42: convention, the Hitchhiker's Guide number everyone uses as a default seed. Any number works; fixing it is what matters.

Why simulate: a real meter would be one anonymous customer I could not show you. Three labeled archetypes through the same engine is a stronger proof that the method holds, and every synthetic number is labeled.

Mechanism, if asked: each day's load is hashed from "42|<site-id>|<date>" (FNV-1a) into a mulberry32 stream, so each day is independent of the others and of the replay's end date.
