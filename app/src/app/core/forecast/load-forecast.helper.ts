import { EmissionsHelper } from '../signals/emissions.helper';
import { ForecastScoreHelper } from '../signals/forecast-score.helper';
import { signalsConfig } from '../signals/signals.constants';
import { TimeHelper } from '../helpers/time.helper';
import { IForecastComparisonRow, ILoadForecast, ILoadForecastHour } from '../models/forecast.interfaces';
import { forecastProvenance, loadForecastConfig, weatherWeights } from './load-forecast.constants';
import { IFeatureStats, IForecastFeatureRow, IResidualQuantile, IWeightedWeatherHour } from './load-forecast.interfaces';
import { RidgeHelper } from './ridge.helper';
import { IRidgeGram } from './ridge.interfaces';

const hourMilliseconds = 3_600_000;
const hourBlockCount = 4;

export class LoadForecastHelper {
  public static weightedWeather(
    weatherHours: Detour.Firestore.Snapshot.IWeatherHour[],
    weights: Record<string, number>,
  ): Map<string, IWeightedWeatherHour> {
    const byKey = new Map<string, IWeightedWeatherHour>();
    const pointIds = Object.keys(weights);

    for (const hour of weatherHours) {
      const temperatures = pointIds.map((pointId) => hour.temperatureC[pointId]);
      const irradiances = pointIds.map((pointId) => hour.ghiWm2[pointId]);

      if (temperatures.some((value) => value === null || value === undefined) || irradiances.some((value) => value === null || value === undefined)) {
        continue;
      }

      const weightedTemperatureC = pointIds.reduce((sum, pointId, index) => sum + weights[pointId] * (temperatures[index] as number), 0);
      const weightedGhi = pointIds.reduce((sum, pointId, index) => sum + weights[pointId] * (irradiances[index] as number), 0);

      byKey.set(hour.utcHourEnding, {
        utcHourEnding: hour.utcHourEnding,
        temperatureF: weightedTemperatureC * 1.8 + 32,
        ghiWm2: weightedGhi,
      });
    }

    return byKey;
  }

  public static buildFeatureRows(
    gridHours: Detour.Firestore.Snapshot.IGridHour[],
    weatherByKey: Map<string, IWeightedWeatherHour>,
  ): IForecastFeatureRow[] {
    const demandByKey = new Map<string, number>();

    for (const hour of gridHours) {
      if (hour.demandMw !== null) {
        demandByKey.set(hour.utcHourEnding, hour.demandMw);
      }
    }

    const rows: IForecastFeatureRow[] = [];

    for (const hour of gridHours) {
      const weather = weatherByKey.get(hour.utcHourEnding);

      if (!weather) {
        continue;
      }

      const utcMs = LoadForecastHelper._utcKeyToMs(hour.utcHourEnding);
      const lag48Mw = demandByKey.get(LoadForecastHelper._msToUtcKey(utcMs - loadForecastConfig.LAG_HOURS_SHORT * hourMilliseconds));
      const lag168Mw = demandByKey.get(LoadForecastHelper._msToUtcKey(utcMs - loadForecastConfig.LAG_HOURS_SEASONAL * hourMilliseconds));

      if (lag48Mw === undefined || lag168Mw === undefined) {
        continue;
      }

      const localDate = hour.localHourStart.slice(0, 10);
      const localHour = Number(hour.localHourStart.slice(11, 13));
      const [year, month, day] = localDate.split('-').map(Number);
      const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
      const isWeekend = weekday === 0 || weekday === 6;
      const isHoliday = TimeHelper.isUtahTariffHoliday(localDate);
      const dayType = isWeekend || isHoliday ? 1 : 0;
      const season = EmissionsHelper.seasonOf(month);
      const forecastExcluded = hour.flags.some((flag) => signalsConfig.EXCLUDED_FORECAST_FLAGS.includes(flag));

      rows.push({
        utcHourEnding: hour.utcHourEnding,
        localDate,
        localHour,
        month: localDate.slice(0, 7),
        dayOfMonth: day,
        season,
        features: LoadForecastHelper._featureVector(localHour, dayType, localDate, weather, lag48Mw, lag168Mw),
        demandMw: hour.demandMw,
        dayAheadForecastMw: hour.dayAheadForecastMw,
        forecastExcluded,
        lag168Mw,
      });
    }

    return rows;
  }

