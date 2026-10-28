import { IGlossaryEntry } from './glossary.interfaces';

export const glossary = {
  RUSH_HOUR: {
    term: 'Rush hour',
    short: "The four hours in a row with the most load in PACE's day-ahead forecast for the planning day.",
    long: "DETOUR adds up PACE's day-ahead load forecast over every run of four straight hours in the day and picks the run with the highest total. Any hour the forecast skips uses PACE's measured demand instead. When no forecast is posted yet, it falls back to a fixed late-afternoon block and says so. The next day's window is assumed to repeat at the same hours.",
    whyItMatters: 'The Torus Station tries to keep the site off the grid in this window, and the Wattsmart reserve is held through it.'
  },
  PACE: {
    term: 'PACE',
    short: "PacifiCorp East, the grid operator that balances supply and demand across Utah, Wyoming and Idaho.",
    long: 'PACE is a balancing authority, not a market operator. It publishes hourly load, generation by fuel and its own day-ahead load forecast through the EIA.',
    whyItMatters: "Every grid number on these screens is PACE's: its load, its prices and the CO2 of its power plants."
  },
  EDAM: {
    term: 'EDAM',
    short: "The Extended Day-Ahead Market, run by California's grid operator. PacifiCorp joined it on May 1, 2026.",
    long: "EDAM sets tomorrow's wholesale prices for PACE before the day starts. Those prices are public, so they are known when the plan is made. Utah businesses do not pay them directly.",
    whyItMatters: 'The price lane shows when power is cheap or dear for the grid, which is a different clock from the retail bill.'
  },
  LMP: {
    term: 'LMP',
    short: 'Locational marginal price: the wholesale price of one more MWh at a point on the grid.',
    long: 'It adds up the cost of energy, the cost of congestion on the lines and the cost of losses. DETOUR shows the PACE day-ahead LMP from EDAM in $/MWh.',
    whyItMatters: 'It tells you which hours are expensive for the grid as a whole.'
  },
  NET_LOAD: {
    term: 'Net load',
    short: 'Demand minus wind and solar output.',
    long: 'Net load is what the rest of the power plants have to supply. It dips at midday when solar is strong and climbs fast in the evening when the sun sets.',
    whyItMatters: 'The evening climb in net load is the stressful, expensive part of the grid day.'
  },
  MAPE: {
    term: 'MAPE',
    short: 'Mean absolute percentage error: how far off a forecast is in a typical hour.',
    long: 'Take the miss in each hour as a percent of the actual value, drop the sign and average. Lower is better. A MAPE of 4% means the forecast is usually within about 4%.',
    whyItMatters: "It is how DETOUR's own forecast is scored against PACE's."
  },
  BIAS: {
    term: 'Bias',
    short: 'Whether a forecast runs high or low on average.',
    long: 'Bias averages the misses with their sign kept. A positive bias means the forecast tends to come in high; a negative bias means it tends to come in low.',
    whyItMatters: 'A forecast that is usually low at the peak can catch a site off guard.'
  },
  P10_P90: {
    term: 'P10–P90 band',
    short: 'The range the actual value should fall inside about 80% of the time.',
    long: 'P10 is the level actual load beat 90% of the time in past forecasts; P90 is the level it stayed under 90% of the time. The band is built from past forecast misses for the same hour and season.',
    whyItMatters: 'It shows how much to trust the forecast line, hour by hour.'
  },
  MARGINAL_CO2: {
    term: 'Marginal CO2',
    short: 'The extra CO2 the grid emits when a site uses one more MWh in that hour.',
    long: 'It is estimated from how PACE coal and gas output moved when demand moved, hour by hour, over two years of EIA data. Average CO2 divides all emissions by all generation instead, which is right for annual reporting but not for deciding when to use power.',
    whyItMatters: 'Moving load changes the marginal plant, so marginal CO2 is the right number for a battery plan.'
  },
  AVERAGE_CO2: {
    term: 'Average CO2',
    short: "All of PACE's power plant CO2 in an hour divided by all of its generation.",
    long: 'Average CO2 is what companies use to report their yearly emissions. It ranks hours differently from marginal CO2, because the cleanest hour on average can still have a coal plant on the margin.',
    whyItMatters: 'Using the average would send the battery to the wrong hours.'
  },
  IMPORT_BAND: {
    term: 'Import band',
    short: 'The spread between two ways of estimating marginal CO2.',
    long: 'One estimate follows PACE fossil generation, the other follows PACE demand. When demand changes are partly met by imports or by wind and solar, the two disagree. The band between them is the honest uncertainty.',
    whyItMatters: 'Read the band, not just the line, when comparing hours.'
  },
  SCHEDULE_6: {
    term: 'Schedule 6',
    short: 'Rocky Mountain Power general service rate where demand is billed in any hour of the month.',
    long: 'The demand charge uses the single highest 15-minute interval of the month, whenever it happens. Energy is a flat price per kWh.',
    whyItMatters: 'The station has to shave every spike, not just the ones in the afternoon.'
  },
  SCHEDULE_8: {
    term: 'Schedule 8',
    short: 'Rocky Mountain Power large general service rate where demand is billed only in on-peak hours.',
    long: 'Summer on-peak demand costs $16.84 per kW each month. Spikes outside the on-peak window only count toward the smaller facilities charge, and energy has an on-peak and an off-peak price.',
    whyItMatters: 'The station can save its energy for the on-peak window and ignore spikes outside it.'
  },
  DEMAND_CHARGE: {
    term: 'Demand charge',
    short: 'A monthly charge per kW on the single highest 15-minute interval.',
    long: 'One busy quarter hour sets the charge for the whole month. On Schedule 8 in summer it is $16.84 per kW, which equals the energy-price gap on about 550 kWh.',
    whyItMatters: 'This is where most of the money is, so the plan works hardest to flatten peaks.'
  },
  ON_PEAK_DEMAND: {
    term: 'On-peak demand',
    short: 'The highest 15-minute draw inside the tariff on-peak hours.',
    long: 'On Schedule 8 this is what the big demand charge is billed on. Peaks outside the window are not counted here.',
    whyItMatters: 'Shaving it is the single largest saving on the bill.'
  },
  FACILITIES_CHARGE: {
    term: 'Facilities charge',
    short: "A smaller monthly charge per kW on the site's highest draw in any hour.",
    long: 'It pays for the wires that serve the site. On Schedule 8 it applies to the all-hours peak, while the demand charge applies only to the on-peak peak.',
    whyItMatters: 'Off-peak spikes still cost something, so the plan does not ignore them entirely.'
  },
  RIDERS: {
    term: 'Riders',
    short: 'Extra line items added on top of the base rates, such as taxes and program surcharges.',
    long: 'Riders change through the year and are not in the base tariff sheets. DETOUR bills base rates only and says so.',
    whyItMatters: 'Real bills are somewhat higher, so the savings shown are a little conservative in dollars.'
  },
  BILLED_DEMAND: {
    term: 'Billed demand',
    short: 'The kW number the demand charge is multiplied by.',
    long: "It is the highest 15-minute average draw in the billed hours of the month, measured at the site's meter.",
    whyItMatters: 'The dashed line on the load chart shows where the plan holds it.'
  },
  PEAK_SO_FAR: {
    term: 'Peak so far',
    short: "The month's highest billed draw before the planned days.",
    long: 'Once a peak is set, shaving below it saves nothing this month. The plan floors its demand target at the peak so far when you choose month to date.',
    whyItMatters: 'Late in a month, the plan switches from shaving peaks to saving energy and CO2.'
  },
  CO2_WEIGHT: {
    term: 'CO2 weight',
    short: 'How many dollars the plan will pay to avoid one kg of CO2.',
    long: 'At $0 the plan only cares about the bill. Raise it and the plan shifts more charging into low-carbon hours, even when that costs a little more.',
    whyItMatters: 'It is the dial between saving money and saving CO2.'
  },
  WATTSMART: {
    term: 'Wattsmart',
    short: "Rocky Mountain Power's battery program that can call on stored energy when the grid is stressed.",
    long: 'Torus is an approved provider. A site in the program keeps energy in reserve so it can respond to a call during rush hour.',
    whyItMatters: 'Energy held for Wattsmart cannot be used to shave the bill, and the plan shows that trade-off.'
  },
  RESERVE_FLOOR: {
    term: 'Reserve floor',
    short: 'The minimum energy the battery keeps through rush hour for a Wattsmart call.',
    long: 'The plan is not allowed to drain the station below this level during the rush-hour window. Outside the window the floor goes away.',
    whyItMatters: 'A higher floor means more grid support and a smaller bill saving.'
  },
  SOC: {
    term: 'State of charge',
    short: 'How full a battery or flywheel is, as energy stored.',
    long: 'Often written SOC. DETOUR shows it as a percent of the usable range of each machine.',
    whyItMatters: 'It shows when each machine charges and when it is spent.'
  },
  NOVA_SPIN: {
    term: 'Nova Spin',
    short: "Torus's flywheel: high power for minutes, with about 25,000 cycles of life.",
    long: 'A spinning mass stores energy as motion. It can push or absorb power almost instantly but holds only minutes of energy. Power and life figures here are assumptions where Torus has not published them.',
    whyItMatters: 'It takes the short, sharp spikes so the battery does not wear out on them.'
  },
  NOVA_PULSE: {
    term: 'Nova Pulse',
    short: "Torus's lithium iron phosphate battery: hours of energy, about 7,500 cycles of life.",
    long: 'It holds much more energy than the flywheel but changes power more slowly and wears faster per kWh moved.',
    whyItMatters: 'It carries the energy through rush hour and holds the Wattsmart reserve.'
  },
  TORUS_STATION: {
    term: 'Torus Station',
    short: 'A Nova Spin flywheel and a Nova Pulse battery installed together at one site.',
    long: 'Every station on these screens is simulated. Site loads come from a seeded generator and some asset figures are assumptions.',
    whyItMatters: 'The plan decides, every 15 minutes, which machine does what.'
  },
  CYCLES: {
    term: 'Equivalent full cycles',
    short: 'Total energy moved through a machine divided by its usable capacity.',
    long: 'Two half discharges count as one full cycle. Comparing cycles used with rated cycle life shows how much of the machine a strategy wears out.',
    whyItMatters: 'A saving that burns through battery life is not a real saving.'
  },
  LP: {
    term: 'LP',
    short: 'A linear program: a set of equations a solver can optimize exactly.',
    long: "DETOUR writes tomorrow's bill, CO2 and machine limits as one LP over 192 fifteen-minute steps, then finds the cheapest plan that breaks no rule. The full text of the LP is under the hood.",
    whyItMatters: 'Every number in the plan traces to a line in that LP.'
  },
  HIGHS: {
    term: 'HiGHS',
    short: 'An open-source optimization solver that runs inside your browser.',
    long: 'DETOUR loads HiGHS as WebAssembly, so every change to a dial re-solves the plan on your device in well under a second.',
    whyItMatters: 'Nothing is precomputed: the plan you see is solved live.'
  },
  SIMPLE_SHAVER: {
    term: 'Simple shaver',
    short: 'A baseline strategy that discharges whenever load goes above a fixed line.',
    long: 'It reads no prices, no forecast and no CO2. It is what a basic peak-shaving controller would do with the same Torus Station.',
    whyItMatters: 'Beating it shows the value of planning ahead, not just of owning storage.'
  },
  PERFECT_HINDSIGHT: {
    term: 'Perfect hindsight',
    short: 'The best plan possible if the whole month were known in advance.',
    long: 'Also called the oracle. It solves the same LP over the real loads of the month at once. No real controller can reach it.',
    whyItMatters: 'It is the ceiling that the capture rate is measured against.'
  },
  CAPTURE_RATE: {
    term: 'Capture rate',
    short: 'Savings achieved divided by the savings perfect hindsight would have made.',
    long: 'A capture rate of 80% means DETOUR, planning one day ahead with forecasts, got 80% of the way to the best possible result.',
    whyItMatters: 'It is an honest score: it cannot be inflated by picking an easy baseline.'
  },
  KW: {
    term: 'kW',
    short: 'Kilowatts: how fast power is being drawn at one moment. Think speed.',
    long: 'A site drawing 2,000 kW right now is moving fast. The demand charge bills the fastest 15 minutes of the month, in dollars per kW.',
    whyItMatters: 'Cutting the peak kW, even for 15 minutes, is where most of the bill saving comes from.'
  },
  KWH: {
    term: 'kWh',
    short: 'Kilowatt-hours: how much energy was used over time. Think distance.',
    long: 'Drawing 1 kW for one hour uses 1 kWh. Energy charges bill every kWh, at a higher price in on-peak hours.',
    whyItMatters: 'Moving a kWh to a cheaper hour saves cents; trimming a kW of peak saves dollars.'
  },
  LATTICE: {
    term: 'Lattice',
    short: "Torus's control software that runs a station in real time.",
    long: 'DETOUR plans a day ahead and hands Lattice the dispatch orders. Lattice runs the real-time control, and Wattsmart calls override the plan.',
    whyItMatters: 'DETOUR is a planning layer above Lattice, not a replacement for it.'
  },
  THREE_CLOCKS: {
    term: 'Three clocks',
    short: 'The bill, the grid price and the carbon each say a different hour is expensive.',
    long: 'The bill punishes on-peak spikes, the wholesale price peaks with the evening ramp and the marginal CO2 follows which plant is on the margin. DETOUR plans against all three at once.',
    whyItMatters: 'A plan that follows only one clock leaves money or CO2 on the table.'
  }
} satisfies Record<string, IGlossaryEntry>;
