import { IPlanInterval, IRushHourWindow, ISiteArchetype, IStationAssets } from '@app/core/models';
import { TimeHelper } from '@app/core/helpers';
import { SitesHelper } from '@app/core/sites';
import { IPlanViewModel } from './plan.interfaces';
import { PlanHelper } from './plan.helper';
import {
  dispatchCsvSettings,
  dispatchOrderActions,
  dispatchOrderAssets,
  dispatchOrderLabels,
  dispatchOrderSettings
} from './dispatch-orders.constants';
import { IDispatchOrder, IDispatchOrdersInput, IDispatchRun, IDispatchSheet } from './dispatch-orders.interfaces';
import { DispatchOrderAction, DispatchOrderAsset, DispatchOrderDraft } from './dispatch-orders.types';

export class DispatchOrdersHelper {
  private static readonly _actionOrder: DispatchOrderAction[] = [
    dispatchOrderActions.CHARGE,
    dispatchOrderActions.CAP,
    dispatchOrderActions.HOLD,
    dispatchOrderActions.DISCHARGE,
    dispatchOrderActions.CATCH
  ];

  public static fromViewModel(viewModel: IPlanViewModel, revision: number): IDispatchSheet {
    const site = SitesHelper.getArchetype(viewModel.controls.siteId) as ISiteArchetype;
    const assets = SitesHelper.getAssets(viewModel.controls.siteId) as IStationAssets;
    const schedule = PlanHelper.scheduleFor(viewModel.controls.scheduleId);

    return {
      ...DispatchOrdersHelper.sheet({
        date: viewModel.date,
        siteName: PlanHelper.siteShortName(site),
        seed: site.seed,
        scheduleLabel: viewModel.controls.scheduleId === 'schedule-8' ? 'Schedule 8' : 'Schedule 6',
        intervals: viewModel.result.intervals,
        rushHourWindows: viewModel.result.metrics?.rushHourWindows ?? [],
        isOnPeakBasis: schedule.demandBasis === 'on-peak',
        demandRatePerKw: viewModel.result.metrics?.value.demandRatePerKw ?? 0,
        wattsmartReserveKwh: viewModel.result.request.wattsmartReserveKwh,
        reserveFloorKwh: viewModel.reserveFloorKwh,
        pulseMinSocKwh: viewModel.pulseMinSocKwh,
        pulseMaxSocKwh: viewModel.pulseMaxSocKwh,
        spinWearPerKwh: assets.spin.degradationCostPerKwh,
        pulseWearPerKwh: assets.pulse.degradationCostPerKwh
      }),
      dateLabel: viewModel.dateLabel,
      isTargetDay: viewModel.controls.dateMode === 'target',
      revision,
      arrive: viewModel.result.metrics
        ? {
            rushPeakCutKw: viewModel.result.metrics.rushPeakCutKw,
            worthPerMonth: viewModel.result.metrics.value.worthPerMonth,
            wattsmartHeldKwh: viewModel.result.metrics.wattsmartHeldKwh
          }
        : null
    };
  }

  public static sheet(input: IDispatchOrdersInput): IDispatchSheet {
    return {
      input,
      dateLabel: input.date,
      isTargetDay: true,
      revision: 1,
      dayIntervals: DispatchOrdersHelper.dayIntervals(input.intervals, input.date),
      orders: DispatchOrdersHelper.orders(input),
      arrive: null,
      fileName: `${dispatchCsvSettings.FILE_PREFIX}-${input.date}.csv`
    };
  }

  public static dayIntervals(intervals: IPlanInterval[], date: string): IPlanInterval[] {
    return intervals.filter((interval: IPlanInterval) => DispatchOrdersHelper.localDate(interval.startUtc) === date);
  }

