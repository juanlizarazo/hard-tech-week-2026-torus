export const trafficConfig = {
  RUSH_HOUR_HOURS: 4,
  TOP_THIRD: 2 / 3,
  TREND_DAYS: 7,
  WINDOW_DAYS: 3,
};

export const trafficClocks = {
  STRESS: 'grid stress',
  PRICE: 'price',
  CARBON: 'carbon',
};

export const trafficLimitations = [
  'Fuel-level, not unit-level: EIA-930 reports coal and gas totals, not which plant moved.',
  'Imports are not attributed. The shaded import band shows how much lower the number gets when demand changes are partly met by imports.',
  'One gas factor covers combined-cycle and combustion turbines, so hours when a peaker is on the margin are understated.',
  'Midday coal must-run and solar curtailment make the midday number noisy; read the interval, not the line.',
  'A linear factor assumes small changes in load. It is not a forecast of what a large battery would displace.',
];

export const trafficMethodSteps = [
  'Hourly emissions E = coal MWh x 2,260 + gas MWh x 970 lb CO2/MWh.',
  'Take hour-over-hour changes (consecutive UTC hours only) of E and of generation (or demand).',
  'Within each hour-of-day x season group, regress change in E on change in generation. The slope is the marginal emissions factor; the band is the 95% interval.',
  'Run it twice: on PACE fossil generation (Siler-Evans) and on PACE demand. The gap between the two is the import band.',
];

export const trafficCalendar = {
  WEEKDAYS: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  MONTHS: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

export const forecastMethodSteps = [
  'Features: hour-of-day x weekday/weekend-or-holiday dummies, two annual sine/cosine harmonics, heating/cooling degree days and hinges by time-of-day block, population-weighted GHI, and demand lagged 48 and 168 hours — all known the morning before PACE publishes its own forecast.',
  'Weather is Open-Meteo’s previous-runs day-ahead forecast (not observed weather), so the model only ever sees what was knowable the day before, at Salt Lake City, Ogden and Provo, weighted by county population.',
  'A ridge regression (closed-form, L2-penalized) is scored out-of-sample with monthly blocked cross-validation: each month is predicted by a model fit on every other month, minus a 7-day buffer so the lag features cannot leak that month’s own actuals.',
  'P10/P90 are the empirical 10th/90th percentile of the out-of-fold residual, by hour-of-day and season.',
  'Caveat: the model sees later months’ actual load during cross-validation, never their weather; weather inputs are always forecasts, never observations.',
];

export const forecastLimitations = [
  'Demand, not net load: the forecast targets the same quantity as PACE’s own day-ahead forecast. The load chart’s net-load line stays phase 03’s trailing-average estimate.',
  'Three weather points stand in for the whole PACE footprint, weighted by county population, not by actual load share.',
  'Monthly blocked cross-validation is an approximation of a true day-ahead backtest: later months’ load (never their weather) is visible during fitting.',
  'A linear model with hand-picked features. It will miss non-linear effects a more complex model could capture.',
];
