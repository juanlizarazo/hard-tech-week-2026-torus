import type { Highs } from 'highs';
import { TimeHelper } from '../helpers/time.helper';
import {
  IBillBreakdown,
  IInterval,
  ILpStats,
  IMarginalEmissionsPoint,
  IMarginalEmissionsSeries,
  IPlanInterval,
  IPlanMetrics,
  IPlanRequest,
  IPlanResult,
  IPlanValue,
  IRushHourWindow,
  ISiteArchetype,
  ISiteLoadInterval,
  IStationAssets,
  ITariffSchedule,
} from '../models';
import { SiteGeneratorHelper } from '../sites/site-generator.helper';
import { TariffHelper } from '../tariff/tariff.helper';
import { LpBuilderHelper } from './lp-builder.helper';
import { ILpInput, ILpModel, IMonthToDate } from './plan-engine.interfaces';
import { mefConversions } from './placeholder-mef.constants';
import { planEngineSettings } from './plan-engine.constants';

export class PlanEngineHelper {
  public static defaultRequest(
    site: ISiteArchetype,
    assets: IStationAssets,
    schedule: ITariffSchedule,
    date: string,
  ): IPlanRequest {
    return {
      siteId: site.id,
      scheduleId: schedule.id,
      date,
      horizonDays: 2,
      co2WeightPerKg: planEngineSettings.DEFAULT_CO2_WEIGHT_PER_KG,
      wattsmartReserveKwh: 0,
      peakSoFarOnPeakKw: 0,
      peakSoFarAllHoursKw: 0,
      initialSpinSocKwh: 0,
      initialPulseSocKwh: assets.pulse.energyKwh * planEngineSettings.DEFAULT_PULSE_SOC_FRACTION,
    };
  }

  public static buildInput(
    site: ISiteArchetype,
    assets: IStationAssets,
    schedule: ITariffSchedule,
    request: IPlanRequest,
    mef: IMarginalEmissionsSeries,
    rushHourWindows: IRushHourWindow[],
  ): ILpInput {
    const dayDates = [request.date, TimeHelper.addDays(request.date, 1)];
    const intervals = PlanEngineHelper.reindex(dayDates.flatMap((day: string) => TimeHelper.localDayIntervals(day)));
    const loadKw = dayDates.flatMap((day: string) => PlanEngineHelper.loadFor(site, day));
    const onPeakMask = TariffHelper.onPeakMask(schedule, intervals);
    const isOnPeakBasis = schedule.demandBasis === 'on-peak';
    const energyPricePerKwh = intervals.map((interval: IInterval, i: number) => {
      const rates = TariffHelper.seasonRatesFor(schedule, interval.localDate);

      return isOnPeakBasis && onPeakMask[i] ? rates.energyOnPeakPerKwh : rates.energyOffPeakPerKwh;
    });
    const marginalKgCo2PerKwh = PlanEngineHelper.marginalSeries(schedule, intervals, mef);
    const rushHourMask = PlanEngineHelper.rushHourMask(intervals, rushHourWindows);
    const monthToDate = PlanEngineHelper.monthToDate(site, request.date);
    const peakSoFar = TariffHelper.peakSoFar(schedule, monthToDate.intervals, monthToDate.loadKw);
    const initialPulseSocKwh =
      request.initialPulseSocKwh < 0 ? assets.pulse.energyKwh * planEngineSettings.DEFAULT_PULSE_SOC_FRACTION : request.initialPulseSocKwh;
    const initialSpinSocKwh = request.initialSpinSocKwh < 0 ? 0 : request.initialSpinSocKwh;

    return {
      request: {
        ...request,
        peakSoFarOnPeakKw: peakSoFar.onPeakKw,
        peakSoFarAllHoursKw: peakSoFar.allHoursKw,
        initialPulseSocKwh,
        initialSpinSocKwh,
      },
      schedule,
      assets,
      intervals,
      loadKw,
      onPeakMask,
      energyPricePerKwh,
      marginalKgCo2PerKwh,
      rushHourMask,
      rushHourWindows,
      monthToDateIntervals: monthToDate.intervals,
      monthToDateLoadKw: monthToDate.loadKw,
    };
  }

