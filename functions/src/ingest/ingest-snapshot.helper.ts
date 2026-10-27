import { gridHourFlags, ingestConstants, oasisPriceFieldByDataItem, weatherHourFlags } from './ingest-snapshot.constants';
import {
  IEiaFuelRow,
  IEiaRegionRow,
  IOasisChunk,
  IOasisCsvRow,
  IOpenMeteoResponse,
  IPlausibilityResult,
  ISeriesGapReport,
} from './ingest-snapshot.interfaces';

type GridHour = Detour.Firestore.Snapshot.IGridHour;
type PriceHour = Detour.Firestore.Snapshot.IPriceHour;
type WeatherHour = Detour.Firestore.Snapshot.IWeatherHour;
type WeatherPoint = Detour.Firestore.Snapshot.IWeatherPoint;

const millisecondsPerHour = 3_600_000;
const millisecondsPerDay = 24 * millisecondsPerHour;

export class IngestSnapshotHelper {
  private static readonly _localFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ingestConstants.TIMEZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'longOffset',
  });

  public static utcKeyToMilliseconds(utcKey: string): number {
    return Date.parse(`${utcKey.slice(0, 13)}:00:00Z`);
  }

  public static millisecondsToUtcKey(milliseconds: number): string {
    return new Date(milliseconds).toISOString().slice(0, 13);
  }

  public static oasisTimestampToUtcKey(timestamp: string): string {
    return timestamp.slice(0, 13);
  }

  public static toLocalIso(milliseconds: number): string {
    const parts: Record<string, string> = {};

    for (const part of IngestSnapshotHelper._localFormatter.formatToParts(new Date(milliseconds))) {
      parts[part.type] = part.value;
    }

    const offset = parts['timeZoneName'].replace('GMT', '') || '+00:00';

    return `${parts['year']}-${parts['month']}-${parts['day']}T${parts['hour']}:${parts['minute']}${offset}`;
  }

  public static buildSnapshotId(pulledAt: Date): string {
    const iso = pulledAt.toISOString();

    return `${iso.slice(0, 10).replace(/-/g, '')}-${iso.slice(11, 13)}${iso.slice(14, 16)}`;
  }

  public static formatEiaStart(now: Date): string {
    const start = new Date(now);
    start.setUTCFullYear(start.getUTCFullYear() - ingestConstants.YEARS_BACK);

    return `${start.toISOString().slice(0, 10)}T00`;
  }

  public static formatOasisTimestamp(milliseconds: number): string {
    const iso = new Date(milliseconds).toISOString();

    return `${iso.slice(0, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}T${iso.slice(11, 13)}:00-0000`;
  }

  public static lookaheadEndMilliseconds(now: Date): number {
    const startOfTodayUtc = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);

    return startOfTodayUtc + ingestConstants.LOOKAHEAD_DAYS * millisecondsPerDay;
  }

  public static buildChunks(startMs: number, endMs: number): IOasisChunk[] {
    const chunks: IOasisChunk[] = [];
    const chunkMilliseconds = ingestConstants.OASIS_CHUNK_DAYS * millisecondsPerDay;

    for (let chunkStart = startMs; chunkStart < endMs; chunkStart += chunkMilliseconds) {
      chunks.push({ startMs: chunkStart, endMs: Math.min(chunkStart + chunkMilliseconds, endMs) });
    }

    return chunks;
  }

  public static parseCsv(text: string): IOasisCsvRow[] {
    const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);

    if (lines.length < 2) {
      return [];
    }

    const headers = lines[0].split(',');

    return lines.slice(1).map((line) => {
      const cells = line.split(',');
      const row: IOasisCsvRow = {};

      headers.forEach((header, index) => {
        row[header] = cells[index] ?? '';
      });

      return row;
    });
  }

  public static parseNumber(value: string | number | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  public static createEmptyGridHour(utcKey: string): GridHour {
    return {
      utcHourEnding: utcKey,
      localHourStart: IngestSnapshotHelper.toLocalIso(IngestSnapshotHelper.utcKeyToMilliseconds(utcKey)),
      demandMw: null,
      dayAheadForecastMw: null,
      netGenerationMw: null,
      totalInterchangeMw: null,
      fuelMw: {},
      flags: [],
    };
  }

  public static buildGridHours(regionRows: IEiaRegionRow[], fuelRows: IEiaFuelRow[]): Map<string, GridHour> {
    const hoursByKey = new Map<string, GridHour>();

    const getHour = (utcKey: string): GridHour => {
      let hour = hoursByKey.get(utcKey);

      if (!hour) {
        hour = IngestSnapshotHelper.createEmptyGridHour(utcKey);
        hoursByKey.set(utcKey, hour);
      }

      return hour;
    };

    for (const row of regionRows) {
      const hour = getHour(row.period);
      const value = IngestSnapshotHelper.parseNumber(row.value);

      if (row.type === 'D') {
        hour.demandMw = value;
      } else if (row.type === 'DF') {
        hour.dayAheadForecastMw = value;
      } else if (row.type === 'NG') {
        hour.netGenerationMw = value;
      } else if (row.type === 'TI') {
        hour.totalInterchangeMw = value;
      }
    }

    for (const row of fuelRows) {
      getHour(row.period).fuelMw[row.fueltype] = IngestSnapshotHelper.parseNumber(row.value);
    }

    return hoursByKey;
  }

  public static applyPlausibilityFilter(hours: GridHour[]): IPlausibilityResult {
    let filteredRows = 0;

    for (const hour of hours) {
      const demand = hour.demandMw;
      const forecast = hour.dayAheadForecastMw;
      const flagCountBefore = hour.flags.length;

      if (demand !== null && demand <= 0) {
        hour.demandMw = null;
        hour.flags.push(gridHourFlags.IMPLAUSIBLE_DEMAND);
      }

      if (forecast !== null) {
        const ratio = demand !== null && demand > 0 ? forecast / demand : null;
        const isRatioImplausible =
          ratio !== null &&
          (ratio < ingestConstants.DEMAND_FORECAST_RATIO_MIN || ratio > ingestConstants.DEMAND_FORECAST_RATIO_MAX);

        if (forecast <= 0 || isRatioImplausible) {
          hour.dayAheadForecastMw = null;
          hour.flags.push(gridHourFlags.IMPLAUSIBLE_FORECAST);
        }
      }

      if (hour.flags.length > flagCountBefore) {
        filteredRows += 1;
      }
    }

    return { filteredRows };
  }

  public static findLatestKeyWithForecast(hoursByKey: Map<string, GridHour>): string | null {
    let latestKey: string | null = null;

    for (const [utcKey, hour] of hoursByKey) {
      if (hour.dayAheadForecastMw !== null && (latestKey === null || utcKey > latestKey)) {
        latestKey = utcKey;
      }
    }

    return latestKey;
  }

  public static applyOasisForecast(
    hoursByKey: Map<string, GridHour>,
    forecastByKey: Map<string, number>,
    latestEiaForecastKey: string | null,
  ): number {
    let appliedHours = 0;

    for (const [utcKey, forecastMw] of forecastByKey) {
      if (latestEiaForecastKey !== null && utcKey <= latestEiaForecastKey) {
        continue;
      }

      let hour = hoursByKey.get(utcKey);

      if (!hour) {
        hour = IngestSnapshotHelper.createEmptyGridHour(utcKey);
        hoursByKey.set(utcKey, hour);
      }

      hour.dayAheadForecastMw = forecastMw;
      hour.flags.push(gridHourFlags.FORECAST_FROM_OASIS);
      appliedHours += 1;
    }

    return appliedHours;
  }

  public static buildForecastByKey(rows: IOasisCsvRow[]): Map<string, number> {
    const forecastByKey = new Map<string, number>();

    for (const row of rows) {
      const forecastMw = IngestSnapshotHelper.parseNumber(row['MW']);
      const utcKey = IngestSnapshotHelper.oasisTimestampToUtcKey(row['INTERVALSTARTTIME_GMT']);

      if (forecastMw !== null && !forecastByKey.has(utcKey)) {
        forecastByKey.set(utcKey, forecastMw);
      }
    }

    return forecastByKey;
  }

  public static buildPriceHours(rows: IOasisCsvRow[]): PriceHour[] {
    const hoursByKey = new Map<string, PriceHour>();

    for (const row of rows) {
      const field = (oasisPriceFieldByDataItem as Record<string, string | undefined>)[row['XML_DATA_ITEM']];

      if (!field) {
        continue;
      }

      const utcKey = IngestSnapshotHelper.oasisTimestampToUtcKey(row['INTERVALSTARTTIME_GMT']);
      let hour = hoursByKey.get(utcKey);

      if (!hour) {
        hour = {
          utcStart: utcKey,
          localStart: IngestSnapshotHelper.toLocalIso(IngestSnapshotHelper.utcKeyToMilliseconds(utcKey)),
          lmp: null,
          energy: null,
          congestion: null,
          loss: null,
          ghg: null,
        };
        hoursByKey.set(utcKey, hour);
      }

      (hour as unknown as Record<string, number | null>)[field] = IngestSnapshotHelper.parseNumber(row['MW']);
    }

    return [...hoursByKey.values()].sort((first, second) => first.utcStart.localeCompare(second.utcStart));
  }

  public static groupByMonth<THour>(hours: THour[], getLocalIso: (hour: THour) => string): Map<string, THour[]> {
    const hoursByMonth = new Map<string, THour[]>();

    for (const hour of hours) {
      const month = getLocalIso(hour).slice(0, 7);
      const bucket = hoursByMonth.get(month) ?? [];
      bucket.push(hour);
      hoursByMonth.set(month, bucket);
    }

    return hoursByMonth;
  }

  public static hoursInLocalDay(localDate: string): number {
    const scanStart = Date.parse(`${localDate}T00:00:00Z`) - millisecondsPerDay;
    let hourCount = 0;

    for (let hourIndex = 0; hourIndex < 72; hourIndex++) {
      const localIso = IngestSnapshotHelper.toLocalIso(scanStart + hourIndex * millisecondsPerHour);

      if (localIso.slice(0, 10) === localDate) {
        hourCount += 1;
      }
    }

    return hourCount;
  }

  public static findTargetDate(gridHours: GridHour[], priceHours: PriceHour[]): string | null {
    const forecastHoursByDate = new Map<string, number>();
    const priceHoursByDate = new Map<string, number>();

    for (const hour of gridHours) {
      if (hour.dayAheadForecastMw !== null) {
        const localDate = hour.localHourStart.slice(0, 10);
        forecastHoursByDate.set(localDate, (forecastHoursByDate.get(localDate) ?? 0) + 1);
      }
    }

    for (const hour of priceHours) {
      if (hour.lmp !== null) {
        const localDate = hour.localStart.slice(0, 10);
        priceHoursByDate.set(localDate, (priceHoursByDate.get(localDate) ?? 0) + 1);
      }
    }

    const candidateDates = [...priceHoursByDate.keys()].sort().reverse();

    for (const localDate of candidateDates) {
      const expectedHours = IngestSnapshotHelper.hoursInLocalDay(localDate);

      if ((forecastHoursByDate.get(localDate) ?? 0) >= expectedHours && priceHoursByDate.get(localDate)! >= expectedHours) {
        return localDate;
      }
    }

    return null;
  }

  public static findSeriesGaps(utcKeys: string[]): ISeriesGapReport {
    const sortedKeys = [...new Set(utcKeys)].sort();
    const report: ISeriesGapReport = { gapCount: 0, firstGapKey: null, lastGapKey: null, gapsByMonth: {} };

    for (let i = 1; i < sortedKeys.length; i++) {
      const previousMs = IngestSnapshotHelper.utcKeyToMilliseconds(sortedKeys[i - 1]);
      const currentMs = IngestSnapshotHelper.utcKeyToMilliseconds(sortedKeys[i]);

      for (let missingMs = previousMs + millisecondsPerHour; missingMs < currentMs; missingMs += millisecondsPerHour) {
        const missingKey = IngestSnapshotHelper.millisecondsToUtcKey(missingMs);
        const month = missingKey.slice(0, 7);
        report.gapCount += 1;
        report.firstGapKey = report.firstGapKey ?? missingKey;
        report.lastGapKey = missingKey;
        report.gapsByMonth[month] = (report.gapsByMonth[month] ?? 0) + 1;
      }
    }

    return report;
  }

  public static addDays(date: string, days: number): string {
    return new Date(Date.parse(`${date}T00:00:00Z`) + days * millisecondsPerDay).toISOString().slice(0, 10);
  }

  public static buildDateChunks(startDate: string, endDate: string, chunkDays: number): { start: string; end: string }[] {
    const chunks: { start: string; end: string }[] = [];
    let chunkStartMs = Date.parse(`${startDate}T00:00:00Z`);
    const endMs = Date.parse(`${endDate}T00:00:00Z`);

    while (chunkStartMs <= endMs) {
      const chunkEndMs = Math.min(chunkStartMs + (chunkDays - 1) * millisecondsPerDay, endMs);
      chunks.push({
        start: new Date(chunkStartMs).toISOString().slice(0, 10),
        end: new Date(chunkEndMs).toISOString().slice(0, 10),
      });
      chunkStartMs = chunkEndMs + millisecondsPerDay;
    }

    return chunks;
  }

  public static buildWeatherHours(responses: IOpenMeteoResponse[], points: WeatherPoint[]): WeatherHour[] {
    const hoursByKey = new Map<string, WeatherHour>();

    responses.forEach((response, responseIndex) => {
      const point = points[responseIndex];
      const hourly = response.hourly;

      hourly.time.forEach((isoTime, timeIndex) => {
        const utcKey = `${isoTime.slice(0, 10)}T${isoTime.slice(11, 13)}`;
        const utcMs = Date.parse(`${isoTime}:00Z`);
        let hour = hoursByKey.get(utcKey);

        if (!hour) {
          hour = {
            utcHourEnding: utcKey,
            localHourStart: IngestSnapshotHelper.toLocalIso(utcMs),
            temperatureC: {},
            ghiWm2: {},
            flags: [],
          };
          hoursByKey.set(utcKey, hour);
        }

        const temperatureDay1 = IngestSnapshotHelper._numberAt(hourly, ingestConstants.OPEN_METEO_TEMPERATURE_VARIABLE, timeIndex);
        const temperatureDay0 = IngestSnapshotHelper._numberAt(hourly, ingestConstants.OPEN_METEO_TEMPERATURE_FALLBACK_VARIABLE, timeIndex);
        const ghiDay1 = IngestSnapshotHelper._numberAt(hourly, ingestConstants.OPEN_METEO_GHI_VARIABLE, timeIndex);
        const ghiDay0 = IngestSnapshotHelper._numberAt(hourly, ingestConstants.OPEN_METEO_GHI_FALLBACK_VARIABLE, timeIndex);
        const usedFallback = (temperatureDay1 === null && temperatureDay0 !== null) || (ghiDay1 === null && ghiDay0 !== null);

        hour.temperatureC[point.id] = temperatureDay1 ?? temperatureDay0;
        hour.ghiWm2[point.id] = ghiDay1 ?? ghiDay0;

        if (usedFallback && !hour.flags.includes(weatherHourFlags.WEATHER_DAY0_FALLBACK)) {
          hour.flags.push(weatherHourFlags.WEATHER_DAY0_FALLBACK);
        }
      });
    });

    return [...hoursByKey.values()].sort((first, second) => first.utcHourEnding.localeCompare(second.utcHourEnding));
  }

  private static _numberAt(hourly: IOpenMeteoResponse['hourly'], variableName: string, index: number): number | null {
    const series = hourly[variableName];

    return Array.isArray(series) ? IngestSnapshotHelper.parseNumber(series[index] as string | number | null) : null;
  }

  public static resolveLastGoodIds(pointer: Detour.Firestore.Snapshot.IPointer | null): string[] {
    if (!pointer) {
      return [];
    }

    if (pointer.lastGoodSnapshotIds && pointer.lastGoodSnapshotIds.length > 0) {
      return pointer.lastGoodSnapshotIds;
    }

    return [pointer.currentSnapshotId, pointer.previousSnapshotId].filter((id): id is string => Boolean(id));
  }

  public static parseArguments(argumentList: string[], defaultOutputDirectory: string): { isDryRun: boolean; outputDirectory: string } {
    const outIndex = argumentList.indexOf('--out');

    return {
      isDryRun: argumentList.includes('--dry-run'),
      outputDirectory: outIndex >= 0 && argumentList[outIndex + 1] ? argumentList[outIndex + 1] : defaultOutputDirectory,
    };
  }
}
