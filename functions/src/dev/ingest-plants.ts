import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { DevCredentialsService } from './dev-credentials.service';
import { energySourceFuelKeys, excludedEnergySources, ingestPlantsConstants } from './ingest-plants.constants';
import { IngestPlantsHelper } from './ingest-plants.helper';
import { IEiaGeneratorRow, INaturalEarthFeature, IPlantsFile, IStatesFile } from './ingest-plants.interfaces';

function capacityUrl(apiKey: string, offset: number, length: number, period: string | null): string {
  const parameters = new URLSearchParams();
  parameters.set('api_key', apiKey);
  parameters.set('frequency', 'monthly');
  parameters.append('data[]', 'nameplate-capacity-mw');
  parameters.append('data[]', 'net-summer-capacity-mw');
  parameters.append('data[]', 'latitude');
  parameters.append('data[]', 'longitude');
  parameters.append('facets[balancing_authority_code][]', ingestPlantsConstants.BALANCING_AUTHORITY);
  parameters.append('facets[status][]', ingestPlantsConstants.OPERATING_STATUS);
  parameters.set('sort[0][column]', 'period');
  parameters.set('sort[0][direction]', 'desc');
  parameters.set('offset', String(offset));
  parameters.set('length', String(length));

  if (period) {
    parameters.set('start', period);
    parameters.set('end', period);
  }

  return `${ingestPlantsConstants.EIA_CAPACITY_URL}?${parameters.toString()}`;
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Request failed ${response.status} for ${url.replace(/api_key=[^&]+/, 'api_key=***')}`);
  }

  return (await response.json()) as T;
}

async function fetchGeneratorRows(apiKey: string): Promise<{ period: string; rows: IEiaGeneratorRow[] }> {
  const latest = await fetchJson<{ response: { data: IEiaGeneratorRow[] } }>(capacityUrl(apiKey, 0, 1, null));
  const period = latest.response.data[0]?.period;

  if (!period) {
    throw new Error('EIA returned no operating generators for PACE');
  }

  const rows: IEiaGeneratorRow[] = [];
  let offset = 0;
  let total = Infinity;

  while (offset < total) {
    const page = await fetchJson<{ response: { total: string; data: IEiaGeneratorRow[] } }>(
      capacityUrl(apiKey, offset, ingestPlantsConstants.PAGE_LENGTH, period)
    );
    total = Number(page.response.total);
    rows.push(...page.response.data);
    offset += ingestPlantsConstants.PAGE_LENGTH;
  }

  return { period, rows };
}

async function buildStates(pulledAt: string): Promise<IStatesFile> {
  const collection = await fetchJson<{ features: INaturalEarthFeature[] }>(ingestPlantsConstants.STATES_URL);
  const states = ingestPlantsConstants.STATE_CODES.map((code) => {
    const feature = collection.features.find((candidate) => candidate.properties.iso_3166_2 === `US-${code}`);

    if (!feature) {
      throw new Error(`State ${code} missing from Natural Earth file`);
    }

    return IngestPlantsHelper.stateOutline(
      feature,
      code,
      ingestPlantsConstants.STATE_SIMPLIFY_TOLERANCE_DEGREES,
      ingestPlantsConstants.COORDINATE_DECIMALS
    );
  });

  return {
    pulledAt,
    sourceLabel: 'Natural Earth 1:50m admin-1 states and provinces (public domain)',
    sourceUrl: ingestPlantsConstants.STATES_SOURCE_URL,
    simplifyToleranceDegrees: ingestPlantsConstants.STATE_SIMPLIFY_TOLERANCE_DEGREES,
    states,
  };
}

async function main(): Promise<void> {
  const apiKey = new DevCredentialsService().getEiaApiKey();
  const pulledAt = new Date().toISOString();
  const { period, rows } = await fetchGeneratorRows(apiKey);
  const foreignRows = rows.filter((row) => row.balancing_authority_code !== ingestPlantsConstants.BALANCING_AUTHORITY);
  const intermountainRows = rows.filter((row) => row.plantName.toLowerCase().includes(ingestPlantsConstants.INTERMOUNTAIN_PLANT_PATTERN));

  if (foreignRows.length > 0) {
    throw new Error(`${foreignRows.length} rows outside ${ingestPlantsConstants.BALANCING_AUTHORITY} came back from the BA facet`);
  }

  const plants = IngestPlantsHelper.aggregate(rows);
  const storageMw = rows
    .filter((row) => excludedEnergySources.includes(row.energy_source_code))
    .reduce((sum, row) => sum + Number(row['nameplate-capacity-mw'] ?? 0), 0);
  const plantsFile: IPlantsFile = {
    pulledAt,
    period,
    balancingAuthority: ingestPlantsConstants.BALANCING_AUTHORITY,
    sourceLabel: 'EIA-860M operating generator capacity, balancing authority PACE',
    sourceUrl: ingestPlantsConstants.EIA_CAPACITY_BROWSER_URL,
    apiRoute: 'electricity/operating-generator-capacity (facets balancing_authority_code=PACE, status=OP)',
    capacityMeasure: 'nameplate-capacity-mw summed per plant and fuel',
    fuelMapping: { ...energySourceFuelKeys, other: 'OTH' },
    excluded: [`Battery storage (MWH), ${IngestPlantsHelper.round(storageMw, 1)} MW nameplate: stores power, does not generate it`],
    totalsByFuelMw: IngestPlantsHelper.totalsByFuel(plants),
    plants,
  };
  const outputDirectory = resolve(__dirname, '..', '..', ingestPlantsConstants.OUTPUT_DIRECTORY);
  mkdirSync(outputDirectory, { recursive: true });
  writeFileSync(resolve(outputDirectory, ingestPlantsConstants.PLANTS_FILE), `${JSON.stringify(plantsFile)}\n`);
  writeFileSync(resolve(outputDirectory, ingestPlantsConstants.STATES_FILE), `${JSON.stringify(await buildStates(pulledAt))}\n`);

  console.log(`Period ${period}: ${rows.length} generator rows, ${plants.length} plant x fuel points`);
  console.log(`Totals by fuel (MW): ${JSON.stringify(plantsFile.totalsByFuelMw)}`);
  console.log(`Intermountain rows inside PACE facet: ${intermountainRows.length}`);
  console.log(`Wrote ${ingestPlantsConstants.PLANTS_FILE} and ${ingestPlantsConstants.STATES_FILE} to ${outputDirectory}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
