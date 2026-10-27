import { IInterval, IPlanInterval, IPlanResult } from '../models';
import { PlanEngineHelper } from '../plan/plan-engine.helper';
import { ILpInput } from '../plan/plan-engine.interfaces';
import { TariffHelper } from '../tariff/tariff.helper';
import { IBacktestInput, IBacktestStrategy, ILpSolver } from './backtest.interfaces';

export class LpStrategyHelper {
  public static rollingLp(solver: ILpSolver): IBacktestStrategy {
    return {
      id: 'rolling-lp',
      label: 'Rolling day-ahead optimizer',
      description:
        "Solves one day at a time with only that day's load, prices and carbon, holding the peak already set this month and carrying Pulse and Spin charge into the next day.",
      role: 'realistic',
      run: (input: IBacktestInput): Promise<IPlanInterval[]> => LpStrategyHelper.runRolling(solver, input),
    };
  }

  public static oracle(solver: ILpSolver): IBacktestStrategy {
    return {
      id: 'oracle',
      label: 'Perfect-foresight oracle',
      description:
        'Solves the whole month at once knowing every interval in advance and minimizing only the bill, without carbon or wear costs. No real controller can do this; it is the ceiling on bill savings the others are measured against.',
      role: 'oracle',
      run: (input: IBacktestInput): Promise<IPlanInterval[]> => LpStrategyHelper.runOracle(solver, input),
    };
  }

  public static async runRolling(solver: ILpSolver, input: IBacktestInput): Promise<IPlanInterval[]> {
    const planned: IPlanInterval[] = [];
    let pulseSocKwh = input.initialPulseSocKwh;
    let spinSocKwh = input.initialSpinSocKwh;
    let pulseNetKw = 0;

    for (const [startIndex, endIndex] of LpStrategyHelper.dayRanges(input.intervals)) {
      const peakSoFar = TariffHelper.peakSoFar(
        input.schedule,
        input.intervals.slice(0, startIndex),
        planned.map((interval: IPlanInterval) => interval.gridKw),
      );
      const lpInput = LpStrategyHelper.lpInput(input, startIndex, endIndex, {
        peakSoFarOnPeakKw: peakSoFar.onPeakKw,
        peakSoFarAllHoursKw: peakSoFar.allHoursKw,
        initialPulseSocKwh: pulseSocKwh,
        initialSpinSocKwh: spinSocKwh,
        initialPulseNetKw: pulseNetKw,
      });
      const dayIntervals = LpStrategyHelper.solvedIntervals(await solver.solve(lpInput), lpInput);
      const lastInterval = dayIntervals[dayIntervals.length - 1];
      pulseSocKwh = lastInterval.pulseSocKwh;
      spinSocKwh = lastInterval.spinSocKwh;
      pulseNetKw = lastInterval.pulseDischargeKw - lastInterval.pulseChargeKw;
      planned.push(...dayIntervals);
    }

    return planned;
  }

  public static async runOracle(solver: ILpSolver, input: IBacktestInput): Promise<IPlanInterval[]> {
    const monthInput = LpStrategyHelper.lpInput(input, 0, input.intervals.length, {
      peakSoFarOnPeakKw: 0,
      peakSoFarAllHoursKw: 0,
      initialPulseSocKwh: input.initialPulseSocKwh,
      initialSpinSocKwh: input.initialSpinSocKwh,
      initialPulseNetKw: 0,
    });
    const { spin, pulse } = monthInput.assets;
    const lpInput: ILpInput = {
      ...monthInput,
      request: { ...monthInput.request, co2WeightPerKg: 0 },
      assets: {
        ...monthInput.assets,
        spin: { ...spin, degradationCostPerKwh: 0 },
        pulse: { ...pulse, degradationCostPerKwh: 0 },
      },
    };

    return LpStrategyHelper.solvedIntervals(await solver.solve(lpInput), lpInput);
  }

  public static dayRanges(intervals: IInterval[]): [number, number][] {
    const ranges: [number, number][] = [];

    for (let i = 0; i < intervals.length; i++) {
      if (i === 0 || intervals[i].localDate !== intervals[i - 1].localDate) {
        ranges.push([i, i + 1]);
      } else {
        ranges[ranges.length - 1][1] = i + 1;
      }
    }

    return ranges;
  }

  private static lpInput(
    input: IBacktestInput,
    startIndex: number,
    endIndex: number,
    state: Pick<
      ILpInput['request'],
      'peakSoFarOnPeakKw' | 'peakSoFarAllHoursKw' | 'initialPulseSocKwh' | 'initialSpinSocKwh' | 'initialPulseNetKw'
    >,
  ): ILpInput {
    const intervals = input.intervals
      .slice(startIndex, endIndex)
      .map((interval: IInterval, index: number) => ({ ...interval, index }));
    const firstDate = intervals[0].localDate;
    const dayCount = new Set(intervals.map((interval: IInterval) => interval.localDate)).size;

    return {
      request: {
        ...PlanEngineHelper.defaultRequest(input.site, input.assets, input.schedule, firstDate),
        horizonDays: dayCount,
        wattsmartReserveKwh: input.wattsmartReserveKwh,
        ...state,
      },
      schedule: input.schedule,
      assets: input.assets,
      intervals,
      loadKw: input.loadKw.slice(startIndex, endIndex),
      onPeakMask: input.onPeakMask.slice(startIndex, endIndex),
      energyPricePerKwh: input.energyPricePerKwh.slice(startIndex, endIndex),
      marginalKgCo2PerKwh: input.marginalKgCo2PerKwh.slice(startIndex, endIndex),
      rushHourMask: input.rushHourMask.slice(startIndex, endIndex),
      rushHourWindows: [],
      monthToDateIntervals: [],
      monthToDateLoadKw: [],
    };
  }

  private static solvedIntervals(result: IPlanResult, lpInput: ILpInput): IPlanInterval[] {
    if (result.status !== 'optimal') {
      throw new Error(
        `The LP could not plan ${lpInput.request.date} (${lpInput.request.horizonDays} days): ${result.errorMessage ?? result.status}`,
      );
    }

    return result.intervals;
  }
}