  public static rushHourWindows(gridHours: Detour.Firestore.Snapshot.IGridHour[], date: string): IRushHourWindow[] {
    const startHour = PlanEngineHelper.busiestBlockStart(gridHours, date);
    const isAssumption = startHour === null;
    const blockStart = startHour ?? planEngineSettings.FALLBACK_RUSH_HOUR_START;

    return [
      PlanEngineHelper.windowFor(date, blockStart, isAssumption),
      PlanEngineHelper.windowFor(TimeHelper.addDays(date, 1), blockStart, true),
    ];
  }

  public static solve(highs: Highs, input: ILpInput): IPlanResult {
    const startMs = performance.now();
    let model: ILpModel = { lpText: '', columnNames: [], stats: PlanEngineHelper.emptyStats(input) };

    try {
      model = LpBuilderHelper.build(input);
      const solution = highs.solve(model.lpText);
      const solveMs = performance.now() - startMs;

      if (solution.Status !== 'Optimal') {
        return PlanEngineHelper.failedResult(
          input,
          'infeasible',
          PlanEngineHelper.infeasibleMessage(input, solution.Status),
          model.lpText,
          solveMs,
          { ...model.stats, solveMs },
        );
      }

      const columns = solution.Columns as Record<string, { Primal: number }>;
      const primal = (name: string): number => PlanEngineHelper.clean(columns[name]?.Primal ?? 0);

      return PlanEngineHelper.optimalResult(
        input,
        model.lpText,
        { ...model.stats, solveMs },
        primal,
        solution.ObjectiveValue,
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);

      return PlanEngineHelper.failedResult(
        input,
        'error',
        `The solver failed before returning a plan: ${message}`,
        model.lpText,
        performance.now() - startMs,
        model.stats,
      );
    }
  }

  public static emptyStats(input: ILpInput): ILpStats {
    return { intervalCount: input.intervals.length, variableCount: 0, constraintCount: 0, solveMs: 0 };
  }

  public static failedResult(
    input: ILpInput,
    status: 'infeasible' | 'error',
    errorMessage: string,
    lpText: string,
    solveMs: number,
    lpStats: ILpStats = PlanEngineHelper.emptyStats(input),
  ): IPlanResult {
    const baselineBill = PlanEngineHelper.billFor(input, input.loadKw);
    const intervals = input.intervals.map((interval: IInterval, t: number) =>
      PlanEngineHelper.planInterval(input, interval, t, input.loadKw[t], 0, 0, 0, 0, 0, 0),
    );

    return {
      request: input.request,
      status,
      intervals,
      demandKw: baselineBill.determinants.demandKw,
      baselineBill,
      plannedBill: baselineBill,
      lpText,
      solveMs,
      lpStats: { ...lpStats, solveMs },
      errorMessage,
    };
  }

