import { IProvenance } from '../models';

export const backtestSettings = {
  MONTH: '2026-07',
  DEFAULT_SITE_ID: 'airport',
  NAIVE_TARGET_FRACTION: 0.8,
  WATTSMART_RESERVE_FRACTION: 0.25,
  INITIAL_PULSE_SOC_FRACTION: 0.5,
  INITIAL_SPIN_SOC_KWH: 0,
  KG_PER_KWH_PER_LB_PER_MWH: 0.45359237 / 1000,
  CENT_FACTOR: 100,
  FULL_DAY_HOURS: 24,
};

export const backtestProvenance: Record<'NAIVE_TARGET' | 'WATTSMART_RESERVE' | 'RUSH_HOUR_RULE', IProvenance> = {
  NAIVE_TARGET: {
    id: 'backtest-naive-target',
    label: 'Naive shaver target: 80% of the site nominal peak',
    kind: 'assumption',
    url: '',
    note: 'A fixed threshold. The naive shaver does not adapt to prices or forecasts.',
  },
  WATTSMART_RESERVE: {
    id: 'backtest-wattsmart-reserve',
    label: 'Wattsmart reserve: 25% of Pulse energy',
    kind: 'assumption',
    url: '',
    note: 'Energy held back in Pulse above its minimum SOC for utility dispatch. Labeled assumption.',
  },
  RUSH_HOUR_RULE: {
    id: 'backtest-rush-hour-rule',
    label: "Rush hour: each day's busiest 4-hour block of PACE demand",
    kind: 'assumption',
    url: '',
    note: 'Same rule as the Plan screen. Falls back to 4-8 p.m. on days without PACE data.',
  },
};
