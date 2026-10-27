export const loadForecastConfig = {
  LAG_HOURS_SHORT: 48,
  LAG_HOURS_SEASONAL: 168,
  BUFFER_DAYS: 7,
  HDD_BASE_F: 65,
  CDD_BASE_F: 65,
  CDD_HINGE_F: 80,
  HDD_HINGE_F: 45,
  HOUR_BLOCK_SIZE: 6,
  QUANTILE_LOW: 0.1,
  QUANTILE_HIGH: 0.9,
  LAMBDA_CANDIDATES: [0.1, 1, 10, 100],
  LAMBDA: 100,
};

export const weatherWeights: Record<string, number> = {
  SALT_LAKE_CITY: 0.4799,
  OGDEN: 0.253,
  PROVO: 0.2671,
};

export const weatherWeightsProvenance = {
  id: 'weather-weights-census-2020',
  label: 'Weather points weighted by 2020 Census county population (Salt Lake, Davis+Weber, Utah counties)',
  kind: 'assumption' as const,
  url: 'https://www.census.gov/quickfacts/fact/table/US/PST045224',
  note: 'Salt Lake 1,185,238; Davis + Weber 624,902; Utah 659,399. An assumption, not a load-weighted weighting.',
};

export const forecastProvenance = {
  OURS: {
    id: 'detour-ridge-forecast',
    label: 'Our ridge regression day-ahead demand forecast',
    kind: 'simulated' as const,
    url: '',
    note: 'Scored out-of-sample with monthly blocked cross-validation, 7-day buffer against lag leakage',
  },
  PACE_DF: {
    id: 'eia930-day-ahead-forecast',
    label: "PACE's own day-ahead demand forecast (DF)",
    kind: 'eia-930' as const,
    url: 'https://www.eia.gov/opendata/browser/electricity/rto/region-data',
  },
  NAIVE: {
    id: 'seasonal-naive-168h',
    label: 'Same hour last week',
    kind: 'simulated' as const,
    url: '',
  },
};
