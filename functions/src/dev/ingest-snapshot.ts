import { Timestamp } from 'firebase-admin/firestore';
import { IngestFetchService } from '../ingest/ingest-fetch.service';
import { IngestRunService } from '../ingest/ingest-run.service';
import { IngestStoreService } from '../ingest/ingest-store.service';
import { ingestConstants, weatherPoints } from '../ingest/ingest-snapshot.constants';
import { IngestSnapshotHelper } from '../ingest/ingest-snapshot.helper';
import { IIngestOptions, IIngestResult } from '../ingest/ingest-snapshot.interfaces';
import { DevCredentialsService } from './dev-credentials.service';

const credentialsService = new DevCredentialsService();
const runService = new IngestRunService();
const cliLogger = { info: console.log, warn: console.warn };

async function runWeatherOnly(options: IIngestOptions): Promise<void> {
  const storeService = new IngestStoreService(credentialsService.createFirestore());
  const manifest = await storeService.readCurrentManifest();

  if (!manifest) {
    throw new Error('No current snapshot manifest found; run a full ingest first');
  }

  const fetchService = new IngestFetchService({ apiKey: null, cacheDirectory: ingestConstants.CACHE_DIRECTORY, log: cliLogger });
  const startDate = manifest.gridRange.start.slice(0, 10);
  const endDate = manifest.targetDate;
  const weatherMonths = await runService.fetchWeatherMonths(fetchService, startDate, endDate);
  const manifestPatch: Partial<Detour.Firestore.Snapshot.IManifest> = {
    weatherMonths: weatherMonths.map((month) => ({ month: month.month, rowCount: month.hours.length })),
    weatherPulledAt: Timestamp.now(),
    weatherRange: { start: startDate, end: endDate },
    weatherPoints,
    weatherModel: ingestConstants.OPEN_METEO_MODEL,
  };

  if (options.isDryRun) {
    const result: IIngestResult = { manifest: { ...manifest, ...manifestPatch }, gridMonths: [], priceMonths: [], weatherMonths };
    storeService.writeDryRun(result, options.outputDirectory);
    console.log(`Weather-only dry run written to ${options.outputDirectory}; ${weatherMonths.length} months, range ${startDate}..${endDate}`);

    return;
  }

  await storeService.writeWeatherToSnapshot(manifest.id, weatherMonths, manifestPatch);
  console.log(`Weather patched into snapshot ${manifest.id}: ${weatherMonths.length} months, range ${startDate}..${endDate}`);
}

async function main(): Promise<void> {
  const options = IngestSnapshotHelper.parseArguments(process.argv.slice(2), ingestConstants.DEFAULT_OUTPUT_DIRECTORY);

  if (process.argv.includes('--weather-only')) {
    await runWeatherOnly(options);

    return;
  }

  const outcome = await runService.runIngest({
    isDryRun: options.isDryRun,
    firestore: credentialsService.createFirestore(),
    apiKey: credentialsService.getEiaApiKey(),
    log: cliLogger,
    useCache: process.argv.includes('--cache'),
    outputDirectory: options.outputDirectory,
  });

  console.log(`${outcome.status}: ${outcome.message}`);

  if (!outcome.validation.isValid) {
    console.log(`Validation reasons:\n- ${outcome.validation.reasons.join('\n- ')}`);
  }

  if (outcome.status === 'rejected') {
    process.exit(2);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