  public static computeStats(featureMatrix: number[][]): IFeatureStats {
    const columnCount = featureMatrix[0]?.length ?? 0;
    const means = new Array(columnCount).fill(0);
    const stds = new Array(columnCount).fill(0);

    for (const row of featureMatrix) {
      row.forEach((value, index) => {
        means[index] += value;
      });
    }

    means.forEach((sum, index) => {
      means[index] = sum / featureMatrix.length;
    });

    for (const row of featureMatrix) {
      row.forEach((value, index) => {
        stds[index] += (value - means[index]) ** 2;
      });
    }

    return {
      means,
      stds: stds.map((sumSquares) => {
        const std = Math.sqrt(sumSquares / featureMatrix.length);

        return std > 1e-9 ? std : 1;
      }),
    };
  }

  public static standardize(featureMatrix: number[][], stats: IFeatureStats): number[][] {
    return featureMatrix.map((row) => row.map((value, index) => (value - stats.means[index]) / stats.stds[index]));
  }

  public static blockedCv(rows: IForecastFeatureRow[], standardized: number[][], lambda: number): Map<string, number> {
    const historicalIndices = rows.reduce<number[]>((indices, row, index) => {
      if (row.demandMw !== null) {
        indices.push(index);
      }

      return indices;
    }, []);

    const chunkIndices = new Map<string, number[]>();

    for (const index of historicalIndices) {
      const row = rows[index];
      const key = `${row.month}|${row.dayOfMonth <= loadForecastConfig.BUFFER_DAYS ? 'first7' : 'rest'}`;
      const bucket = chunkIndices.get(key) ?? [];
      bucket.push(index);
      chunkIndices.set(key, bucket);
    }

    const chunkGrams = new Map<string, IRidgeGram>();

    for (const [key, indices] of chunkIndices) {
      chunkGrams.set(
        key,
        RidgeHelper.gram(indices.map((index) => standardized[index]), indices.map((index) => rows[index].demandMw as number)),
      );
    }

    let totalGram: IRidgeGram | null = null;

    for (const gram of chunkGrams.values()) {
      totalGram = totalGram ? RidgeHelper.addGrams(totalGram, gram) : gram;
    }

    const outOfFold = new Map<string, number>();

    if (!totalGram) {
      return outOfFold;
    }

    const monthsPresent = [...new Set(historicalIndices.map((index) => rows[index].month))];

    for (const month of monthsPresent) {
      let foldGram = totalGram;
      const first7Key = `${month}|first7`;
      const restKey = `${month}|rest`;
      const nextFirst7Key = `${LoadForecastHelper._addMonths(month, 1)}|first7`;

      for (const key of [first7Key, restKey, nextFirst7Key]) {
        const chunk = chunkGrams.get(key);

        if (chunk) {
          foldGram = RidgeHelper.addGrams(foldGram, chunk, -1);
        }
      }

      const beta = RidgeHelper.solve(foldGram, lambda);

      for (const index of historicalIndices) {
        if (rows[index].month === month) {
          outOfFold.set(rows[index].utcHourEnding, RidgeHelper.predict(beta, standardized[index]));
        }
      }
    }

    return outOfFold;
  }

  public static residualQuantiles(rows: IForecastFeatureRow[], outOfFold: Map<string, number>): Map<string, IResidualQuantile> {
    const residualsByGroup = new Map<string, number[]>();

    for (const row of rows) {
      const p50 = outOfFold.get(row.utcHourEnding);

      if (p50 === undefined || row.demandMw === null) {
        continue;
      }

      const key = `${row.localHour}-${row.season}`;
      const bucket = residualsByGroup.get(key) ?? [];
      bucket.push(row.demandMw - p50);
      residualsByGroup.set(key, bucket);
    }

    const quantiles = new Map<string, IResidualQuantile>();

    for (const [key, residuals] of residualsByGroup) {
      const sorted = [...residuals].sort((first, second) => first - second);
      quantiles.set(key, {
        q10: LoadForecastHelper._percentile(sorted, loadForecastConfig.QUANTILE_LOW),
        q90: LoadForecastHelper._percentile(sorted, loadForecastConfig.QUANTILE_HIGH),
      });
    }

    return quantiles;
  }

