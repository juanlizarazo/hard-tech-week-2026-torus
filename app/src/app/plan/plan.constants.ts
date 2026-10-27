export const planBaseline = {
  MONTH: '2026-07'
};

export const planDefaults = {
  SITE_ID: 'airport',
  DATE_MODE: 'target',
  PEAK_SO_FAR_MODE: 'fresh',
  CO2_WEIGHT_PER_KG: 0.1,
  CO2_WEIGHT_MAX_PER_KG: 0.4,
  CO2_WEIGHT_STEP_PER_KG: 0.01,
  RESERVE_STEP_KWH: 50,
  JULY_PEAK_FALLBACK_DATE: '2026-07-15',
  SOLVE_DEBOUNCE_MS: 120
} as const;
