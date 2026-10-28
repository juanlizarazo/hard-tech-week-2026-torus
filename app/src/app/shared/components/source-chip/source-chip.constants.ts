export const sourceKindLabels: Record<string, string> = {
  'rmp-tariff': 'Tariff',
  'eia-930': 'EIA-930',
  'caiso-oasis': 'CAISO OASIS',
  'open-meteo': 'Open-Meteo',
  assumption: 'Assumption',
  simulated: 'Simulated',
  'torus-spec': 'Torus spec',
  derived: 'Derived'
};

export const sourcePageUrls: { apiPrefix: string; pageUrl: string }[] = [
  { apiPrefix: 'https://api.eia.gov/', pageUrl: 'https://www.eia.gov/electricity/gridmonitor/' },
  { apiPrefix: 'https://oasis.caiso.com/', pageUrl: 'http://oasis.caiso.com/' },
  { apiPrefix: 'https://previous-runs-api.open-meteo.com/', pageUrl: 'https://open-meteo.com/en/docs/previous-runs-api' }
];
