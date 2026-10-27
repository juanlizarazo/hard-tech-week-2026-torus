export const trafficConfig = {
  RUSH_HOUR_HOURS: 4,
  TOP_THIRD: 2 / 3,
  TREND_DAYS: 7,
  WINDOW_DAYS: 3,
  HIGHLIGHT_RANK_SHIFTS: 3,
};

export const trafficClocks = {
  STRESS: 'grid stress',
  PRICE: 'price',
  CARBON: 'carbon',
};

export const trafficLimitations: string[] = [
  'Fuel-level, not unit-level: EIA-930 reports coal and gas totals, not which plant moved.',
  'Imports are not attributed. The shaded import band shows how much lower the number gets when demand changes are partly met by imports.',
  'One gas factor covers combined-cycle and combustion turbines, so hours when a peaker is on the margin are understated.',
  'Midday coal must-run and solar curtailment make the midday number noisy; read the interval, not the line.',
  'A linear factor assumes small changes in load. It is not a forecast of what a large battery would displace.',
];

export const trafficMethodSteps: string[] = [
  'Hourly emissions E = coal MWh x 2,260 + gas MWh x 970 lb CO2/MWh.',
  'Take hour-over-hour changes (consecutive UTC hours only) of E and of generation (or demand).',
  'Within each hour-of-day x season group, regress change in E on change in generation. The slope is the marginal emissions factor; the band is the 95% interval.',
  'Run it twice: on PACE fossil generation (Siler-Evans) and on PACE demand. The gap between the two is the import band.',
];

export const trafficCalendar = {
  WEEKDAYS: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};
