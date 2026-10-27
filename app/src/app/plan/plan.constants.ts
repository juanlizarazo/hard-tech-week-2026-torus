import { IPlanTryChip } from './plan.interfaces';

export const planBaseline = {
  MONTH: '2026-07'
};

export const planDefaults = {
  SITE_ID: 'airport',
  DATE_MODE: 'target',
  PEAK_SO_FAR_MODE: 'fresh',
  CO2_WEIGHT_PER_KG: 0.1,
  CO2_WEIGHT_MAX_PER_KG: 0.5,
  CO2_WEIGHT_STEP_PER_KG: 0.01,
  RESERVE_STEP_KWH: 50,
  JULY_PEAK_FALLBACK_DATE: '2026-07-15',
  SOLVE_DEBOUNCE_MS: 120
} as const;

export const planDeltaSettings = {
  MIN_CHANGE: 0.5,
  VISIBLE_MS: 4000
};

export const planTryChips: IPlanTryChip[] = [
  {
    id: 'reserve',
    label: 'Hold 1,000 kWh for Wattsmart',
    effect: 'Watch Spin take over the spikes.',
    changes: { wattsmartReserveKwh: 1000 }
  },
  {
    id: 'schedule-6',
    label: 'Switch to Schedule 6',
    effect: 'The demand window disappears.',
    changes: { scheduleId: 'schedule-6' }
  },
  {
    id: 'ski-resort',
    label: 'Try the ski resort',
    effect: 'A 0.9 MW site: a smaller peak, so a smaller prize.',
    changes: { siteId: 'ski-resort' }
  },
  {
    id: 'july-peak',
    label: "Load July's peak day",
    effect: 'Summer rates on the busiest weekday of July.',
    changes: { dateMode: 'july-peak' }
  }
];
