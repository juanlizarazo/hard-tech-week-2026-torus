import { EmissionsHelper, signalsConfig } from '@app/core';
import {
  IForecastComparisonRow,
  ILoadForecast,
  IMarginalEmissionsPoint,
  IRushHourWindow,
  MefMethod,
  MefSeason,
} from '@app/core/models';
import { TimeHelper } from '@app/core/helpers';
import { PlanEngineHelper } from '@app/core/plan';
import { TimeLabelHelper } from '@app/shared/helpers/time-label.helper';
import { IHourChartBand, IHourChartHighlight, IHourChartSeries } from '@app/shared/components/hour-chart/hour-chart.interfaces';
import { IRankSlopeRow } from './components/rank-slope/rank-slope.interfaces';
import { trafficCalendar, trafficChartDefaults, trafficClocks, trafficConfig } from './traffic.constants';
import {
  IRushHourBand,
  ITrafficHour,
  ITrafficInputs,
  ITrafficChart,
  ITrafficChartOptions,
  ITrafficCharts,
  ITrafficHourValue,
  ITrafficInsights,
  ITrafficNotices,
  ITrafficLoadWindow,
  ITrafficRange,
  ITrafficReport,
} from './traffic.interfaces';

export class TrafficHelper {
  public static buildReport(inputs: ITrafficInputs): ITrafficReport {
    const targetDate = inputs.manifest.targetDate;
    const season = EmissionsHelper.seasonOf(Number(targetDate.slice(5, 7)));
    const load = TrafficHelper.loadWindow(inputs.history, targetDate);
    const targetForecast = load.forecastMw.slice(load.targetStartIndex, load.targetStartIndex + 24);
    const targetNetLoad = load.estimatedNetLoadMw.slice(load.targetStartIndex, load.targetStartIndex + 24);
    const fossilPoints = TrafficHelper._pointsByHour(inputs, 'fossil-generation', season);
    const demandPoints = TrafficHelper._pointsByHour(inputs, 'demand', season);
    const averageByHour = new Map<number, number>();

    for (const point of inputs.averagePoints) {
      if (point.season === season) {
        averageByHour.set(point.hour, point.lbPerMwh);
      }
    }

    const lmpByHour = TrafficHelper.lmpByHour(inputs.priceHours, targetDate);
    const hours: ITrafficHour[] = [];

    for (let hour = 0; hour < 24; hour++) {
      const fossil = fossilPoints.get(hour);

      hours.push({
        hour,
        forecastMw: targetForecast[hour] ?? null,
        estimatedNetLoadMw: targetNetLoad[hour] ?? null,
        lmp: lmpByHour.get(hour) ?? null,
        mefFossilLbPerMwh: fossil ? fossil.lbPerMwh : null,
        mefFossilLowLbPerMwh: fossil ? fossil.ciLowLbPerMwh : null,
        mefFossilHighLbPerMwh: fossil ? fossil.ciHighLbPerMwh : null,
        mefDemandLbPerMwh: demandPoints.get(hour)?.lbPerMwh ?? null,
        mefDemandLowLbPerMwh: demandPoints.get(hour)?.ciLowLbPerMwh ?? null,
        mefDemandHighLbPerMwh: demandPoints.get(hour)?.ciHighLbPerMwh ?? null,
        averageLbPerMwh: averageByHour.get(hour) ?? null,
      });
    }

    const rushHour = TrafficHelper.rushHourBand(hours);
    const ranking = TrafficHelper.rankingRows(hours);

    return {
      targetDate,
      targetDateLabel: TrafficHelper.dayLabel(targetDate),
      season,
      peakMissLabel: TrafficHelper.peakMissLabel(inputs.score.meanPeakMissMw),
      load,
      hours,
      hasPrices: hours.some((hour) => hour.lmp !== null),
      hourLabels: hours.map((hour) => TrafficHelper.hourLabel(hour.hour)),
      rushHour,
      paceRush: PlanEngineHelper.rushHourWindows(inputs.history, targetDate)[0] ?? null,
      ranking,
      insights: TrafficHelper.insights(targetDate, hours, rushHour, ranking, inputs, season),
      fossilRange: TrafficHelper.range(hours.map((hour) => hour.mefFossilLbPerMwh)),
      demandRange: TrafficHelper.range(hours.map((hour) => hour.mefDemandLbPerMwh)),
      score: inputs.score,
      marginalSeries: inputs.marginalSeries,
    };
  }