  public static orders(input: IDispatchOrdersInput): IDispatchOrder[] {
    const day = DispatchOrdersHelper.dayIntervals(input.intervals, input.date);

    if (day.length === 0) {
      return [];
    }

    const drafts: DispatchOrderDraft[] = [
      ...DispatchOrdersHelper.chargeOrders(input, day),
      ...DispatchOrdersHelper.capOrder(input, day),
      ...DispatchOrdersHelper.holdOrder(input, day),
      ...DispatchOrdersHelper.dischargeOrders(input, day),
      ...DispatchOrdersHelper.catchOrder(input, day)
    ];

    const sorted = drafts.sort(
      (first: DispatchOrderDraft, second: DispatchOrderDraft) =>
        Date.parse(first.startUtc) - Date.parse(second.startUtc) ||
        DispatchOrdersHelper._actionOrder.indexOf(first.action) - DispatchOrdersHelper._actionOrder.indexOf(second.action)
    );

    return DispatchOrdersHelper.mergeToFit(sorted, input.date, dispatchOrderSettings.MAX_ROUTE_ROWS)
      .map((draft: DispatchOrderDraft, index: number) => ({
        ...draft,
        id: `${draft.action}-${draft.startUtc}`,
        number: String(index + 1).padStart(2, '0'),
        actionLabel: DispatchOrdersHelper.actionLabel(draft.action),
        assetLabel: DispatchOrdersHelper.assetLabel(draft.asset),
        timeRange: draft.timeRange ?? DispatchOrdersHelper.range(draft.startUtc, draft.endUtc, input.date)
      }));
  }

  public static runs(active: boolean[], mergeGapSteps: number = dispatchOrderSettings.MERGE_GAP_STEPS): IDispatchRun[] {
    const runs: IDispatchRun[] = [];

    for (let i = 0; i < active.length; i++) {
      if (!active[i]) {
        continue;
      }

      const last = runs[runs.length - 1];

      if (last && i - last.endIndex - 1 <= mergeGapSteps) {
        last.endIndex = i;
      } else {
        runs.push({ startIndex: i, endIndex: i });
      }
    }

    return runs;
  }

  public static mergeToFit(drafts: DispatchOrderDraft[], date: string, maxRows: number): DispatchOrderDraft[] {
    const merged = [...drafts];

    while (merged.length > maxRows) {
      const index = merged.findIndex(
        (draft: DispatchOrderDraft, position: number) =>
          position < merged.length - 1 &&
          draft.action === merged[position + 1].action &&
          draft.energyKwh !== undefined &&
          merged[position + 1].energyKwh !== undefined
      );

      if (index < 0) {
        break;
      }

      merged.splice(index, 2, DispatchOrdersHelper.mergePair(merged[index], merged[index + 1], date));
    }

    return merged;
  }

  public static csv(sheet: IDispatchSheet): string {
    const { input, dayIntervals } = sheet;
    const lines = [
      `# SIMULATED — DETOUR plan for a simulated Torus Station at the ${input.siteName}, ${input.scheduleLabel}, seed ${input.seed}. No device is connected.`,
      `# Planned day ${input.date}, 15-minute rows in America/Denver local time. reserve_floor_kwh applies inside the rush-hour window only.`,
      dispatchCsvSettings.HEADER.join(',')
    ];

    for (const interval of dayIntervals) {
      const isRush = DispatchOrdersHelper.isInRush(interval.startUtc, input.rushHourWindows);
      const socPercent = input.pulseMaxSocKwh > 0 ? (interval.pulseSocKwh / input.pulseMaxSocKwh) * 100 : 0;

      lines.push(
        [
          DispatchOrdersHelper.localStamp(interval.startUtc),
          interval.startUtc,
          DispatchOrdersHelper.fixed(interval.gridKw),
          DispatchOrdersHelper.fixed(interval.spinChargeKw),
          DispatchOrdersHelper.fixed(interval.spinDischargeKw),
          DispatchOrdersHelper.fixed(interval.pulseChargeKw),
          DispatchOrdersHelper.fixed(interval.pulseDischargeKw),
          DispatchOrdersHelper.fixed(interval.pulseSocKwh),
          DispatchOrdersHelper.fixed(socPercent),
          DispatchOrdersHelper.fixed(isRush && input.wattsmartReserveKwh > 0 ? input.reserveFloorKwh : 0),
          interval.isOnPeak ? '1' : '0',
          isRush ? '1' : '0'
        ].join(',')
      );
    }

    return `${lines.join('\n')}\n`;
  }

