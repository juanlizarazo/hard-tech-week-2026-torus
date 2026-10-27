import { ICityLabel, IMapFuel, ISitePin, IStateLabel } from './plant-map.interfaces';

export const plantMapLayout = {
  WIDTH: 600,
  PADDING: 8,
  WEST_LON: -114.25,
  EAST_LON: -104.95,
  SOUTH_LAT: 36.85,
  NORTH_LAT: 45.35,
  MIN_RADIUS: 2.5,
  RADIUS_PER_ROOT_MW: 0.62,
  MIN_OPACITY: 0.14,
  PLAY_STEP_MS: 700
};

export const plantMapSettings = {
  PLANTS_URL: 'data/pace-plants.json',
  STATES_URL: 'data/pace-states.json',
  HISTORY_DAYS: 14,
  FALLBACK_HOUR: 16,
  PACE_STATE_CODES: ['UT', 'WY', 'ID'],
  FOSSIL_FUEL_KEYS: ['COL', 'NG'],
  EIA_930_URL: 'https://www.eia.gov/electricity/gridmonitor/dashboard/electric_overview/balancing_authority/PACE',
  HONESTY_NOTE: 'EIA reports fuel totals for PACE, not plant-by-plant output by hour.'
};

export const mapFuels: IMapFuel[] = [
  { key: 'COL', label: 'Coal', color: '#8c4826' },
  { key: 'NG', label: 'Gas', color: '#c4704f' },
  { key: 'SUN', label: 'Solar', color: '#d1ad00' },
  { key: 'WND', label: 'Wind', color: '#4f78c4' },
  { key: 'WAT', label: 'Hydro', color: '#0e927e' },
  { key: 'OTH', label: 'Other', color: '#8f969c' }
];

export const cityLabels: ICityLabel[] = [
  { label: 'Ogden', lon: -111.9738, lat: 41.223, dx: 16, dy: -6 },
  { label: 'Salt Lake City', lon: -111.891, lat: 40.7608, dx: 22, dy: 0 },
  { label: 'Provo', lon: -111.6585, lat: 40.2338, dx: 22, dy: 6 },
  { label: 'St. George', lon: -113.5684, lat: 37.0965, dx: 10, dy: -12 }
];

export const sitePin: ISitePin = {
  label: 'Simulated airport',
  note: 'illustrative location',
  lon: -112.02,
  lat: 40.79,
  labelLon: -113.3,
  labelLat: 39.95
};

export const stateLabels: IStateLabel[] = [
  { code: 'UT', label: 'Utah', lon: -113.35, lat: 38.75 },
  { code: 'WY', label: 'Wyoming', lon: -107.6, lat: 44.55 },
  { code: 'ID', label: 'Idaho', lon: -113.75, lat: 44.75 }
];