  public static charts(
    report: ITrafficReport,
    forecast: ILoadForecast | null,
    options: ITrafficChartOptions = trafficChartDefaults,
  ): ITrafficCharts {
    const label = 'Rush hour';
    const window = report.paceRush;
    const dayHighlight: IHourChartHighlight | null = window
      ? { startIndex: window.startLocalHour, endIndex: window.endLocalHour - 1, label }
      : null;
    const loadHighlight: IHourChartHighlight | null = window
      ? {
          startIndex: report.load.targetStartIndex + window.startLocalHour,
          endIndex: report.load.targetStartIndex + window.endLocalHour - 1,
          label,
        }
      : null;
    const forecastSeries = TrafficHelper._forecastSeries(report, forecast);
    const loadSeries: IHourChartSeries[] = [
      { label: 'Load (actual)', values: report.load.actualLoadMw, style: 'solid', color: 'var(--dt-ink)' },
      { label: 'Net load (actual)', values: report.load.actualNetLoadMw, style: 'solid', color: 'var(--dt-clear-mark)' },
      { label: "PACE's day-ahead forecast", values: report.load.forecastMw, style: 'dashed', color: 'var(--dt-muted)' },
      { label: 'Net load (estimate)', values: report.load.estimatedNetLoadMw, style: 'dotted', color: 'var(--dt-clear-mark)' },
    ];
    const loadBands: IHourChartBand[] = [];

    if (forecastSeries) {
      if (options.showOurForecast) {
        loadSeries.push({ label: 'Our forecast', values: forecastSeries.p50, style: 'dashed', color: 'var(--dt-pulse)' });
      }

      loadBands.push({ label: 'Our P10–P90 range', lower: forecastSeries.p10, upper: forecastSeries.p90, color: 'var(--dt-pulse)' });
    }

    const load: ITrafficChart = {
      series: loadSeries,
      bands: loadBands,
      highlight: loadHighlight,
      xLabels: report.load.xLabels,
      dividerIndices: report.load.dividerIndices,
      estimateFromIndex: report.load.targetStartIndex,
    };

    return {
      load: options.showAllDays ? load : TrafficHelper._dropLeadingHours(load, report.load.targetStartIndex - 24),
      price: {
        series: [
          { label: 'Day-ahead price', values: report.hours.map((hour) => hour.lmp), style: 'solid', color: 'var(--dt-price-high)' },
        ],
        bands: [],
        highlight: dayHighlight,
        xLabels: report.hourLabels,
        dividerIndices: [],
        estimateFromIndex: null,
      },
      carbon: TrafficHelper._carbonChart(report, dayHighlight, options.showUncertainty),
    };
  }

  public static answer(report: ITrafficReport): string[] {
    const window = report.paceRush;
    const sentences: string[] = [];

    if (!window) {
      return [`No rush hour could be placed for ${report.targetDateLabel}.`];
    }

    const windowLabel = TimeLabelHelper.window(window.startLocalHour, window.endLocalHour);

    if (window.isAssumption) {
      sentences.push(`PACE has not posted its forecast for ${report.targetDateLabel} yet, so DETOUR assumes a rush hour of ${windowLabel}`);
    } else {
      const windowLoad = TrafficHelper._mean(report.hours.slice(window.startLocalHour, window.endLocalHour).map((hour) => hour.forecastMw));
      const dayLoad = TrafficHelper._mean(report.hours.map((hour) => hour.forecastMw));
      const loadPart =
        windowLoad !== null && dayLoad !== null && dayLoad > 0
          ? `, when its own forecast averages ${Math.round(windowLoad).toLocaleString('en-US')} MW, ${Math.round(((windowLoad - dayLoad) / dayLoad) * 100)}% above the day's mean`
          : '';
      sentences.push(`PACE's rush hour on ${report.targetDateLabel} is ${windowLabel}${loadPart ? `${loadPart}.` : ''}`);
    }

    const composite = report.rushHour;

    if (!composite) {
      return sentences;
    }

    const compositeLabel = TimeLabelHelper.window(composite.startHour, composite.endHourExclusive);
    const overlap =
      Math.min(composite.endHourExclusive, window.endLocalHour) - Math.max(composite.startHour, window.startLocalHour);

    if (overlap >= trafficConfig.RUSH_HOUR_HOURS / 2) {
      sentences.push(`Price and carbon agree: counting all three clocks, the hottest four hours are ${compositeLabel}`);
    } else {
      sentences.push(`Price and carbon disagree: counting all three clocks together, the hottest four hours are ${compositeLabel}`);
    }

    return sentences;
  }

