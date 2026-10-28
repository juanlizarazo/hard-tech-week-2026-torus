import { IBacktestYear } from '@app/core/backtest';
import { IMarginalEmissionsSeries, IPlanInterval, IRushHourWindow, ISiteArchetype, IStationAssets } from '@app/core/models';
import { PlanEngineHelper, placeholderMefSeries } from '@app/core/plan';
import { SitesHelper } from '@app/core/sites';
import { TariffHelper } from '@app/core/tariff';
import { TimeLabelHelper } from '@app/shared/helpers/time-label.helper';
import { IPlanningDay } from '@app/shared/helpers/day-relation.interfaces';
import { PlanHelper } from '../plan/plan.helper';
import { startSettings, startTileSpecs } from './start.constants';
import { IStartPreview, IStartTile } from './start.interfaces';

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

  public static countUp(label: string, progress: number): string {
    const match = /^([^0-9]*)([0-9]+(?:\.[0-9]+)?)(.*)$/.exec(label);

    if (!match) {
      return label;
    }

    const decimals = match[2].includes('.') ? match[2].split('.')[1].length : 0;

    return `${match[1]}${(Number(match[2]) * Math.min(Math.max(progress, 0), 1)).toFixed(decimals)}${match[3]}`;
  }

  public static hookSentence(roundedKwh: number): string {
    return `Cutting one kW off the peak saves as much as moving about ${roundedKwh.toLocaleString('en-US')} kWh to cheaper hours. So DETOUR goes after the peak.`;
  }

  public static hookLines(roundedKwh: number): string[] {
    return [
      StartHelper.hookSentence(roundedKwh),
      'Your bill is set by one 15-minute spike, not your average day. Flatten that spike and the whole month costs less.',
      'A flywheel takes the sharp spikes and a battery holds the long blocks. DETOUR plans both a day ahead.',
      'Moving energy to a cheaper hour saves cents. Shaving the peak saves dollars. That is the detour.'
    ];
  }

  public static forecastTile(preview: IStartPreview | null, day: IPlanningDay): IStartTile {
    const base = { ...startTileSpecs[0], unit: `rush hour ${day.word}` };

    if (!preview) {
      return { ...base, figure: '—', caption: 'Reading the PACE forecast…', isMuted: true };
    }

    return {
      ...base,
      figure: preview.rushLabel,
      caption: preview.rushIsAssumption ? 'Assumed block: PACE has not posted the forecast yet' : "The four busiest hours in PACE's day-ahead forecast",
      isMuted: false
    };
  }

  public static decideTile(day: IPlanningDay): IStartTile {
    const rates = PlanHelper.hookNumbers(day.targetDate ? PlanHelper.seasonOf(day.targetDate) : 'summer');

    return {
      ...startTileSpecs[1],
      figure: rates.demandRateLabel,
      unit: day.targetDate ? `per kW ${day.word}` : 'per kW of summer peak',
      caption: 'Simulated airport, Schedule 8',
      isMuted: false
    };
  }

  public static proveTile(year: IBacktestYear | null): IStartTile {
    const base = { ...startTileSpecs[2], unit: 'saved so far this year', isRecord: true };
    const rows = (year?.rows ?? []).filter((row) => row.siteId === startSettings.PROVE_SITE_ID && row.scheduleId === startSettings.PROVE_SCHEDULE_ID);

    if (rows.length === 0) {
      return { ...base, figure: '—', caption: 'The year summary is not available yet', isMuted: true };
    }

    const saved = rows.reduce((sum, row) => sum + row.savedUsd, 0);
    const ceiling = rows.reduce((sum, row) => sum + (row.captureRate !== null && row.captureRate > 0 ? row.savedUsd / row.captureRate : row.savedUsd), 0);
    const capture = ceiling > 0 ? Math.round((saved / ceiling) * 100) : 0;

    return {
      ...base,
      figure: `$${Math.round(saved).toLocaleString('en-US')}`,
      caption: `${capture}% of perfect hindsight, ${rows.length} months replayed`,
      isMuted: false
    };
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
