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

July is only the opening view. The year ledger at the top of Prove replays every month of 2026 from the same frozen snapshot, site and rate plan. July is not the strongest month for every site, and the winter months still earn; the ledger shows each month's saving and capture rate side by side.

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
