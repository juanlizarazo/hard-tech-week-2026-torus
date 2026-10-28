import { Timestamp } from 'firebase-admin/firestore';
import { DeriveSignalsService } from '../derive/derive-signals.service';
import { IngestFetchService } from './ingest-fetch.service';
import { IngestStoreService } from './ingest-store.service';
import { gridHourFlags, ingestConstants, weatherPoints } from './ingest-snapshot.constants';
import { IngestSnapshotHelper } from './ingest-snapshot.helper';
import {
  IIngestBuild,
  IIngestLogger,
  IIngestValidation,
  IRunIngestOptions,
  IRunIngestOutcome,
} from './ingest-snapshot.interfaces';
import { IngestValidationHelper } from './ingest-validation.helper';

const hourMilliseconds = 3_600_000;

export class IngestRunService {
  public async fetchWeatherMonths(
    fetchService: IngestFetchService,
    startDate: string,
    endDate: string,
  ): Promise<Detour.Firestore.Snapshot.IWeatherMonth[]> {
    const responses = await fetchService.fetchOpenMeteoRows(weatherPoints, startDate, endDate);
    const weatherHours = IngestSnapshotHelper.buildWeatherHours(responses, weatherPoints);

    return [...IngestSnapshotHelper.groupByMonth(weatherHours, (hour) => hour.localHourStart)].map(([month, hours]) => ({
      month,
      hours,
    }));
  }

