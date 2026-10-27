import { Timestamp } from 'firebase-admin/firestore';
import { IngestFetchService } from './ingest-fetch.service';
import { IngestStoreService } from './ingest-store.service';
import { gridHourFlags, ingestConstants } from './ingest-snapshot.constants';
import { IngestSnapshotHelper } from './ingest-snapshot.helper';
import { IIngestResult } from './ingest-snapshot.interfaces';

process.env['GOOGLE_CLOUD_QUOTA_PROJECT'] = ingestConstants.PROJECT_ID;

const hourMilliseconds = 3_600_000;

async function main(): Promise<void> {
  const options = IngestSnapshotHelper.parseArguments(process.argv.slice(2), ingestConstants.DEFAULT_OUTPUT_DIRECTORY);
  const now = new Date();
  const fetchService = new IngestFetchService();

  const regionRows = await fetchService.fetchEiaRegionRows(now);
  const fuelRows = await fetchService.fetchEiaFuelRows(now);
  const hoursByKey = IngestSnapshotHelper.buildGridHours(regionRows, fuelRows);

  const solarKeys = fuelRows.filter((row) => row.fueltype === 'SUN').map((row) => row.period);
  const solarGaps = IngestSnapshotHelper.findSeriesGaps(solarKeys);
  console.log(
    `SUN series gaps: ${solarGaps.gapCount} missing hours (first ${solarGaps.firstGapKey}, last ${solarGaps.lastGapKey})`,
    solarGaps.gapsByMonth,
  );

  const { filteredRows } = IngestSnapshotHelper.applyPlausibilityFilter([...hoursByKey.values()]);
  const latestEiaForecastKey = IngestSnapshotHelper.findLatestKeyWithForecast(hoursByKey);
  console.log(`Latest EIA DF hour: ${latestEiaForecastKey}; filtered rows: ${filteredRows}`);

  const lookaheadEndMs = IngestSnapshotHelper.lookaheadEndMilliseconds(now);
  const forecastStartMs = latestEiaForecastKey
    ? Date.parse(`${IngestSnapshotHelper.millisecondsToUtcKey(IngestSnapshotHelper.utcKeyToMilliseconds(latestEiaForecastKey)).slice(0, 10)}T00:00:00Z`)
    : lookaheadEndMs - hourMilliseconds * 24 * 3;

  const forecastRows = await fetchService.fetchOasisRows(
    'SLD_FCST',
    { TAC_AREA_NAME: ingestConstants.OASIS_TAC_AREA },
    IngestSnapshotHelper.buildChunks(forecastStartMs, lookaheadEndMs),
  );
  const oasisForecastHours = IngestSnapshotHelper.applyOasisForecast(
    hoursByKey,
    IngestSnapshotHelper.buildForecastByKey(forecastRows),
    latestEiaForecastKey,
  );
  console.log(`OASIS day-ahead forecast hours applied: ${oasisForecastHours}`);

  const priceRows = await fetchService.fetchOasisRows(
    'PRC_LMP',
    { node: ingestConstants.OASIS_NODE },
    IngestSnapshotHelper.buildChunks(Date.parse(ingestConstants.OASIS_PRICE_START), lookaheadEndMs),
  );
  const priceHours = IngestSnapshotHelper.buildPriceHours(priceRows);

  const gridHours = [...hoursByKey.values()].sort((first, second) => first.utcHourEnding.localeCompare(second.utcHourEnding));
  const targetDate = IngestSnapshotHelper.findTargetDate(gridHours, priceHours);

  if (!targetDate) {
    throw new Error('No local day has both a full day-ahead forecast and full DAM prices');
  }

  const targetHours = gridHours.filter((hour) => hour.localHourStart.startsWith(targetDate));
  const isTargetForecastFromOasis = targetHours.some((hour) => hour.flags.includes(gridHourFlags.FORECAST_FROM_OASIS));

  const gridMonths = [...IngestSnapshotHelper.groupByMonth(gridHours, (hour) => hour.localHourStart)].map(
    ([month, hours]) => ({ month, hours }),
  );
  const priceMonths = [...IngestSnapshotHelper.groupByMonth(priceHours, (hour) => hour.localStart)].map(
    ([month, hours]) => ({ month, hours }),
  );

  const manifest: Detour.Firestore.Snapshot.IManifest = {
    id: IngestSnapshotHelper.buildSnapshotId(now),
    pulledAt: Timestamp.now(),
    timezone: ingestConstants.TIMEZONE,
    targetDate,
    gridRange: { start: gridHours[0].utcHourEnding, end: gridHours[gridHours.length - 1].utcHourEnding },
    priceRange: { start: priceHours[0].utcStart, end: priceHours[priceHours.length - 1].utcStart },
    gridMonths: gridMonths.map((month) => ({ month: month.month, rowCount: month.hours.length })),
    priceMonths: priceMonths.map((month) => ({ month: month.month, rowCount: month.hours.length })),
    dayAheadForecastSource: isTargetForecastFromOasis ? 'caiso-oasis' : 'eia-930',
    filteredRows,
    sources: [
      {
        id: 'eia-region-data',
        label: 'EIA-930 hourly demand, day-ahead forecast, net generation and interchange for PACE',
        kind: 'eia-930',
        url: ingestConstants.EIA_REGION_URL,
        seriesId: `${ingestConstants.RESPONDENT}:D,DF,NG,TI`,
      },
      {
        id: 'eia-fuel-type-data',
        label: 'EIA-930 hourly net generation by fuel type for PACE',
        kind: 'eia-930',
        url: ingestConstants.EIA_FUEL_URL,
        seriesId: `${ingestConstants.RESPONDENT}:fuel-type`,
      },
      {
        id: 'caiso-prc-lmp',
        label: 'CAISO OASIS day-ahead LMP with energy, congestion, loss and GHG components',
        kind: 'caiso-oasis',
        url: ingestConstants.OASIS_URL,
        seriesId: `PRC_LMP:DAM:${ingestConstants.OASIS_NODE}`,
        note: 'LMP_PRC, LMP_ENE_PRC, LMP_CONG_PRC, LMP_LOSS_PRC, LMP_GHG_PRC',
      },
      {
        id: 'caiso-sld-fcst',
        label: 'CAISO OASIS day-ahead demand forecast for PACE, used past the latest EIA DF hour',
        kind: 'caiso-oasis',
        url: ingestConstants.OASIS_URL,
        seriesId: `SLD_FCST:DAM:${ingestConstants.OASIS_TAC_AREA}:SYS_FCST_DA_MW`,
      },
    ],
  };

  const result: IIngestResult = { manifest, gridMonths, priceMonths };
  const storeService = new IngestStoreService();

  if (options.isDryRun) {
    const sizesByFile = storeService.writeDryRun(result, options.outputDirectory);

    for (const [fileName, bytes] of Object.entries(sizesByFile)) {
      if (bytes > ingestConstants.MONTH_SIZE_WARNING_BYTES) {
        console.warn(`WARNING ${fileName} is ${bytes} bytes, approaching the 1 MiB Firestore limit`);
      }
    }

    console.log(`Dry run written to ${options.outputDirectory}; targetDate ${targetDate}`);

    return;
  }

  for (const month of [...gridMonths, ...priceMonths]) {
    const bytes = Buffer.byteLength(JSON.stringify(month));

    if (bytes > ingestConstants.MONTH_SIZE_WARNING_BYTES) {
      console.warn(`WARNING ${month.month} is ${bytes} bytes, approaching the 1 MiB Firestore limit`);
    }
  }

  await storeService.writeToFirestore(result);
  console.log(`Snapshot ${manifest.id} written and config/snapshot flipped`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
