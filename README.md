# DETOUR

**A day-ahead rush-hour planner for hybrid storage on Utah's grid.**

Built solo for the Torus bounty (Option 1: Rush Hour for Electrons) at the Hard Tech Hackathon, Hard Tech Week 2026, Salt Lake City.

> 🚧 In progress — built Oct 26–28, 2026.

## The problem

The grid has a rush hour: demand spikes, prices jump, solar fades. A Torus site (a Nova Spin flywheel plus a Nova Pulse battery, behind the meter at a Utah business) lives on three clocks that disagree:

- **The bill.** One 15-minute spike sets the whole month's demand charge. On Rocky Mountain Power Schedule 8, a kW of summer on-peak demand costs $16.84/month, while shifting a kWh off-peak earns about 3.1¢.
- **The grid.** Since PacifiCorp joined CAISO's day-ahead market on May 1, 2026, tomorrow's Utah (PACE) prices are public before the day starts, and they go negative at midday.
- **The carbon.** What matters for shifting load is marginal emissions, not the average, and the two rank hours differently.

On top of that, a Wattsmart demand-response call can drain the battery right before the customer's own peak.

## What DETOUR does

1. **Traffic report.** Reads tomorrow's PACE grid conditions: load forecast, day-ahead prices, marginal CO2 by hour.
2. **Plan.** Solves an LP in 15-minute steps that decides when the site's flywheel and battery charge and discharge. It cuts the customer's bill, avoids dirty hours and keeps a reserve for Wattsmart.
3. **Proof.** Backtests a month against a naive peak-shaver and a perfect-foresight optimum, and reports how much of the possible savings it captured.

## Data

Free and public: EIA-930 (PACE demand, forecast, fuel mix), CAISO OASIS (PACE day-ahead prices), Open-Meteo (weather and solar), Rocky Mountain Power Utah tariffs.

**Site load profiles and Torus asset parameters are simulated and labeled as such.** No real Torus customer data is used.

## Stack

Angular 21+ · Angular Material · SCSS · Firebase Cloud Functions · Firestore · highs-js (LP solver)

## Repo

| Path | What |
|------|------|
| `brief/` | Bounty card and working brief |
| `research/` | Domain research behind the design |
| `plans/` | Build plan and per-phase plans |
| `rules/`, `prompts/`, `AGENTS.md` | Agent rules and prompts |

Built from my [hackathon starter kit](https://github.com/juanlizarazo/hackathon-starter-kit).
