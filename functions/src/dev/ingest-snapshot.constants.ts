import { tmpdir } from 'os';
import { join } from 'path';

const scratchDirectory = process.env['DETOUR_INGEST_SCRATCH'] ?? join(tmpdir(), 'detour-ingest');

export const ingestConstants = {
  PROJECT_ID: 'hard-tech-week-2026-torus',
  SECRET_ACCOUNT: 'juan@mindignitegroup.com',
  SECRET_NAME: 'EIA_API_KEY',
  TIMEZONE: 'America/Denver',
  RESPONDENT: 'PACE',
  YEARS_BACK: 2,
  LOOKAHEAD_DAYS: 3,
  EIA_REGION_URL: 'https://api.eia.gov/v2/electricity/rto/region-data/data/',
  EIA_FUEL_URL: 'https://api.eia.gov/v2/electricity/rto/fuel-type-data/data/',
  EIA_PAGE_LENGTH: 5000,
  EIA_DELAY_MS: 300,
  EIA_MAX_ATTEMPTS: 4,
  OASIS_URL: 'https://oasis.caiso.com/oasisapi/SingleZip',
  OASIS_NODE: 'ELAP_PACE-APND',
  OASIS_TAC_AREA: 'PACE',
  OASIS_PRICE_START: '2026-05-01T00:00:00Z',
  OASIS_CHUNK_DAYS: 30,
  OASIS_DELAY_MS: 5500,
  OASIS_RETRY_DELAY_MS: 9000,
  OASIS_MAX_ATTEMPTS: 5,
  DEMAND_FORECAST_RATIO_MIN: 0.5,
  DEMAND_FORECAST_RATIO_MAX: 2,
  MONTH_SIZE_WARNING_BYTES: 900 * 1024,
  FIRESTORE_DOCUMENT_LIMIT_BYTES: 1024 * 1024,
  DEFAULT_OUTPUT_DIRECTORY: `${scratchDirectory}/ingest-dry`,
  CACHE_DIRECTORY: `${scratchDirectory}/ingest-cache`,
} as const;

export const eiaRegionTypes = {
  DEMAND: 'D',
  DAY_AHEAD_FORECAST: 'DF',
  NET_GENERATION: 'NG',
  TOTAL_INTERCHANGE: 'TI',
} as const;

export const oasisPriceFieldByDataItem = {
  LMP_PRC: 'lmp',
  LMP_ENE_PRC: 'energy',
  LMP_CONG_PRC: 'congestion',
  LMP_LOSS_PRC: 'loss',
  LMP_GHG_PRC: 'ghg',
} as const;

export const gridHourFlags = {
  IMPLAUSIBLE_FORECAST: 'implausible-df',
  IMPLAUSIBLE_DEMAND: 'implausible-demand',
  FORECAST_FROM_OASIS: 'df-oasis',
} as const;