  public async buildIngestResult(fetchService: IngestFetchService, now: Date, log: IIngestLogger): Promise<IIngestBuild> {
    const regionRows = await fetchService.fetchEiaRegionRows(now);
    const fuelRows = await fetchService.fetchEiaFuelRows(now);
    const hoursByKey = IngestSnapshotHelper.buildGridHours(regionRows, fuelRows);

    const solarKeys = fuelRows.filter((row) => row.fueltype === 'SUN').map((row) => row.period);
    const solarGaps = IngestSnapshotHelper.findSeriesGaps(solarKeys);
    log.info(
      `SUN series gaps: ${solarGaps.gapCount} missing hours (first ${solarGaps.firstGapKey}, last ${solarGaps.lastGapKey})`,
      solarGaps.gapsByMonth,
    );

    const { filteredRows } = IngestSnapshotHelper.applyPlausibilityFilter([...hoursByKey.values()]);
    const latestEiaForecastKey = IngestSnapshotHelper.findLatestKeyWithForecast(hoursByKey);
    log.info(`Latest EIA DF hour: ${latestEiaForecastKey}; filtered rows: ${filteredRows}`);

    const lookaheadEndMs = IngestSnapshotHelper.lookaheadEndMilliseconds(now);
    const forecastStartMs = latestEiaForecastKey
      ? Date.parse(
          `${IngestSnapshotHelper.millisecondsToUtcKey(IngestSnapshotHelper.utcKeyToMilliseconds(latestEiaForecastKey)).slice(0, 10)}T00:00:00Z`,
        )
      : lookaheadEndMs - hourMilliseconds * 24 * 3;

    const forecastFetch = await fetchService.fetchOasisRows(
      'SLD_FCST',
      { TAC_AREA_NAME: ingestConstants.OASIS_TAC_AREA },
      IngestSnapshotHelper.buildChunks(forecastStartMs, lookaheadEndMs),
    );
    const oasisForecastHours = IngestSnapshotHelper.applyOasisForecast(
      hoursByKey,
      IngestSnapshotHelper.buildForecastByKey(forecastFetch.rows),
      latestEiaForecastKey,
    );
    log.info(`OASIS day-ahead forecast hours applied: ${oasisForecastHours}`);

    const priceFetch = await fetchService.fetchOasisRows(
      'PRC_LMP',
      { node: ingestConstants.OASIS_NODE },
      IngestSnapshotHelper.buildChunks(Date.parse(ingestConstants.OASIS_PRICE_START), lookaheadEndMs),
    );
    const priceHours = IngestSnapshotHelper.buildPriceHours(priceFetch.rows);

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

    const weatherStartDate = gridHours[0].utcHourEnding.slice(0, 10);
    const weatherEndDate = IngestSnapshotHelper.addDays(targetDate, 1);
    const weatherMonths = await this.fetchWeatherMonths(fetchService, weatherStartDate, weatherEndDate);

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
      weatherMonths: weatherMonths.map((month) => ({ month: month.month, rowCount: month.hours.length })),
      weatherPulledAt: Timestamp.now(),
      weatherRange: { start: weatherStartDate, end: weatherEndDate },
      weatherPoints,
      weatherModel: ingestConstants.OPEN_METEO_MODEL,
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
        {
          id: 'open-meteo-previous-runs',
          label: 'Open-Meteo previous-runs day-ahead temperature and GHI for 3 Wasatch Front points',
          kind: 'open-meteo',
          url: ingestConstants.OPEN_METEO_URL,
          seriesId: `${ingestConstants.OPEN_METEO_TEMPERATURE_VARIABLE},${ingestConstants.OPEN_METEO_GHI_VARIABLE}`,
          note: `model ${ingestConstants.OPEN_METEO_MODEL}, points ${weatherPoints.map((point) => point.id).join('/')}`,
        },
      ],
    };

    return {
      result: { manifest, gridMonths, priceMonths, weatherMonths },
      diagnostics: { emptyOasisChunks: [...forecastFetch.emptyChunkStarts, ...priceFetch.emptyChunkStarts] },
    };
  }

  public async runIngest(options: IRunIngestOptions): Promise<IRunIngestOutcome> {
    const { log } = options;
    const now = options.now ?? new Date();
    const storeService = new IngestStoreService(options.firestore);
    const hasFirestore = options.firestore !== null;

    try {
      const fetchService = new IngestFetchService({
        apiKey: options.apiKey,
        cacheDirectory: options.useCache ? ingestConstants.CACHE_DIRECTORY : null,
        log,
      });
      const { result, diagnostics } = await this.buildIngestResult(fetchService, now, log);
      const { manifest } = result;
      const pointer = hasFirestore ? await storeService.readPointer() : null;
      const currentManifest = pointer ? await storeService.readManifest(pointer.currentSnapshotId) : null;
      const validation = IngestValidationHelper.validate(result, diagnostics, currentManifest);

      log.info(`Validation for ${manifest.id} (target ${manifest.targetDate}): ${validation.isValid ? 'passed' : 'rejected'}`, validation.reasons);

      if (options.isDryRun || !hasFirestore) {
        const outputDirectory = options.outputDirectory ?? ingestConstants.DEFAULT_OUTPUT_DIRECTORY;
        storeService.writeDryRun(result, outputDirectory);

        return this._outcome('dry-run', manifest, validation, `Dry run written to ${outputDirectory}`);
      }

      await storeService.writeSnapshot(result);
      log.info(`Snapshot ${manifest.id} written`);

      try {
        await storeService.writeDerived(manifest.id, DeriveSignalsService.build(manifest, result.gridMonths, result.weatherMonths));
      } catch (deriveError) {
        log.warn(`Derived signals for ${manifest.id} failed; snapshot kept`, deriveError);
      }

      if (!validation.isValid) {
        const message = `Rejected: ${validation.reasons.join('; ')}`;
        await storeService.recordLastRun(this._lastRun('rejected', manifest, message));

        return this._outcome('rejected', manifest, validation, message);
      }

      if (pointer?.pinnedSnapshotId) {
        const message = `Validated, but pinned to ${pointer.pinnedSnapshotId}; pointer not moved`;
        await storeService.recordLastRun(this._lastRun('pinned-skip', manifest, message));

        return this._outcome('pinned-skip', manifest, validation, message);
      }

      const message = `Flipped to ${manifest.id} (target ${manifest.targetDate})`;
      await storeService.flipPointer(manifest.id, this._lastRun('flipped', manifest, message));

      return this._outcome('flipped', manifest, validation, message);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      if (hasFirestore && !options.isDryRun) {
        await storeService
          .recordLastRun({ at: Timestamp.now(), status: 'failed', message })
          .catch((recordError: unknown) => log.warn('Could not record failed run', recordError));
      }

      throw error;
    }
  }

  private _lastRun(status: Detour.Firestore.Snapshot.RunStatus, manifest: Detour.Firestore.Snapshot.IManifest, message: string): Detour.Firestore.Snapshot.ILastRun {
    return { at: Timestamp.now(), status, snapshotId: manifest.id, targetDate: manifest.targetDate, message };
  }

  private _outcome(
    status: IRunIngestOutcome['status'],
    manifest: Detour.Firestore.Snapshot.IManifest,
    validation: IIngestValidation,
    message: string,
  ): IRunIngestOutcome {
    return { status, snapshotId: manifest.id, targetDate: manifest.targetDate, message, validation };
  }
}
