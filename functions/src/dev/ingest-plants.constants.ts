export const ingestPlantsConstants = {
  EIA_CAPACITY_URL: 'https://api.eia.gov/v2/electricity/operating-generator-capacity/data/',
  EIA_CAPACITY_BROWSER_URL: 'https://www.eia.gov/opendata/browser/electricity/operating-generator-capacity',
  BALANCING_AUTHORITY: 'PACE',
  OPERATING_STATUS: 'OP',
  PAGE_LENGTH: 5000,
  STATES_URL: 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_50m_admin_1_states_provinces.geojson',
  STATES_SOURCE_URL: 'https://www.naturalearthdata.com/downloads/50m-cultural-vectors/50m-admin-1-states-provinces/',
  STATE_CODES: ['UT', 'WY', 'ID', 'NV', 'CO', 'AZ', 'MT', 'OR', 'NM'],
  STATE_SIMPLIFY_TOLERANCE_DEGREES: 0.02,
  COORDINATE_DECIMALS: 3,
  OUTPUT_DIRECTORY: '../app/public/data',
  PLANTS_FILE: 'pace-plants.json',
  STATES_FILE: 'pace-states.json',
  INTERMOUNTAIN_PLANT_PATTERN: 'intermountain',
};

export const energySourceFuelKeys: Record<string, string> = {
  BIT: 'COL',
  SUB: 'COL',
  LIG: 'COL',
  RC: 'COL',
  WC: 'COL',
  SGC: 'COL',
  NG: 'NG',
  OG: 'NG',
  BFG: 'NG',
  SUN: 'SUN',
  WAT: 'WAT',
  WND: 'WND',
};

export const excludedEnergySources = ['MWH'];
