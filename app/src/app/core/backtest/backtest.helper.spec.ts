import highsLoader, { Highs } from 'highs';
import { IMarginalEmissionsSeries, IPlanInterval, ITariffSchedule } from '../models';
import { PlanEngineHelper } from '../plan/plan-engine.helper';
import { ILpInput } from '../plan/plan-engine.interfaces';
import { SitesHelper } from '../sites/sites.helper';
import { siteArchetypes } from '../sites/sites.constants';
import { tariffSchedules } from '../tariff/tariff.constants';
import { TariffHelper } from '../tariff/tariff.helper';
import { IBacktestInput, IBacktestResult, IBacktestStrategyResult, ILpSolver } from './backtest.interfaces';
import { BacktestViewStateHelper } from '../../backtest/backtest-view-state.helper';
import { IBacktestControls, IBacktestViewState } from '../../backtest/backtest.interfaces';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import { BacktestRunnerHelper } from './backtest-runner.helper';
import { LpStrategyHelper } from './lp-strategy.helper';
import { NaiveShaverHelper } from './naive-shaver.helper';

const syntheticMef: IMarginalEmissionsSeries = {
  method: 'fossil-generation',
  points: [],
  provenance: [{ id: 'synthetic-mef', label: 'Flat test factor', kind: 'assumption', url: '' }],
};

const gridMonth: Detour.Firestore.Snapshot.IGridMonth = { month: '2026-07', hours: [] };
const schedules = [tariffSchedules.SCHEDULE_8, tariffSchedules.SCHEDULE_6] as ITariffSchedule[];
const strategies = [NaiveShaverHelper.noStorage, NaiveShaverHelper.naiveShaver];

const buildInput = (siteId: string, schedule: ITariffSchedule): IBacktestInput => {
  const site = Object.values(siteArchetypes).find((archetype) => archetype.id === siteId)!;
  const input = BacktestRunnerHelper.buildInput(site, schedule, SitesHelper.getAssets(siteId)!, gridMonth, null, syntheticMef);

  return {
    ...input,
    marginalKgCo2PerKwh: input.intervals.map(() => 0.4),
    rushHourMask: input.intervals.map((interval) => interval.isWeekday && interval.localHour >= 17 && interval.localHour < 21),
  };
};

const cases = Object.values(siteArchetypes).flatMap((site) => schedules.map((schedule) => ({ site, schedule })));

describe('July 2026 backtest sanity checks', () => {
  for (const { site, schedule } of cases) {
    describe(`${site.id} on ${schedule.id}`, () => {
      const input = buildInput(site.id, schedule);
      let result: IBacktestResult;

      it('runs both strategies', async () => {
        result = await BacktestRunnerHelper.run(input, strategies);
        expect(result.strategies.length).toBe(1);
      });

      it('keeps the naive shaver inside power, SOC and ramp limits', () => {
        const { spin, pulse } = input.assets;
        const floor = pulse.minSocFraction * pulse.energyKwh + input.wattsmartReserveKwh;
        const epsilon = 1e-6;
        let previousNet = 0;

        result.lead.intervals.forEach((interval: IPlanInterval) => {
          expect(interval.spinDischargeKw).toBeLessThanOrEqual(spin.powerKw + epsilon);
          expect(interval.spinChargeKw).toBeLessThanOrEqual(spin.powerKw + epsilon);
          expect(interval.pulseDischargeKw).toBeLessThanOrEqual(pulse.powerKw + epsilon);
          expect(interval.pulseChargeKw).toBeLessThanOrEqual(pulse.powerKw + epsilon);
          expect(interval.spinSocKwh).toBeGreaterThanOrEqual(-epsilon);
          expect(interval.spinSocKwh).toBeLessThanOrEqual(spin.energyKwh + epsilon);
          expect(interval.pulseSocKwh).toBeLessThanOrEqual(pulse.maxSocFraction * pulse.energyKwh + epsilon);
          expect(interval.pulseSocKwh).toBeGreaterThanOrEqual(floor - epsilon);
          expect(interval.gridKw).toBeGreaterThanOrEqual(-epsilon);

          const net = interval.pulseDischargeKw - interval.pulseChargeKw;
          expect(Math.abs(net - previousNet)).toBeLessThanOrEqual(pulse.rampLimitKwPerStep + epsilon);
          previousNet = net;
        });

        expect(result.lead.wattsmart.minimumHeldKwh).toBeGreaterThanOrEqual(input.wattsmartReserveKwh - 1e-6);
      });

      it('never sets a month peak above the no-storage baseline', () => {
        expect(result.lead.bill.determinants.demandKw).toBeLessThanOrEqual(result.baseline.bill.determinants.demandKw + 1e-6);
        expect(result.lead.facilitiesKw).toBeLessThanOrEqual(result.baseline.facilitiesKw + 1e-6);
      });

      it('adds component savings up to the total', () => {
        const { customer, facilities, demand, energy, total } = result.lead.savings;
        expect(Math.abs(customer + facilities + demand + energy - total)).toBeLessThanOrEqual(0.01);
      });

      it('bills no storage exactly like the baseline', () => {
        expect(result.baseline.savings.total).toBe(0);
        expect(result.baseline.bill.total).toBe(TariffHelper.monthlyBill(schedule, input.intervals, input.loadKw).total);
      });
    });
  }
});

