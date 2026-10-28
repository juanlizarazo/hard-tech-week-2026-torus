export const startSettings = {
  SITE_ID: 'airport',
  INTERVALS_PER_DAY: 96,
  ARCHITECTURE_ID: 'architecture',
  SEQUENCE_MS: 2500,
  COUNT_UP_MS: 900,
  TYPE_START_MS: 700,
  TYPE_END_MS: 1900,
  TILES_AT_MS: 1900,
  ROTATE_PERIOD_MS: 5600,
  DISSOLVE_OUT_MS: 620,
  PROVE_SITE_ID: 'airport',
  PROVE_SCHEDULE_ID: 'schedule-8',
  ERROR_MESSAGE: "We could not read the PACE grid data. Check your connection and refresh the page.",
  EMPTY_MESSAGE: "Grid data isn't loaded yet. Refresh in a minute."
};

export const startTileSpecs = [
  { path: '/traffic', code: '01', stage: 'Forecast' },
  { path: '/plan', code: '02', stage: 'Decide' },
  { path: '/backtest', code: '03', stage: 'Prove' }
];