  public static notices(report: ITrafficReport): ITrafficNotices {
    const window = report.paceRush;
    const inRush = (hour: number): boolean => !!window && hour >= window.startLocalHour && hour < window.endLocalHour;
    const where = (hour: number): string => (inRush(hour) ? 'inside the rush hour' : 'outside the rush hour');
    const loadPeak = TrafficHelper._extreme(report.hours.map((hour) => hour.forecastMw), 'max');
    const netLow = TrafficHelper._extreme(report.hours.map((hour) => hour.estimatedNetLoadMw), 'min');
    const priceHigh = TrafficHelper._extreme(report.hours.map((hour) => hour.lmp), 'max');
    const priceLow = TrafficHelper._extreme(report.hours.map((hour) => hour.lmp), 'min');
    const carbonHigh = TrafficHelper._extreme(report.hours.map((hour) => hour.mefFossilLbPerMwh), 'max');
    const carbonLow = TrafficHelper._extreme(report.hours.map((hour) => hour.mefFossilLbPerMwh), 'min');
    const megawatts = (value: number): string => `${Math.round(value).toLocaleString('en-US')} MW`;
    const pounds = (value: number): string => `${Math.round(value).toLocaleString('en-US')} lb`;
    const loadParts: string[] = [];

    if (loadPeak) {
      loadParts.push(`PACE expects load to peak near ${megawatts(loadPeak.value)} at ${TrafficHelper.hourLabel(loadPeak.hour)}, ${where(loadPeak.hour)}.`);
    }

    if (netLow) {
      loadParts.push(`Net load bottoms out near ${megawatts(netLow.value)} at ${TrafficHelper.hourLabel(netLow.hour)}. That dip is wind and solar at work.`);
    }

    const price =
      priceHigh && priceLow
        ? `Power is cheapest at ${TrafficHelper.hourLabel(priceLow.hour)} ($${priceLow.value.toFixed(0)}/MWh) and dearest at ${TrafficHelper.hourLabel(priceHigh.hour)} ($${priceHigh.value.toFixed(0)}/MWh), ${where(priceHigh.hour)}.`
        : '';
    const carbon =
      carbonHigh && carbonLow
        ? `One more MWh emits most at ${TrafficHelper.hourLabel(carbonHigh.hour)} (${pounds(carbonHigh.value)}) and least at ${TrafficHelper.hourLabel(carbonLow.hour)} (${pounds(carbonLow.value)}). The dirtiest hour is ${where(carbonHigh.hour)}.`
        : '';
    const cleanest = report.ranking.length > 0 ? [...report.ranking].sort((first, second) => first.averageRank - second.averageRank)[0] : null;
    const ranking = cleanest
      ? `The cleanest hour on average, ${cleanest.hourLabel}, ranks ${cleanest.marginalRank} of ${report.ranking.length} on the marginal scale.`
      : '';

    return { load: loadParts.join(' '), price, carbon, ranking };
  }