  private static chargeOrders(input: IDispatchOrdersInput, day: IPlanInterval[]): DispatchOrderDraft[] {
    const runs = DispatchOrdersHelper.runs(
      day.map((interval: IPlanInterval) => interval.spinChargeKw + interval.pulseChargeKw > dispatchOrderSettings.MIN_KW)
    );
    const dayMaxPrice = Math.max(...day.map((interval: IPlanInterval) => interval.energyPricePerKwh));
    const dayAverageCo2 = DispatchOrdersHelper.average(day.map((interval: IPlanInterval) => interval.marginalKgCo2PerKwh));

    return DispatchOrdersHelper.largest(
      runs,
      day,
      (interval: IPlanInterval) => interval.spinChargeKw + interval.pulseChargeKw,
      dispatchOrderSettings.MAX_CHARGE_BLOCKS
    ).map((run: IDispatchRun) => {
      const slice = day.slice(run.startIndex, run.endIndex + 1);
      const spinKwh = DispatchOrdersHelper.energy(slice, (interval: IPlanInterval) => interval.spinChargeKw);
      const pulseKwh = DispatchOrdersHelper.energy(slice, (interval: IPlanInterval) => interval.pulseChargeKw);
      const averagePrice = DispatchOrdersHelper.average(slice.map((interval: IPlanInterval) => interval.energyPricePerKwh));
      const averageCo2 = DispatchOrdersHelper.average(slice.map((interval: IPlanInterval) => interval.marginalKgCo2PerKwh));

      return {
        action: dispatchOrderActions.CHARGE,
        asset: DispatchOrdersHelper.mixedAsset(spinKwh, pulseKwh),
        startUtc: slice[0].startUtc,
        endUtc: DispatchOrdersHelper.endUtc(slice[slice.length - 1]),
        amount: `${DispatchOrdersHelper.number(spinKwh + pulseKwh)} kWh`,
        energyKwh: spinKwh + pulseKwh,
        why: DispatchOrdersHelper.chargeWhy(input, slice, averagePrice, dayMaxPrice, averageCo2, dayAverageCo2)
      };
    });
  }

  private static mergePair(first: DispatchOrderDraft, second: DispatchOrderDraft, date: string): DispatchOrderDraft {
    const energyKwh = (first.energyKwh ?? 0) + (second.energyKwh ?? 0);
    const rangeOf = (draft: DispatchOrderDraft): string => draft.timeRange ?? DispatchOrdersHelper.range(draft.startUtc, draft.endUtc, date);

    return {
      action: first.action,
      asset: first.asset === second.asset ? first.asset : dispatchOrderAssets.BOTH,
      startUtc: first.startUtc,
      endUtc: second.endUtc,
      timeRange: `${rangeOf(first)} + ${rangeOf(second)}`,
      amount: `${DispatchOrdersHelper.number(energyKwh)} kWh`,
      energyKwh,
      why: first.why
    };
  }

  private static chargeWhy(
    input: IDispatchOrdersInput,
    slice: IPlanInterval[],
    averagePrice: number,
    dayMaxPrice: number,
    averageCo2: number,
    dayAverageCo2: number
  ): string {
    const isOffPeak = slice.every((interval: IPlanInterval) => !interval.isOnPeak);

    if (input.isOnPeakBasis && isOffPeak && averagePrice < dayMaxPrice - dispatchOrderSettings.PRICE_TIE_PER_KWH) {
      return `Price trough: off-peak energy at ${DispatchOrdersHelper.cents(averagePrice)} vs ${DispatchOrdersHelper.cents(dayMaxPrice)} on-peak (${input.scheduleLabel} energy line).`;
    }

    if (averageCo2 < dayAverageCo2) {
      return `Cleaner hours: ${DispatchOrdersHelper.number(averageCo2 * 1000 * dispatchOrderSettings.LB_PER_KG)} vs ${DispatchOrdersHelper.number(dayAverageCo2 * 1000 * dispatchOrderSettings.LB_PER_KG)} lb CO2/MWh marginal on the day, at ${DispatchOrdersHelper.cents(averagePrice)}.`;
    }

    return `Refills ahead of the next discharge at ${DispatchOrdersHelper.cents(averagePrice)}; ${input.scheduleLabel} prices these hours the same.`;
  }

