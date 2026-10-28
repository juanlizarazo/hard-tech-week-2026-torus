
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
  GRID_RELIEF_PER_KW: 1,
  GRID_RELIEF_MAX_PER_KW: 20,
  GRID_RELIEF_STEP_PER_KW: 0.5,
  JULY_PEAK_FALLBACK_DATE: '2026-07-15',
  SOLVE_DEBOUNCE_MS: 120
} as const;

export const planDeltaSettings = {
  MIN_CHANGE: 0.5,
  VISIBLE_MS: 4000
};

export const planFleetSettings = {
  STATIONS: 100,
  KW_PER_MW: 1000,
  MIN_CUT_KW: 0.5
};