  public static loadWindow(history: Detour.Firestore.Snapshot.IGridHour[], targetDate: string): ITrafficLoadWindow {
    const dates: string[] = [];

    for (let offset = trafficConfig.WINDOW_DAYS - 1; offset >= 0; offset--) {
      dates.push(TimeHelper.addDays(targetDate, -offset));
    }

    const byKey = new Map<string, Detour.Firestore.Snapshot.IGridHour>();

    for (const hour of history) {
      const key = `${hour.localHourStart.slice(0, 10)}|${Number(hour.localHourStart.slice(11, 13))}`;

      if (!byKey.has(key)) {
        byKey.set(key, hour);
      }
    }

    const renewableTrend = TrafficHelper.renewableTrend(byKey, targetDate);
    const load: ITrafficLoadWindow = {
      xLabels: [],
      actualLoadMw: [],
      actualNetLoadMw: [],
      forecastMw: [],
      estimatedNetLoadMw: [],
      targetStartIndex: (trafficConfig.WINDOW_DAYS - 1) * 24,
      dividerIndices: [],
    };

    dates.forEach((date, dayIndex) => {
      if (dayIndex > 0) {
        load.dividerIndices.push(dayIndex * 24);
      }

      const isTarget = date === targetDate;

      for (let hour = 0; hour < 24; hour++) {
        const row = byKey.get(`${date}|${hour}`);
        const demand = row?.demandMw ?? null;
        const renewable = row ? TrafficHelper.renewableMw(row) : null;
        const forecast = row?.dayAheadForecastMw ?? null;
        const trend = renewableTrend.get(hour) ?? null;

        load.xLabels.push(`${TrafficHelper.dayLabel(date).slice(0, 3)} ${TrafficHelper.compactHourLabel(hour)}`);
        load.actualLoadMw.push(demand);
        load.actualNetLoadMw.push(demand !== null && renewable !== null ? demand - renewable : null);
        load.forecastMw.push(forecast);
        load.estimatedNetLoadMw.push(isTarget && forecast !== null && trend !== null ? forecast - trend : null);
      }
    });

    return load;
  }

  public static renewableMw(row: Detour.Firestore.Snapshot.IGridHour): number | null {
    let total = 0;

    for (const fuelKey of signalsConfig.RENEWABLE_FUEL_KEYS) {
      const value = row.fuelMw[fuelKey];

      if (value === null || value === undefined) {
        return null;
      }

      total += value;
    }

    return total;
  }

  public static renewableTrend(
    byKey: Map<string, Detour.Firestore.Snapshot.IGridHour>,
    targetDate: string,
  ): Map<number, number> {
    const trend = new Map<number, number>();

    for (let hour = 0; hour < 24; hour++) {
      const values: number[] = [];

      for (let offset = 1; offset <= trafficConfig.TREND_DAYS; offset++) {
        const row = byKey.get(`${TimeHelper.addDays(targetDate, -offset)}|${hour}`);
        const renewable = row ? TrafficHelper.renewableMw(row) : null;

        if (renewable !== null) {
          values.push(renewable);
        }
      }

      if (values.length > 0) {
        trend.set(hour, values.reduce((sum, value) => sum + value, 0) / values.length);
      }
    }

    return trend;
  }

  public static lmpByHour(priceHours: Detour.Firestore.Snapshot.IPriceHour[], targetDate: string): Map<number, number> {
    const prices = new Map<number, number>();

    for (const price of priceHours) {
      if (price.lmp === null || price.localStart.slice(0, 10) !== targetDate) {
        continue;
      }

      const hour = Number(price.localStart.slice(11, 13));

      if (!prices.has(hour)) {
        prices.set(hour, price.lmp);
      }
    }

    return prices;
  }

  public static percentileRanks(values: (number | null)[]): (number | null)[] {
    const present = values.filter((value): value is number => value !== null);

    if (present.length < 2) {
      return values.map(() => null);
    }

    return values.map((value) => {
      if (value === null) {
        return null;
      }

      const below = present.filter((other) => other < value).length;

      return below / (present.length - 1);
    });
  }

  public static rushHourBand(hours: ITrafficHour[]): IRushHourBand | null {
    const clockRanks = [
      { name: trafficClocks.STRESS, ranks: TrafficHelper.percentileRanks(hours.map((hour) => hour.estimatedNetLoadMw ?? hour.forecastMw)) },
      { name: trafficClocks.PRICE, ranks: TrafficHelper.percentileRanks(hours.map((hour) => hour.lmp)) },
      { name: trafficClocks.CARBON, ranks: TrafficHelper.percentileRanks(hours.map((hour) => hour.mefFossilLbPerMwh)) },
    ];
    const scores = hours.map((_hour, index) => {
      const present = clockRanks
        .map((clock) => clock.ranks[index])
        .filter((rank): rank is number => rank !== null);

      return present.length === 0 ? 0 : present.reduce((sum, rank) => sum + rank, 0) / present.length;
    });
    const span = trafficConfig.RUSH_HOUR_HOURS;
    let bestStart = -1;
    let bestSum = -1;

    for (let start = 0; start + span <= hours.length; start++) {
      const sum = scores.slice(start, start + span).reduce((total, score) => total + score, 0);

      if (sum > bestSum) {
        bestSum = sum;
        bestStart = start;
      }
    }

    if (bestStart < 0 || bestSum <= 0) {
      return null;
    }

    return {
      startHour: bestStart,
      endHourExclusive: bestStart + span,
      hours: hours.slice(bestStart, bestStart + span).map((hour, offset) => ({
        hour: hour.hour,
        clocks: clockRanks
          .filter((clock) => (clock.ranks[bestStart + offset] ?? -1) >= trafficConfig.TOP_THIRD)
          .map((clock) => clock.name),
      })),
    };
  }

