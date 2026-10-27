import { IMarginalEmissionsSeries, IPlanInterval, IRushHourWindow, ISiteArchetype, IStationAssets } from '@app/core/models';
import { PlanEngineHelper, placeholderMefSeries } from '@app/core/plan';
import { SitesHelper } from '@app/core/sites';
import { TariffHelper } from '@app/core/tariff';
import { TimeLabelHelper } from '@app/shared/helpers/time-label.helper';
import { IPlanningDay } from '@app/shared/helpers/day-relation.interfaces';
import { PlanHelper } from '../plan/plan.helper';
import { startSettings } from './start.constants';
import { IStartPreview } from './start.interfaces';

export class StartHelper {
  public static preview(
    targetDate: string,
    gridHours: Detour.Firestore.Snapshot.IGridHour[],
    priceHours: Detour.Firestore.Snapshot.IPriceHour[],
    fossilSeries: IMarginalEmissionsSeries | undefined
  ): IStartPreview {
    const site = SitesHelper.getArchetype(startSettings.SITE_ID) as ISiteArchetype;
    const assets = SitesHelper.getAssets(startSettings.SITE_ID) as IStationAssets;
    const schedule = PlanHelper.scheduleFor(site.scheduleId);
    const mef = PlanHelper.mefOrPlaceholder(fossilSeries);
    const rushHourWindows = PlanEngineHelper.rushHourWindows(gridHours, targetDate);
    const request = PlanEngineHelper.defaultRequest(site, assets, schedule, targetDate);
    const input = PlanEngineHelper.buildInput(site, assets, schedule, request, mef, rushHourWindows);
    const intervals: IPlanInterval[] = input.intervals.slice(0, startSettings.INTERVALS_PER_DAY).map((interval, index) => ({
      startUtc: interval.startUtc,
      loadKw: input.loadKw[index],
      gridKw: input.loadKw[index],
      spinChargeKw: 0,
      spinDischargeKw: 0,
      pulseChargeKw: 0,
      pulseDischargeKw: 0,
      spinSocKwh: 0,
      pulseSocKwh: 0,
      isOnPeak: input.onPeakMask[index],
      energyPricePerKwh: input.energyPricePerKwh[index],
      marginalKgCo2PerKwh: input.marginalKgCo2PerKwh[index]
    }));
    const tomorrowWindow: IRushHourWindow = rushHourWindows[0];
    const rates = TariffHelper.seasonRatesFor(schedule, targetDate);

    return {
      targetDate,
      dateLabel: StartHelper.dateLabel(targetDate),
      intervals,
      edamPricePerMwh: PlanHelper.edamSeries(intervals, priceHours),
      rushHourWindows: [tomorrowWindow],
      rushLabel: TimeLabelHelper.window(tomorrowWindow.startLocalHour, tomorrowWindow.endLocalHour),
      rushIsAssumption: tomorrowWindow.isAssumption,
      billCaption: `$${rates.demandRatePerKw.toFixed(2)} per kW of peak, ${(rates.energyOnPeakPerKwh * 100).toFixed(1)}¢ vs ${(rates.energyOffPeakPerKwh * 100).toFixed(1)}¢ per kWh`,
      carbonCaption: mef === placeholderMefSeries ? 'Extra CO2 per MWh (placeholder), darker is dirtier' : 'Extra CO2 from one more MWh, darker is dirtier',
      mefIsPlaceholder: mef === placeholderMefSeries
    };
  }

  public static seasonBridge(day: IPlanningDay): string {
    if (!day.targetDate) {
      return '';
    }

    const season = PlanHelper.seasonOf(day.targetDate);
    const rates = PlanHelper.hookNumbers(season);
    const [year, month] = day.targetDate.split('-').map(Number);
    const monthName = new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long' });

    return `${day.name} is ${monthName}, so ${season} rates apply: ${rates.demandRateLabel} per kW.`;
  }

  public static dateLabel(localDate: string): string {
    const [year, month, day] = localDate.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
      timeZone: 'UTC',
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
  }
}