  public static targetDayForecast(
    rows: IForecastFeatureRow[],
    standardized: number[][],
    targetDate: string,
    lambda: number,
    quantiles: Map<string, IResidualQuantile>,
  ): ILoadForecastHour[] {
    const historicalIndices = rows.reduce<number[]>((indices, row, index) => {
      if (row.demandMw !== null) {
        indices.push(index);
      }

      return indices;
    }, []);

    if (historicalIndices.length === 0) {
      return [];
    }

    const fullGram = RidgeHelper.gram(
      historicalIndices.map((index) => standardized[index]),
      historicalIndices.map((index) => rows[index].demandMw as number),
    );
    const beta = RidgeHelper.solve(fullGram, lambda);
    const targetHours: ILoadForecastHour[] = [];

    rows.forEach((row, index) => {
      if (row.localDate !== targetDate) {
        return;
      }

      const p50 = RidgeHelper.predict(beta, standardized[index]);
      const band = LoadForecastHelper._band(p50, quantiles.get(`${row.localHour}-${row.season}`));

      targetHours.push({ hour: row.localHour, p10Mw: band.lower, p50Mw: p50, p90Mw: band.upper });
    });

    return targetHours.sort((first, second) => first.hour - second.hour);
  }

  public static coveragePercent(rows: IForecastFeatureRow[], outOfFold: Map<string, number>, quantiles: Map<string, IResidualQuantile>): number {
    let covered = 0;
    let total = 0;

    for (const row of rows) {
      const p50 = outOfFold.get(row.utcHourEnding);

      if (p50 === undefined || row.demandMw === null) {
        continue;
      }

      const band = LoadForecastHelper._band(p50, quantiles.get(`${row.localHour}-${row.season}`));
      total += 1;

      if (row.demandMw >= band.lower && row.demandMw <= band.upper) {
        covered += 1;
      }
    }

    return total === 0 ? 0 : (covered / total) * 100;
  }

  public static compare(rows: IForecastFeatureRow[], outOfFold: Map<string, number>): IForecastComparisonRow[] {
    const commonRows = rows.filter(
      (row) => row.demandMw !== null && outOfFold.has(row.utcHourEnding) && !row.forecastExcluded && row.dayAheadForecastMw !== null,
    );

    const ourScored = commonRows.map((row) => ({
      localDate: row.localDate,
      demandMw: row.demandMw as number,
      forecastMw: outOfFold.get(row.utcHourEnding) as number,
    }));
    const paceScored = commonRows.map((row) => ({
      localDate: row.localDate,
      demandMw: row.demandMw as number,
      forecastMw: row.dayAheadForecastMw as number,
    }));
    const naiveScored = commonRows.map((row) => ({
      localDate: row.localDate,
      demandMw: row.demandMw as number,
      forecastMw: row.lag168Mw,
    }));

    return [
      {
        id: forecastProvenance.OURS.id,
        label: 'Ours (ridge)',
        score: ForecastScoreHelper.scorePoints(ourScored, [forecastProvenance.OURS]),
        provenance: forecastProvenance.OURS,
      },
      {
        id: forecastProvenance.PACE_DF.id,
        label: "PACE's day-ahead forecast",
        score: ForecastScoreHelper.scorePoints(paceScored, [forecastProvenance.PACE_DF]),
        provenance: forecastProvenance.PACE_DF,
      },
      {
        id: forecastProvenance.NAIVE.id,
        label: 'Seasonal naive (same hour, last week)',
        score: ForecastScoreHelper.scorePoints(naiveScored, [forecastProvenance.NAIVE]),
        provenance: forecastProvenance.NAIVE,
      },
    ];
  }

