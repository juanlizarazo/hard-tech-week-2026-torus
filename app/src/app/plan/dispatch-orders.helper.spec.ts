import highsLoader, { Highs } from 'highs';
import { IPlanInterval, IRushHourWindow, ITariffSchedule } from '@app/core/models';
import { TimeHelper } from '@app/core/helpers';
import { PlanEngineHelper, placeholderMefSeries } from '@app/core/plan';
import { stationAssets } from '@app/core/sites/asset.constants';
import { siteArchetypes } from '@app/core/sites/sites.constants';
import { tariffSchedules } from '@app/core/tariff/tariff.constants';
import { DispatchOrdersHelper } from './dispatch-orders.helper';
import { PlanHelper } from './plan.helper';
import { IDispatchOrder, IDispatchOrdersInput } from './dispatch-orders.interfaces';

const date = '2026-10-28';

const flatDay = (localDate: string): IPlanInterval[] =>
  TimeHelper.localDayIntervals(localDate).map((interval) => ({
    startUtc: interval.startUtc,
    loadKw: 1000,
    gridKw: 1000,
    spinChargeKw: 0,
    spinDischargeKw: 0,
    pulseChargeKw: 0,
    pulseDischargeKw: 0,
    spinSocKwh: 0,
    pulseSocKwh: 500,
    isOnPeak: interval.localHour >= 15 && interval.localHour < 20,
    energyPricePerKwh: interval.localHour >= 15 && interval.localHour < 20 ? 0.08 : 0.05,
    marginalKgCo2PerKwh: 0.6
  }));

const rushWindow = (localDate: string, startHour: number, endHour: number): IRushHourWindow => {
  const day = TimeHelper.localDayIntervals(localDate);

  return {
    startUtc: day[startHour * 4].startUtc,
    endUtc: day[endHour * 4].startUtc,
    startLocalHour: startHour,
    endLocalHour: endHour,
    isAssumption: false
  };
};

const inputFor = (intervals: IPlanInterval[], overrides: Partial<IDispatchOrdersInput> = {}): IDispatchOrdersInput => ({
  date,
  siteName: 'Regional Airport',
  seed: 42,
  scheduleLabel: 'Schedule 8',
  intervals,
  rushHourWindows: [rushWindow(date, 17, 21)],
  isOnPeakBasis: true,
  demandRatePerKw: 16.84,
  wattsmartReserveKwh: 0,
  reserveFloorKwh: 0,
  pulseMinSocKwh: 200,
  pulseMaxSocKwh: 1800,
  spinWearPerKwh: 0.01,
  pulseWearPerKwh: 0.03,
  ...overrides
});

const shapedDay = (): IPlanInterval[] =>
  flatDay(date).map((interval, index) => {
    const isNightCharge = index >= 8 && index < 20;
    const isSpike = index === 64 || index === 72;
    const isPulseShave = index >= 68 && index < 80;

    return {
      ...interval,
      pulseChargeKw: isNightCharge ? 400 : 0,
      pulseDischargeKw: isPulseShave ? 300 : 0,
      spinDischargeKw: isSpike ? 250 : 0,
      gridKw: isNightCharge ? 1400 : isPulseShave ? 700 : interval.gridKw
    };
  });

const actions = (orders: IDispatchOrder[]): string[] => orders.map((order) => order.action);