  private static capOrder(input: IDispatchOrdersInput, day: IPlanInterval[]): DispatchOrderDraft[] {
    const onPeak = day.filter((interval: IPlanInterval) => interval.isOnPeak);
    const billed = input.isOnPeakBasis && onPeak.length > 0 ? onPeak : day;
    const capKw = Math.max(...billed.map((interval: IPlanInterval) => interval.gridKw));
    const billedRanges = DispatchOrdersHelper.runs(day.map((interval: IPlanInterval) => billed.includes(interval)), 0).map(
      (run: IDispatchRun) => DispatchOrdersHelper.range(day[run.startIndex].startUtc, DispatchOrdersHelper.endUtc(day[run.endIndex]), input.date)
    );
    const loadPeakKw = Math.max(...billed.map((interval: IPlanInterval) => interval.loadKw));
    const rate = `$${input.demandRatePerKw.toFixed(2)}/kW-month`;
    const why = !input.isOnPeakBasis
      ? `${input.scheduleLabel} demand at ${rate} counts any hour: one 15-minute interval above ${DispatchOrdersHelper.number(capKw)} kW resets the month's charge.`
      : onPeak.length > 0
        ? `${input.scheduleLabel} on-peak demand at ${rate}: one 15-minute interval above ${DispatchOrdersHelper.number(capKw)} kW resets the month's charge.`
        : `No on-peak hours on this day; the facilities charge still bills the highest draw in any hour.`;

    return [
      {
        action: dispatchOrderActions.CAP,
        asset: dispatchOrderAssets.BOTH,
        startUtc: billed[0].startUtc,
        endUtc: DispatchOrdersHelper.endUtc(billed[billed.length - 1]),
        timeRange: billedRanges.join(' + '),
        amount: `≤ ${DispatchOrdersHelper.number(capKw)} kW (load ${DispatchOrdersHelper.number(loadPeakKw)} kW)`,
        why
      }
    ];
  }

  private static holdOrder(input: IDispatchOrdersInput, day: IPlanInterval[]): DispatchOrderDraft[] {
    if (input.wattsmartReserveKwh <= 0) {
      return [];
    }

    const inRush = day.filter((interval: IPlanInterval) => DispatchOrdersHelper.isInRush(interval.startUtc, input.rushHourWindows));

    if (inRush.length === 0) {
      return [];
    }

    return [
      {
        action: dispatchOrderActions.HOLD,
        asset: dispatchOrderAssets.PULSE,
        startUtc: inRush[0].startUtc,
        endUtc: DispatchOrdersHelper.endUtc(inRush[inRush.length - 1]),
        amount: `≥ ${DispatchOrdersHelper.number(input.reserveFloorKwh)} kWh`,
        why: `Wattsmart reserve: Pulse keeps ${DispatchOrdersHelper.number(input.wattsmartReserveKwh)} kWh above its ${DispatchOrdersHelper.number(input.pulseMinSocKwh)} kWh floor through rush hour.`
      }
    ];
  }