  public static build(
    gridHours: Detour.Firestore.Snapshot.IGridHour[],
    weatherHours: Detour.Firestore.Snapshot.IWeatherHour[],
    targetDate: string,
    weatherPulledAt: string,
  ): ILoadForecast | null {
    const weatherByKey = LoadForecastHelper.weightedWeather(weatherHours, weatherWeights);
    const rows = LoadForecastHelper.buildFeatureRows(gridHours, weatherByKey);

    if (rows.length === 0) {
      return null;
    }

    const stats = LoadForecastHelper.computeStats(rows.map((row) => row.features));
    const standardized = LoadForecastHelper.standardize(rows.map((row) => row.features), stats);
    const lambda = loadForecastConfig.LAMBDA;
    const outOfFold = LoadForecastHelper.blockedCv(rows, standardized, lambda);
    const quantiles = LoadForecastHelper.residualQuantiles(rows, outOfFold);
    const targetHours = LoadForecastHelper.targetDayForecast(rows, standardized, targetDate, lambda, quantiles);
    const comparison = LoadForecastHelper.compare(rows, outOfFold);

    return {
      targetHours,
      comparison,
      coveragePercent: LoadForecastHelper.coveragePercent(rows, outOfFold, quantiles),
      lambda,
      featureCount: rows[0].features.length,
      hoursScored: comparison[0]?.score.hoursScored ?? 0,
      weatherPulledAt,
    };
  }

  private static _featureVector(
    localHour: number,
    dayType: number,
    localDate: string,
    weather: IWeightedWeatherHour,
    lag48Mw: number,
    lag168Mw: number,
  ): number[] {
    const features = new Array(48 + 4 + 2 + 8 + 1 + 2).fill(0);
    features[localHour * 2 + dayType] = 1;

    const dayOfYear = LoadForecastHelper._dayOfYear(localDate);
    const angle = (dayOfYear / 365.25) * 2 * Math.PI;
    features[48] = Math.sin(angle);
    features[49] = Math.cos(angle);
    features[50] = Math.sin(2 * angle);
    features[51] = Math.cos(2 * angle);

    const hdd65 = Math.max(0, loadForecastConfig.HDD_BASE_F - weather.temperatureF);
    const cdd65 = Math.max(0, weather.temperatureF - loadForecastConfig.CDD_BASE_F);
    features[52] = hdd65;
    features[53] = cdd65;

    const block = Math.floor(localHour / hourBlockCount);
    const cdd80 = Math.max(0, weather.temperatureF - loadForecastConfig.CDD_HINGE_F);
    const hdd45 = Math.max(0, loadForecastConfig.HDD_HINGE_F - weather.temperatureF);
    features[54 + block] = cdd80;
    features[58 + block] = hdd45;

    features[62] = weather.ghiWm2;
    features[63] = lag48Mw;
    features[64] = lag168Mw;

    return features;
  }

  private static _dayOfYear(localDate: string): number {
    const [year, month, day] = localDate.split('-').map(Number);

    return Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / (hourMilliseconds * 24)) + 1;
  }

  private static _addMonths(month: string, delta: number): string {
    const [year, monthNumber] = month.split('-').map(Number);
    const total = year * 12 + (monthNumber - 1) + delta;
    const newYear = Math.floor(total / 12);
    const newMonth = (total % 12) + 1;

    return `${newYear}-${String(newMonth).padStart(2, '0')}`;
  }

  private static _percentile(sortedValues: number[], fraction: number): number {
    if (sortedValues.length === 0) {
      return 0;
    }

    const position = fraction * (sortedValues.length - 1);
    const lowerIndex = Math.floor(position);
    const upperIndex = Math.ceil(position);

    if (lowerIndex === upperIndex) {
      return sortedValues[lowerIndex];
    }

    const weight = position - lowerIndex;

    return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
  }

  private static _band(p50: number, quantile: IResidualQuantile | undefined): { lower: number; upper: number } {
    const safeQuantile = quantile ?? { q10: 0, q90: 0 };

    return { lower: p50 + Math.min(safeQuantile.q10, 0), upper: p50 + Math.max(safeQuantile.q90, 0) };
  }

  private static _utcKeyToMs(utcKey: string): number {
    return Date.parse(`${utcKey.slice(0, 13)}:00:00Z`);
  }

  private static _msToUtcKey(milliseconds: number): string {
    return new Date(milliseconds).toISOString().slice(0, 13);
  }
}