describe('July 2026 LP strategies sanity checks', () => {
  const epsilon = 1e-3;
  let highs: Highs;
  const solver: ILpSolver = { solve: (lpInput: ILpInput) => Promise.resolve(PlanEngineHelper.solve(highs, lpInput)) };

  beforeAll(async () => {
    highs = await highsLoader();
  });

  for (const { site, schedule } of cases) {
    describe(`${site.id} on ${schedule.id}`, () => {
      const input = buildInput(site.id, schedule);
      let result: IBacktestResult;
      let rolling: IBacktestStrategyResult;
      let oracle: IBacktestStrategyResult;
      let detour: IBacktestStrategyResult;

      it('runs DETOUR, the rolling LP with a perfect load forecast and the oracle', async () => {
        result = await BacktestRunnerHelper.run(input, [
          ...strategies,
          LpStrategyHelper.detour(solver),
          LpStrategyHelper.rollingLp(solver),
          LpStrategyHelper.oracle(solver),
        ]);
        rolling = result.strategies.find((entry) => entry.strategy.role === 'perfect-load')!;
        detour = result.lead;
        oracle = result.oracle!;
        expect(result.lead.strategy.role).toBe('realistic');
        expect(oracle.strategy.role).toBe('oracle');
        expect(rolling.captureRate).not.toBeNull();
        expect(detour.captureRate).not.toBeNull();
      }, 240000);

      it('keeps both LPs inside SOC, power, ramp and the Wattsmart reserve', () => {
        const { spin, pulse } = input.assets;
        const pulseMinKwh = pulse.minSocFraction * pulse.energyKwh;

        for (const strategyResult of [rolling, oracle]) {
          let previousNet = 0;

          strategyResult.intervals.forEach((interval: IPlanInterval, index: number) => {
            expect(interval.spinDischargeKw).toBeLessThanOrEqual(spin.powerKw + epsilon);
            expect(interval.spinChargeKw).toBeLessThanOrEqual(spin.powerKw + epsilon);
            expect(interval.pulseDischargeKw).toBeLessThanOrEqual(pulse.powerKw + epsilon);
            expect(interval.pulseChargeKw).toBeLessThanOrEqual(pulse.powerKw + epsilon);
            expect(interval.spinSocKwh).toBeGreaterThanOrEqual(-epsilon);
            expect(interval.spinSocKwh).toBeLessThanOrEqual(spin.energyKwh + epsilon);
            expect(interval.pulseSocKwh).toBeGreaterThanOrEqual(pulseMinKwh - epsilon);
            expect(interval.pulseSocKwh).toBeLessThanOrEqual(pulse.maxSocFraction * pulse.energyKwh + epsilon);
            expect(interval.gridKw).toBeGreaterThanOrEqual(-epsilon);

            const net = interval.pulseDischargeKw - interval.pulseChargeKw;
            expect(Math.abs(net - previousNet)).toBeLessThanOrEqual(pulse.rampLimitKwPerStep + epsilon);
            previousNet = net;

            if (input.rushHourMask[index]) {
              expect(interval.pulseSocKwh - pulseMinKwh).toBeGreaterThanOrEqual(
                input.wattsmartReserveKwh - epsilon,
              );
            }
          });

          expect(strategyResult.wattsmart.minimumHeldKwh).toBeGreaterThanOrEqual(input.wattsmartReserveKwh - epsilon);
        }
      });

      it('keeps DETOUR with a forecast inside power, SOC and the Wattsmart reserve on the real load', () => {
        const { spin, pulse } = input.assets;
        const pulseMinKwh = pulse.minSocFraction * pulse.energyKwh;

        detour.intervals.forEach((interval: IPlanInterval, index: number) => {
          expect(interval.loadKw).toBe(input.loadKw[index]);
          expect(interval.spinDischargeKw).toBeLessThanOrEqual(spin.powerKw + epsilon);
          expect(interval.pulseDischargeKw).toBeLessThanOrEqual(pulse.powerKw + epsilon);
          expect(interval.pulseChargeKw).toBeLessThanOrEqual(pulse.powerKw + epsilon);
          expect(interval.spinSocKwh).toBeGreaterThanOrEqual(-epsilon);
          expect(interval.spinSocKwh).toBeLessThanOrEqual(spin.energyKwh + epsilon);
          expect(interval.pulseSocKwh).toBeGreaterThanOrEqual(pulseMinKwh - epsilon);
          expect(interval.pulseSocKwh).toBeLessThanOrEqual(pulse.maxSocFraction * pulse.energyKwh + epsilon);
          expect(interval.gridKw).toBeGreaterThanOrEqual(-epsilon);
          expect(Math.abs(interval.loadKw - interval.gridKw - (interval.spinDischargeKw - interval.spinChargeKw) - (interval.pulseDischargeKw - interval.pulseChargeKw))).toBeLessThanOrEqual(epsilon);
        });
        expect(detour.bill.determinants.demandKw).toBeLessThanOrEqual(result.baseline.bill.determinants.demandKw + epsilon);
      });

      it('never sets an LP billed demand peak or bill above the no-storage baseline', () => {
        for (const strategyResult of [rolling, oracle]) {
          expect(strategyResult.bill.determinants.demandKw).toBeLessThanOrEqual(result.baseline.bill.determinants.demandKw + epsilon);
          expect(strategyResult.savings.total).toBeGreaterThanOrEqual(0);
        }
      });

      it('saves at least as much with the oracle as with the rolling LP', () => {
        expect(oracle.savings.total).toBeGreaterThanOrEqual(rolling.savings.total - 0.01);
      });
    });
  }
});