describe('DispatchOrdersHelper', () => {
  it('merges active steps separated by short gaps into one run', () => {
    const active = [false, true, true, false, false, true, false, false, false, true];

    expect(DispatchOrdersHelper.runs(active, 2)).toEqual([
      { startIndex: 1, endIndex: 5 },
      { startIndex: 9, endIndex: 9 }
    ]);
    expect(DispatchOrdersHelper.runs(active, 0)).toHaveLength(3);
  });

  it('groups a shaped day into charge, cap, discharge and spike blocks in time order', () => {
    const orders = DispatchOrdersHelper.orders(inputFor(shapedDay()));

    expect(actions(orders)).toEqual(['charge', 'cap', 'catch', 'discharge']);
    expect(orders.map((order) => order.number)).toEqual(['01', '02', '03', '04']);

    const [charge, cap, spikes, discharge] = orders;

    expect(charge.timeRange).toBe('02:00–05:00');
    expect(charge.amount).toBe('1,200 kWh');
    expect(charge.asset).toBe('pulse');
    expect(charge.why).toContain('off-peak');
    expect(cap.timeRange).toBe('15:00–20:00');
    expect(cap.amount).toBe('≤ 1,000 kW (load 1,000 kW)');
    expect(spikes.asset).toBe('spin');
    expect(spikes.amount).toBe('2 × up to 250 kW');
    expect(discharge.timeRange).toBe('17:00–20:00');
    expect(discharge.asset).toBe('both');
    expect(discharge.why).toContain('Rush hour');
  });

  it('adds a Wattsmart hold over the rush window only when a reserve is committed', () => {
    const withoutReserve = DispatchOrdersHelper.orders(inputFor(shapedDay()));
    const withReserve = DispatchOrdersHelper.orders(
      inputFor(shapedDay(), { wattsmartReserveKwh: 600, reserveFloorKwh: 800 })
    );
    const hold = withReserve.find((order) => order.action === 'hold');

    expect(withoutReserve.some((order) => order.action === 'hold')).toBe(false);
    expect(hold?.timeRange).toBe('17:00–21:00');
    expect(hold?.amount).toBe('≥ 800 kWh');
    expect(hold?.asset).toBe('pulse');
  });

  it('keeps only the largest two charge windows', () => {
    const intervals = flatDay(date).map((interval, index) => ({
      ...interval,
      pulseChargeKw: [4, 20, 40, 88].includes(index) ? 100 : index >= 24 && index < 28 ? 50 : 0
    }));
    const charges = DispatchOrdersHelper.orders(inputFor(intervals)).filter((order) => order.action === 'charge');

    expect(charges).toHaveLength(2);
    expect(charges.map((order) => order.amount)).toEqual(['25 kWh', '50 kWh']);
  });

  it('writes 92, 96 and 100 CSV rows for spring-forward, normal and fall-back days', () => {
    const rowsFor = (localDate: string): number => {
      const intervals = [...flatDay(localDate), ...flatDay(TimeHelper.addDays(localDate, 1))];
      const csv = DispatchOrdersHelper.csv(DispatchOrdersHelper.sheet(inputFor(intervals, { date: localDate })));
      const lines = csv.trim().split('\n');

      expect(lines[0]).toMatch(/^# SIMULATED/);

      return lines.filter((line) => /^\d{4}-/.test(line)).length;
    };

    expect(rowsFor('2026-03-08')).toBe(92);
    expect(rowsFor(date)).toBe(96);
    expect(rowsFor('2026-11-01')).toBe(100);
  });

  describe('on a real airport solve', () => {
    let highs: Highs;

    beforeAll(async () => {
      highs = await highsLoader();
    });

    it.each([
      ['2026-10-28', 0],
      ['2026-10-28', 1000],
      ['2026-07-15', 0],
      ['2026-07-15', 1000]
    ])('turns %s with a %i kWh reserve into 4 to 7 orders', (planDate: string, reserveKwh: number) => {
      const site = siteArchetypes.AIRPORT;
      const assets = stationAssets['airport'];
      const schedule = tariffSchedules.SCHEDULE_8 as ITariffSchedule;
      const windows = PlanEngineHelper.rushHourWindows([], planDate);
      const request = {
        ...PlanEngineHelper.defaultRequest(site, assets, schedule, planDate),
        wattsmartReserveKwh: reserveKwh
      };
      const result = PlanEngineHelper.solve(
        highs,
        PlanHelper.applyPeakSoFarMode(
          PlanEngineHelper.buildInput(site, assets, schedule, request, placeholderMefSeries, windows),
          'fresh'
        )
      );
      const pulseMinSocKwh = assets.pulse.energyKwh * assets.pulse.minSocFraction;
      const orders = DispatchOrdersHelper.orders(
        inputFor(result.intervals, {
          date: planDate,
          rushHourWindows: windows,
          wattsmartReserveKwh: reserveKwh,
          reserveFloorKwh: pulseMinSocKwh + reserveKwh,
          pulseMinSocKwh
        })
      );

      expect(result.status).toBe('optimal');
      expect(orders.length).toBeGreaterThanOrEqual(4);
      expect(orders.length).toBeLessThanOrEqual(7);
      expect(actions(orders)).toContain('cap');
    });

    it('lists both winter on-peak windows on the demand cap order', () => {
      const site = siteArchetypes.AIRPORT;
      const assets = stationAssets['airport'];
      const schedule = tariffSchedules.SCHEDULE_8 as ITariffSchedule;
      const windows = PlanEngineHelper.rushHourWindows([], date);
      const request = PlanEngineHelper.defaultRequest(site, assets, schedule, date);
      const result = PlanEngineHelper.solve(
        highs,
        PlanHelper.applyPeakSoFarMode(
          PlanEngineHelper.buildInput(site, assets, schedule, request, placeholderMefSeries, windows),
          'fresh'
        )
      );
      const cap = DispatchOrdersHelper.orders(inputFor(result.intervals, { rushHourWindows: windows })).find(
        (order) => order.action === 'cap'
      );

      expect(cap?.timeRange).toBe('06:00–09:00 + 18:00–22:00');
    });
  });
});