  private static optimalResult(
    input: ILpInput,
    lpText: string,
    lpStats: ILpStats,
    primal: (name: string) => number,
    objectiveValue: number,
  ): IPlanResult {
    const { assets } = input;
    const intervals = input.intervals.map((interval: IInterval, t: number) =>
      PlanEngineHelper.planInterval(
        input,
        interval,
        t,
        primal(`g_${t}`),
        primal(`fc_${t}`),
        primal(`fd_${t}`),
        primal(`pc_${t}`),
        primal(`pd_${t}`),
        primal(`sf_${t}`),
        primal(`sp_${t}`),
      ),
    );
    const gridKw = intervals.map((planInterval: IPlanInterval) => planInterval.gridKw);
    let baselineCo2Kg = 0;
    let plannedCo2Kg = 0;
    let baselineRushHourKwh = 0;
    let plannedRushHourKwh = 0;
    let spinThroughputKwh = 0;
    let pulseThroughputKwh = 0;
    let minimumHeldKwh = Number.POSITIVE_INFINITY;
    const pulseFloorKwh = assets.pulse.minSocFraction * assets.pulse.energyKwh;

    for (let t = 0; t < intervals.length; t++) {
      const stepHours = input.intervals[t].hours;
      const planInterval = intervals[t];
      baselineCo2Kg += input.marginalKgCo2PerKwh[t] * input.loadKw[t] * stepHours;
      plannedCo2Kg += input.marginalKgCo2PerKwh[t] * planInterval.gridKw * stepHours;
      spinThroughputKwh += planInterval.spinDischargeKw * stepHours;
      pulseThroughputKwh += planInterval.pulseDischargeKw * stepHours;

      if (input.rushHourMask[t]) {
        baselineRushHourKwh += input.loadKw[t] * stepHours;
        plannedRushHourKwh += planInterval.gridKw * stepHours;
        minimumHeldKwh = Math.min(minimumHeldKwh, planInterval.pulseSocKwh - pulseFloorKwh);
      }
    }

    const rushHourPulseMinKwh = Number.isFinite(minimumHeldKwh) ? Math.max(0, minimumHeldKwh) : 0;
    const wattsmartHeldKwh = input.request.wattsmartReserveKwh > 0 ? rushHourPulseMinKwh : 0;
    const metrics: IPlanMetrics = {
      baselineCo2Kg,
      plannedCo2Kg,
      baselineRushHourKwh,
      plannedRushHourKwh,
      trafficAvoidedKwh: baselineRushHourKwh - plannedRushHourKwh,
      rushHourWindows: input.rushHourWindows,
      wattsmartHeldKwh,
      rushHourPulseMinKwh,
      spinBurstCount: PlanEngineHelper.spinBurstCount(intervals),
      spinThroughputKwh,
      pulseThroughputKwh,
      objectiveValue,
      value: PlanEngineHelper.planValue(input, gridKw, plannedCo2Kg - baselineCo2Kg),
    };

    return {
      request: input.request,
      status: 'optimal',
      intervals,
      demandKw: primal('D'),
      baselineBill: PlanEngineHelper.billFor(input, input.loadKw),
      plannedBill: PlanEngineHelper.billFor(input, gridKw),
      lpText,
      solveMs: lpStats.solveMs,
      lpStats,
      metrics,
    };
  }

  public static spinBurstCount(intervals: IPlanInterval[]): number {
    let count = 0;
    let isBursting = false;

    for (const planInterval of intervals) {
      const isDischarging = planInterval.spinDischargeKw > planEngineSettings.SPIN_BURST_MIN_KW;

      if (isDischarging && !isBursting) {
        count++;
      }

      isBursting = isDischarging;
    }

    return count;
  }