  private static dischargeOrders(input: IDispatchOrdersInput, day: IPlanInterval[]): DispatchOrderDraft[] {
    const runs = DispatchOrdersHelper.runs(
      day.map((interval: IPlanInterval) => interval.pulseDischargeKw > dispatchOrderSettings.MIN_KW)
    );
    const onPeak = day.filter((interval: IPlanInterval) => interval.isOnPeak);
    const billed = input.isOnPeakBasis && onPeak.length > 0 ? onPeak : day;
    const capKw = Math.max(...billed.map((interval: IPlanInterval) => interval.gridKw), 0);

    return DispatchOrdersHelper.largest(
      runs,
      day,
      (interval: IPlanInterval) => interval.pulseDischargeKw,
      dispatchOrderSettings.MAX_DISCHARGE_BLOCKS
    ).map((run: IDispatchRun) => {
      const slice = day.slice(run.startIndex, run.endIndex + 1);
      const spinKwh = DispatchOrdersHelper.energy(slice, (interval: IPlanInterval) => interval.spinDischargeKw);
      const pulseKwh = DispatchOrdersHelper.energy(slice, (interval: IPlanInterval) => interval.pulseDischargeKw);
      const asset = spinKwh > dispatchOrderSettings.MIN_KW * dispatchOrderSettings.STEP_HOURS ? dispatchOrderAssets.BOTH : dispatchOrderAssets.PULSE;

      return {
        action: dispatchOrderActions.DISCHARGE,
        asset,
        startUtc: slice[0].startUtc,
        endUtc: DispatchOrdersHelper.endUtc(slice[slice.length - 1]),
        amount: `${DispatchOrdersHelper.number(spinKwh + pulseKwh)} kWh`,
        energyKwh: spinKwh + pulseKwh,
        why: DispatchOrdersHelper.dischargeWhy(input, slice, capKw, asset === dispatchOrderAssets.BOTH)
      };
    });
  }

  private static dischargeWhy(input: IDispatchOrdersInput, slice: IPlanInterval[], capKw: number, hasSpin: boolean): string {
    const spinNote = hasSpin ? ' Spin takes the sharp edges.' : '';

    if (slice.some((interval: IPlanInterval) => DispatchOrdersHelper.isInRush(interval.startUtc, input.rushHourWindows))) {
      return `Rush hour, PACE's busiest forecast hours: feeds the site so grid draw stays under ${DispatchOrdersHelper.number(capKw)} kW.${spinNote}`;
    }

    if (slice.some((interval: IPlanInterval) => interval.isOnPeak)) {
      const onPeakPrice = Math.max(...slice.map((interval: IPlanInterval) => interval.energyPricePerKwh));

      return `On-peak: shaves load above the ${DispatchOrdersHelper.number(capKw)} kW cap and avoids ${DispatchOrdersHelper.cents(onPeakPrice)} energy.${spinNote}`;
    }

    return `Keeps grid draw under the ${DispatchOrdersHelper.number(capKw)} kW billed peak.${spinNote}`;
  }

  private static catchOrder(input: IDispatchOrdersInput, day: IPlanInterval[]): DispatchOrderDraft[] {
    const bursts = DispatchOrdersHelper.runs(
      day.map((interval: IPlanInterval) => interval.spinDischargeKw > dispatchOrderSettings.MIN_KW),
      0
    );

    if (bursts.length === 0) {
      return [];
    }

    const first = day[bursts[0].startIndex];
    const last = day[bursts[bursts.length - 1].endIndex];
    const maxKw = Math.max(...day.map((interval: IPlanInterval) => interval.spinDischargeKw));
    const reserveNote = input.wattsmartReserveKwh > 0 ? ', so Pulse can hold its Wattsmart reserve' : '';

    return [
      {
        action: dispatchOrderActions.CATCH,
        asset: dispatchOrderAssets.SPIN,
        startUtc: first.startUtc,
        endUtc: DispatchOrdersHelper.endUtc(last),
        amount: `${bursts.length} × up to ${DispatchOrdersHelper.number(maxKw)} kW`,
        why: `Short spikes go to the flywheel: Spin wear $${input.spinWearPerKwh.toFixed(3)}/kWh vs Pulse $${input.pulseWearPerKwh.toFixed(3)}/kWh${reserveNote}.`
      }
    ];
  }

  private static largest(
    runs: IDispatchRun[],
    day: IPlanInterval[],
    kwOf: (interval: IPlanInterval) => number,
    limit: number
  ): IDispatchRun[] {
    return runs
      .map((run: IDispatchRun) => ({ run, kwh: DispatchOrdersHelper.energy(day.slice(run.startIndex, run.endIndex + 1), kwOf) }))
      .sort((first, second) => second.kwh - first.kwh)
      .slice(0, limit)
      .map((entry) => entry.run)
      .sort((first: IDispatchRun, second: IDispatchRun) => first.startIndex - second.startIndex);
  }