  public static rankingRows(hours: ITrafficHour[]): IRankSlopeRow[] {
    const complete = hours.filter((hour) => hour.averageLbPerMwh !== null && hour.mefFossilLbPerMwh !== null);
    const averageOrder = [...complete].sort((first, second) => (first.averageLbPerMwh ?? 0) - (second.averageLbPerMwh ?? 0));
    const marginalOrder = [...complete].sort(
      (first, second) => (first.mefFossilLbPerMwh ?? 0) - (second.mefFossilLbPerMwh ?? 0),
    );

    return complete.map((hour) => ({
      hour: hour.hour,
      hourLabel: TrafficHelper.hourLabel(hour.hour),
      averageRank: averageOrder.indexOf(hour) + 1,
      marginalRank: marginalOrder.indexOf(hour) + 1,
      averageLbPerMwh: hour.averageLbPerMwh ?? 0,
      marginalLbPerMwh: hour.mefFossilLbPerMwh ?? 0,
    }));
  }

  public static range(values: (number | null)[]): ITrafficRange | null {
    const present = values.filter((value): value is number => value !== null && Number.isFinite(value));

    if (present.length === 0) {
      return null;
    }

    return {
      minLbPerMwh: Math.min(...present),
      maxLbPerMwh: Math.max(...present),
      meanLbPerMwh: present.reduce((sum, value) => sum + value, 0) / present.length,
    };
  }

  public static insights(
    targetDate: string,
    hours: ITrafficHour[],
    rushHour: IRushHourBand | null,
    ranking: IRankSlopeRow[],
    inputs: ITrafficInputs,
    season: MefSeason,
  ): ITrafficInsights {
    const sentences: string[] = [];
    const dateLabel = TrafficHelper.dayLabel(targetDate);
    let headline = `No rush hour could be placed for ${dateLabel}`;

    if (rushHour) {
      const windowHours = hours.slice(rushHour.startHour, rushHour.endHourExclusive);
      const windowLabel = `${TrafficHelper.hourLabel(rushHour.startHour)}–${TrafficHelper.hourLabel(rushHour.endHourExclusive % 24)}`;
      const coincident = rushHour.hours.filter((hour) => hour.clocks.length === 3).length;

      headline = `The rush hour on ${dateLabel} is ${windowLabel}`;

      const meanLmp = TrafficHelper._mean(windowHours.map((hour) => hour.lmp));
      const meanCarbon = TrafficHelper._mean(windowHours.map((hour) => hour.mefFossilLbPerMwh));
      const dayLoad = TrafficHelper._mean(hours.map((hour) => hour.estimatedNetLoadMw ?? hour.forecastMw));
      const windowLoad = TrafficHelper._mean(windowHours.map((hour) => hour.estimatedNetLoadMw ?? hour.forecastMw));
      const parts: string[] = [];

      if (windowLoad !== null && dayLoad !== null && dayLoad > 0) {
        parts.push(
          `PACE's net load runs about ${Math.round(windowLoad).toLocaleString()} MW, ${Math.round(((windowLoad - dayLoad) / dayLoad) * 100)}% versus the day's average`,
        );
      }

      if (meanLmp !== null) {
        parts.push(`the day-ahead price averages $${meanLmp.toFixed(0)}/MWh`);
      }

      if (meanCarbon !== null) {
        parts.push(`the next megawatt-hour emits about ${Math.round(meanCarbon).toLocaleString()} lb of CO2`);
      }

      if (parts.length > 0) {
        sentences.push(`In that window ${parts.join(', ')}.`);
      }

      sentences.push(
        coincident > 0
          ? `Grid stress, price and carbon are all in their top third in ${coincident} of those ${rushHour.hours.length} hours. That is when a battery should stay out of the way of the grid.`
          : `The three clocks peak at different hours, so this band is where they overlap most, not a perfect match. Hours with two or more in their top third: ${rushHour.hours.filter((hour) => hour.clocks.length >= 2).length} of ${rushHour.hours.length}.`,
      );
    }

    const cleanest = ranking.length > 0 ? [...ranking].sort((first, second) => first.averageRank - second.averageRank)[0] : null;

    if (cleanest) {
      sentences.push(
        `At ${cleanest.hourLabel} PACE's own plants look cleanest on average (about ${Math.round(cleanest.averageLbPerMwh).toLocaleString()} lb/MWh), yet the next MWh still emits about ${Math.round(cleanest.marginalLbPerMwh).toLocaleString()} lb, and it ranks ${cleanest.marginalRank} of 24 on the ${season} marginal scale. Average and marginal rank the hours differently.`,
      );
    }

    const score = inputs.score;

    sentences.push(
      `PACE's own day-ahead forecast misses by ${score.mapePercent.toFixed(1)}% in a typical hour and came in low at the daily peak on ${Math.round(score.peakUnderForecastRate)}% of days (${score.startDate} to ${score.endDate}).`,
    );

    return { headline, sentences };
  }