  public static planValue(input: ILpInput, gridKw: number[], co2ChangeKg: number): IPlanValue {
    const { schedule, request } = input;
    const isOnPeakBasis = schedule.demandBasis === 'on-peak';
    const demandFloorKw = isOnPeakBasis ? request.peakSoFarOnPeakKw : request.peakSoFarAllHoursKw;
    const billedPeak = (series: number[]): number =>
      series.reduce(
        (peak: number, kw: number, t: number) => (isOnPeakBasis && !input.onPeakMask[t] ? peak : Math.max(peak, kw)),
        demandFloorKw,
      );
    const facilitiesPeak = (series: number[]): number =>
      series.reduce((peak: number, kw: number) => Math.max(peak, kw), request.peakSoFarAllHoursKw);
    const energyCost = (series: number[]): number =>
      series.reduce(
        (sum: number, kw: number, t: number) => sum + kw * input.intervals[t].hours * input.energyPricePerKwh[t],
        0,
      );
    const demandRatePerKw =
      input.intervals.length > 0 ? TariffHelper.seasonRatesFor(schedule, input.intervals[0].localDate).demandRatePerKw : 0;
    const baselinePeakKw = billedPeak(input.loadKw);
    const plannedPeakKw = billedPeak(gridKw);
    const baselineFacilitiesKw = facilitiesPeak(input.loadKw);
    const plannedFacilitiesKw = facilitiesPeak(gridKw);
    const peakCutKw = Math.max(0, baselinePeakKw - plannedPeakKw);
    const facilitiesCutKw = Math.max(0, baselineFacilitiesKw - plannedFacilitiesKw);
    const demandWorthPerMonth = peakCutKw * demandRatePerKw;
    const facilitiesWorthPerMonth = facilitiesCutKw * schedule.facilitiesRatePerKw;
    const baselineEnergyCost = energyCost(input.loadKw);
    const plannedEnergyCost = energyCost(gridKw);

    return {
      baselinePeakKw,
      plannedPeakKw,
      peakCutKw,
      baselineFacilitiesKw,
      plannedFacilitiesKw,
      facilitiesCutKw,
      demandRatePerKw,
      facilitiesRatePerKw: schedule.facilitiesRatePerKw,
      demandWorthPerMonth,
      facilitiesWorthPerMonth,
      worthPerMonth: demandWorthPerMonth + facilitiesWorthPerMonth,
      baselineEnergyCost,
      plannedEnergyCost,
      energyCostChange: plannedEnergyCost - baselineEnergyCost,
      co2ChangeKg,
    };
  }

  private static planInterval(
    input: ILpInput,
    interval: IInterval,
    t: number,
    gridKw: number,
    spinChargeKw: number,
    spinDischargeKw: number,
    pulseChargeKw: number,
    pulseDischargeKw: number,
    spinSocKwh: number,
    pulseSocKwh: number,
  ): IPlanInterval {
    return {
      startUtc: interval.startUtc,
      loadKw: input.loadKw[t],
      gridKw,
      spinChargeKw,
      spinDischargeKw,
      pulseChargeKw,
      pulseDischargeKw,
      spinSocKwh,
      pulseSocKwh,
      isOnPeak: input.onPeakMask[t],
      energyPricePerKwh: input.energyPricePerKwh[t],
      marginalKgCo2PerKwh: input.marginalKgCo2PerKwh[t],
    };
  }

  private static billFor(input: ILpInput, horizonKw: number[]): IBillBreakdown {
    const month = input.request.date.slice(0, 7);
    const intervals = [...input.monthToDateIntervals];
    const loadKw = [...input.monthToDateLoadKw];

    for (let t = 0; t < input.intervals.length; t++) {
      if (input.intervals[t].localDate.slice(0, 7) === month) {
        intervals.push(input.intervals[t]);
        loadKw.push(horizonKw[t]);
      }
    }

    return TariffHelper.monthlyBill(input.schedule, PlanEngineHelper.reindex(intervals), loadKw);
  }

  private static infeasibleMessage(input: ILpInput, status: string): string {
    if (input.request.wattsmartReserveKwh > 0) {
      return 'The plan has no feasible dispatch: the Wattsmart reserve is larger than the station can hold through the rush-hour window.';
    }

    return `The plan has no feasible dispatch (solver status: ${status}).`;
  }

  private static clean(value: number): number {
    if (Math.abs(value) < planEngineSettings.TINY_VALUE) {
      return 0;
    }

    return value;
  }

  private static loadFor(site: ISiteArchetype, day: string): number[] {
    return SiteGeneratorHelper.generateDay(site, day).map((interval: ISiteLoadInterval) => interval.kw);
  }

  private static reindex(intervals: IInterval[]): IInterval[] {
    return intervals.map((interval: IInterval, index: number) => ({ ...interval, index }));
  }