  private static mixedAsset(spinKwh: number, pulseKwh: number): DispatchOrderAsset {
    const total = spinKwh + pulseKwh;
    const spinShare = total > 0 ? spinKwh / total : 0;

    if (spinShare >= 1 - dispatchOrderSettings.MIXED_SHARE_MIN) {
      return dispatchOrderAssets.SPIN;
    }

    if (spinShare <= dispatchOrderSettings.MIXED_SHARE_MIN) {
      return dispatchOrderAssets.PULSE;
    }

    return dispatchOrderAssets.BOTH;
  }

  private static energy(slice: IPlanInterval[], kwOf: (interval: IPlanInterval) => number): number {
    return slice.reduce((total: number, interval: IPlanInterval) => total + kwOf(interval) * dispatchOrderSettings.STEP_HOURS, 0);
  }

  private static average(values: number[]): number {
    return values.length === 0 ? 0 : values.reduce((total: number, value: number) => total + value, 0) / values.length;
  }

  private static isInRush(startUtc: string, windows: IRushHourWindow[]): boolean {
    const instantMs = Date.parse(startUtc);

    return windows.some((window: IRushHourWindow) => instantMs >= Date.parse(window.startUtc) && instantMs < Date.parse(window.endUtc));
  }

  private static endUtc(interval: IPlanInterval): string {
    return new Date(Date.parse(interval.startUtc) + TimeHelper.intervalMinutes * 60000).toISOString();
  }

  private static localDate(startUtc: string): string {
    const parts = TimeHelper.localParts(Date.parse(startUtc));

    return TimeHelper.formatLocalDate(parts.year, parts.month, parts.day);
  }

  private static clock(instantUtc: string, date: string): string {
    const parts = TimeHelper.localParts(Date.parse(instantUtc));
    const isNextDay = TimeHelper.formatLocalDate(parts.year, parts.month, parts.day) > date;
    const hour = isNextDay && parts.hour === 0 && parts.minute === 0 ? 24 : parts.hour;

    return `${String(hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
  }

  private static range(startUtc: string, endUtc: string, date: string): string {
    return `${DispatchOrdersHelper.clock(startUtc, date)}–${DispatchOrdersHelper.clock(endUtc, date)}`;
  }

  private static localStamp(startUtc: string): string {
    const parts = TimeHelper.localParts(Date.parse(startUtc));

    return `${TimeHelper.formatLocalDate(parts.year, parts.month, parts.day)} ${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')}`;
  }

  private static actionLabel(action: DispatchOrderAction): string {
    switch (action) {
      case dispatchOrderActions.CHARGE:
        return dispatchOrderLabels.ACTION_CHARGE;
      case dispatchOrderActions.HOLD:
        return dispatchOrderLabels.ACTION_HOLD;
      case dispatchOrderActions.CAP:
        return dispatchOrderLabels.ACTION_CAP;
      case dispatchOrderActions.DISCHARGE:
        return dispatchOrderLabels.ACTION_DISCHARGE;
      default:
        return dispatchOrderLabels.ACTION_CATCH;
    }
  }

  private static assetLabel(asset: DispatchOrderAsset): string {
    switch (asset) {
      case dispatchOrderAssets.SPIN:
        return dispatchOrderLabels.ASSET_SPIN;
      case dispatchOrderAssets.PULSE:
        return dispatchOrderLabels.ASSET_PULSE;
      default:
        return dispatchOrderLabels.ASSET_BOTH;
    }
  }

  private static number(value: number): string {
    return Math.round(value).toLocaleString('en-US');
  }

  private static cents(pricePerKwh: number): string {
    return `${(pricePerKwh * 100).toFixed(1)}¢/kWh`;
  }

  private static fixed(value: number): string {
    return (Math.round(value * 100) / 100).toFixed(2);
  }
}