  public static forecastVerdict(comparison: IForecastComparisonRow[]): string {
    const ours = comparison.find((row) => row.id === 'detour-ridge-forecast');
    const pace = comparison.find((row) => row.id === 'eia930-day-ahead-forecast');

    if (!ours || !pace) {
      return 'Not enough data to compare our forecast against PACE’s own.';
    }

    const diff = pace.score.mapePercent - ours.score.mapePercent;
    const oursLabel = `${ours.score.mapePercent.toFixed(1)}%`;
    const paceLabel = `${pace.score.mapePercent.toFixed(1)}%`;

    if (diff > 0.05) {
      return `We beat PACE's own forecast by ${diff.toFixed(1)} points of MAPE (${oursLabel} vs ${paceLabel}).`;
    }

    if (diff < -0.05) {
      return `PACE's forecast beats ours by ${Math.abs(diff).toFixed(1)} points of MAPE (${paceLabel} vs ${oursLabel}).`;
    }

    return `We're about even with PACE's own forecast (${oursLabel} vs ${paceLabel} MAPE).`;
  }

  public static peakMissLabel(meanPeakMissMw: number): string {
    return `${Math.round(Math.abs(meanPeakMissMw)).toLocaleString()} MW ${meanPeakMissMw < 0 ? 'above' : 'below'}`;
  }

  public static compactHourLabel(hour: number): string {
    const twelveHour = hour % 12 === 0 ? 12 : hour % 12;

    return `${twelveHour}${hour < 12 ? 'am' : 'pm'}`;
  }

  public static hourLabel(hour: number): string {
    const suffix = hour < 12 ? 'a.m.' : 'p.m.';
    const twelveHour = hour % 12 === 0 ? 12 : hour % 12;

    return `${twelveHour} ${suffix}`;
  }

  public static dayLabel(localDate: string): string {
    const [year, month, day] = localDate.split('-').map(Number);
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

    return `${trafficCalendar.WEEKDAYS[weekday]} ${trafficCalendar.MONTHS[month - 1]} ${day}`;
  }

  private static _pointsByHour(
    inputs: ITrafficInputs,
    method: MefMethod,
    season: MefSeason,
  ): Map<number, IMarginalEmissionsPoint> {
    const points = new Map<number, IMarginalEmissionsPoint>();
    const series = inputs.marginalSeries.find((candidate) => candidate.method === method);

    for (const point of series?.points ?? []) {
      if (point.season === season) {
        points.set(point.hour, point);
      }
    }

    return points;
  }

  private static _mean(values: (number | null)[]): number | null {
    const present = values.filter((value): value is number => value !== null);

    return present.length === 0 ? null : present.reduce((sum, value) => sum + value, 0) / present.length;
  }