  private static monthToDate(site: ISiteArchetype, date: string): IMonthToDate {
    const intervals: IInterval[] = [];
    const loadKw: number[] = [];
    let day = `${date.slice(0, 7)}-01`;

    while (day < date) {
      intervals.push(...TimeHelper.localDayIntervals(day));
      loadKw.push(...PlanEngineHelper.loadFor(site, day));
      day = TimeHelper.addDays(day, 1);
    }

    return { intervals: PlanEngineHelper.reindex(intervals), loadKw };
  }

  private static marginalSeries(
    schedule: ITariffSchedule,
    intervals: IInterval[],
    mef: IMarginalEmissionsSeries,
  ): number[] {
    const pointsByKey = new Map<string, number>(
      mef.points.map((point: IMarginalEmissionsPoint) => [`${point.season}|${point.hour}`, point.lbPerMwh]),
    );

    return intervals.map((interval: IInterval) => {
      const season = TariffHelper.seasonOf(schedule, Number(interval.localDate.slice(5, 7)));
      const hour = Math.floor(interval.localHour);
      const lbPerMwh = pointsByKey.get(`${season}|${hour}`) ?? 0;

      return lbPerMwh * mefConversions.KG_PER_KWH_PER_LB_PER_MWH;
    });
  }

  private static rushHourMask(intervals: IInterval[], windows: IRushHourWindow[]): boolean[] {
    const ranges = windows.map((window: IRushHourWindow) => [Date.parse(window.startUtc), Date.parse(window.endUtc)]);

    return intervals.map((interval: IInterval) => {
      const startMs = Date.parse(interval.startUtc);

      return ranges.some(([windowStartMs, windowEndMs]) => startMs >= windowStartMs && startMs < windowEndMs);
    });
  }

  private static busiestBlockStart(gridHours: Detour.Firestore.Snapshot.IGridHour[], date: string): number | null {
    const megawattsByHour: (number | null)[] = new Array(24).fill(null);

    for (const gridHour of gridHours) {
      if (!gridHour.localHourStart.startsWith(date)) {
        continue;
      }

      const hour = Number(gridHour.localHourStart.slice(11, 13));
      const megawatts = gridHour.dayAheadForecastMw ?? gridHour.demandMw;

      if (megawattsByHour[hour] === null && megawatts !== null && Number.isFinite(megawatts)) {
        megawattsByHour[hour] = megawatts;
      }
    }

    let bestStart: number | null = null;
    let bestSum = Number.NEGATIVE_INFINITY;

    for (let start = 0; start + planEngineSettings.RUSH_HOUR_BLOCK_HOURS <= 24; start++) {
      const block = megawattsByHour.slice(start, start + planEngineSettings.RUSH_HOUR_BLOCK_HOURS);

      if (block.some((megawatts: number | null) => megawatts === null)) {
        continue;
      }

      const sum = block.reduce((total: number, megawatts: number | null) => total + (megawatts ?? 0), 0);

      if (sum > bestSum) {
        bestSum = sum;
        bestStart = start;
      }
    }

    return bestStart;
  }

  private static windowFor(date: string, startHour: number, isAssumption: boolean): IRushHourWindow {
    const endHour = startHour + planEngineSettings.RUSH_HOUR_BLOCK_HOURS;
    const dayIntervals = TimeHelper.localDayIntervals(date);
    const startInterval = dayIntervals.find((interval: IInterval) => interval.localHour >= startHour);
    const endInterval = dayIntervals.find((interval: IInterval) => interval.localHour >= endHour);
    const nextMidnightUtc = new Date(TimeHelper.localMidnightUtcMs(TimeHelper.addDays(date, 1))).toISOString();

    return {
      startUtc: startInterval?.startUtc ?? nextMidnightUtc,
      endUtc: endInterval?.startUtc ?? nextMidnightUtc,
      startLocalHour: startHour,
      endLocalHour: endHour,
      isAssumption,
    };
  }
}
