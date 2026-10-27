import { IMarginalEmissionsSeries, IPlanInterval, ITariffSchedule } from '../models';
import { SitesHelper } from '../sites/sites.helper';
import { siteArchetypes } from '../sites/sites.constants';
import { tariffSchedules } from '../tariff/tariff.constants';
import { TariffHelper } from '../tariff/tariff.helper';
import { IBacktestInput, IBacktestResult } from './backtest.interfaces';
import { BacktestViewStateHelper } from '../../backtest/backtest-view-state.helper';
import { IBacktestControls, IBacktestViewState } from '../../backtest/backtest.interfaces';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import { BacktestRunnerHelper } from './backtest-runner.helper';
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