  private static _forecastSeries(
    report: ITrafficReport,
    forecast: ILoadForecast | null,
  ): { p10: (number | null)[]; p50: (number | null)[]; p90: (number | null)[] } | null {
    if (!forecast || forecast.targetHours.length === 0) {
      return null;
    }

    const length = report.load.xLabels.length;
    const p10 = new Array<number | null>(length).fill(null);
    const p50 = new Array<number | null>(length).fill(null);
    const p90 = new Array<number | null>(length).fill(null);

    for (const hour of forecast.targetHours) {
      const index = report.load.targetStartIndex + hour.hour;
      p10[index] = hour.p10Mw;
      p50[index] = hour.p50Mw;
      p90[index] = hour.p90Mw;
    }

    return { p10, p50, p90 };
  }

  private static _carbonChart(report: ITrafficReport, highlight: IHourChartHighlight | null, showUncertainty: boolean): ITrafficChart {
    const fossil: IHourChartSeries = {
      label: 'Marginal CO2 (fossil generation)',
      values: report.hours.map((hour) => hour.mefFossilLbPerMwh),
      style: 'solid',
      color: 'var(--dt-carbon-high)',
    };

    if (!showUncertainty) {
      return { series: [fossil], bands: [], highlight, xLabels: report.hourLabels, dividerIndices: [], estimateFromIndex: null };
    }

    const importLower = report.hours.map((hour) =>
      hour.mefFossilLbPerMwh !== null && hour.mefDemandLbPerMwh !== null ? Math.min(hour.mefFossilLbPerMwh, hour.mefDemandLbPerMwh) : null,
    );
    const importUpper = report.hours.map((hour) =>
      hour.mefFossilLbPerMwh !== null && hour.mefDemandLbPerMwh !== null ? Math.max(hour.mefFossilLbPerMwh, hour.mefDemandLbPerMwh) : null,
    );

    return {
      series: [
        fossil,
        {
          label: 'Marginal CO2 (demand)',
          values: report.hours.map((hour) => hour.mefDemandLbPerMwh),
          style: 'dashed',
          color: 'var(--dt-muted)',
        },
      ],
      bands: [
        {
          label: '95% interval (fossil)',
          lower: report.hours.map((hour) => hour.mefFossilLowLbPerMwh),
          upper: report.hours.map((hour) => hour.mefFossilHighLbPerMwh),
          color: 'var(--dt-carbon-high)',
        },
        { label: 'Import band', lower: importLower, upper: importUpper, color: 'var(--dt-spin)' },
        {
          label: '95% interval (demand)',
          lower: report.hours.map((hour) => hour.mefDemandLowLbPerMwh),
          upper: report.hours.map((hour) => hour.mefDemandHighLbPerMwh),
          color: 'var(--dt-muted)',
        },
      ],
      highlight,
      xLabels: report.hourLabels,
      dividerIndices: [],
      estimateFromIndex: null,
    };
  }

  private static _dropLeadingHours(chart: ITrafficChart, count: number): ITrafficChart {
    if (count <= 0) {
      return chart;
    }

    return {
      series: chart.series.map((line) => ({ ...line, values: line.values.slice(count) })),
      bands: chart.bands.map((band) => ({ ...band, lower: band.lower.slice(count), upper: band.upper.slice(count) })),
      highlight: chart.highlight
        ? { ...chart.highlight, startIndex: chart.highlight.startIndex - count, endIndex: chart.highlight.endIndex - count }
        : null,
      xLabels: chart.xLabels.slice(count),
      dividerIndices: chart.dividerIndices.filter((index) => index > count).map((index) => index - count),
      estimateFromIndex: chart.estimateFromIndex === null ? null : chart.estimateFromIndex - count,
    };
  }

  private static _extreme(values: (number | null)[], direction: 'min' | 'max'): ITrafficHourValue | null {
    let best: ITrafficHourValue | null = null;

    for (let hour = 0; hour < values.length; hour++) {
      const value = values[hour];

      if (value === null || !Number.isFinite(value)) {
        continue;
      }

      if (!best || (direction === 'max' ? value > best.value : value < best.value)) {
        best = { hour, value };
      }
    }

    return best;
  }
}