describe('Backtest view states', () => {
  const controls: IBacktestControls = { siteId: 'airport', scheduleId: 'schedule-8' };
  const lastState = (stream: Observable<IBacktestViewState>): Promise<IBacktestViewState> =>
    new Promise((resolve) => {
      let latest: IBacktestViewState | null = null;
      stream.subscribe({
        next: (state) => (latest = state),
        complete: () => resolve(latest as unknown as IBacktestViewState),
      });
    });

  it('shows the empty state when the snapshot has no July grid month', async () => {
    const sources = { manifest: null, gridMonth: null, priceMonth: null, marginalEmissions: null };
    const state = await lastState(BacktestViewStateHelper.fromSources(of(sources), of(controls), () => throwError(() => new Error('unused'))));

    expect(state.status).toBe('empty');
  });

  it('shows the error state when the run fails', async () => {
    const sources = {
      manifest: {} as Detour.Firestore.Snapshot.IManifest,
      gridMonth,
      priceMonth: null,
      marginalEmissions: syntheticMef,
    };
    const state = await lastState(
      BacktestViewStateHelper.fromSources(of(sources), of(controls), () => throwError(() => new Error('boom'))),
    );

    expect(state.status).toBe('error');
    expect(state.errorMessage.length).toBeGreaterThan(0);
  });

  it('starts in the loading state', async () => {
    const first = await firstValueFrom(
      BacktestViewStateHelper.fromSources(of({ manifest: null, gridMonth: null, priceMonth: null, marginalEmissions: null }), of(controls), () => throwError(() => new Error('unused'))),
    );

    expect(first.status).toBe('loading');
  });
});
