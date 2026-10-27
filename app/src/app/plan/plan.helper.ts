import {
  IBillBreakdown,
  IBillLine,
  IMarginalEmissionsSeries,
  IPlanInterval,
  IPlanRequest,
  IPlanResult,
  ISiteArchetype,
  IStationAssets,
  ITariffSchedule,
  TariffScheduleId
} from '@app/core/models';
import { SiteGeneratorHelper, SitesHelper } from '@app/core/sites';
import { TariffHelper, tariffSchedules } from '@app/core/tariff';
import { TimeHelper } from '@app/core/helpers';
import { ILpInput, PlanEngineHelper, placeholderMefSeries } from '@app/core/plan';
import {
  IAssetRow,
  IBillLineDelta,
  IPlanControls,
  IPlanDateContext,
  IPlanHook,
  IPlanSiteCard,
  IPlanTile,
  IPlanViewModel
} from './plan.interfaces';
import { planBaseline, planDefaults } from './plan.constants';
import { PeakSoFarMode } from './plan.types';

export class PlanHelper {
  public static buildSiteCards(): IPlanSiteCard[] {
    return SitesHelper.listArchetypes().map((archetype: ISiteArchetype) =>
      PlanHelper.buildSiteCard(archetype)
    );
  }

  private static buildSiteCard(archetype: ISiteArchetype): IPlanSiteCard {
    const schedule =
      archetype.scheduleId === 'schedule-8' ? tariffSchedules.SCHEDULE_8 : tariffSchedules.SCHEDULE_6;
    const julyLoad = SiteGeneratorHelper.generateMonth(archetype, planBaseline.MONTH);
    const julyIntervals = TimeHelper.localMonthIntervals(planBaseline.MONTH);
    const assets = SitesHelper.getAssets(archetype.id) as IStationAssets;

    return {
      archetype,
      scheduleName: schedule.name,
      julyStats: SiteGeneratorHelper.loadStats(julyLoad),
      julyBill: TariffHelper.monthlyBill(
        schedule,
        julyIntervals,
        julyLoad.map((interval) => interval.kw)
      ),
      spinRows: PlanHelper.spinRows(assets),
      pulseRows: PlanHelper.pulseRows(assets)
    };
  }

  public static scheduleFor(scheduleId: TariffScheduleId): ITariffSchedule {
    return scheduleId === 'schedule-8' ? tariffSchedules.SCHEDULE_8 : tariffSchedules.SCHEDULE_6;
  }

  public static buildHook(): IPlanHook {
    const summer = tariffSchedules.SCHEDULE_8.seasons.summer;
    const spread = summer.energyOnPeakPerKwh - summer.energyOffPeakPerKwh;
    const equivalentKwh = Math.round(summer.demandRatePerKw / spread);

    return {
      title: `$${summer.demandRatePerKw.toFixed(2)} vs ${(spread * 100).toFixed(1)}¢: one kW of summer on-peak demand costs as much as shifting ~${equivalentKwh} kWh`,
      subtitle:
        'Three clocks disagree on when to act: the bill (on-peak demand), the price (PACE EDAM) and the carbon (marginal CO2). The LP plans the Torus Station against all three, live.'
    };
  }

  public static defaultControls(): IPlanControls {
    const site = SitesHelper.getArchetype(planDefaults.SITE_ID) as ISiteArchetype;

    return {
      siteId: site.id,
      dateMode: planDefaults.DATE_MODE,
      scheduleId: site.scheduleId,
      peakSoFarMode: planDefaults.PEAK_SO_FAR_MODE,
      co2WeightPerKg: planDefaults.CO2_WEIGHT_PER_KG,
      wattsmartReserveKwh: planDefaults.WATTSMART_RESERVE_KWH
    };
  }

  public static maxReserveKwh(assets: IStationAssets): number {
    const pulseUsableKwh = assets.pulse.energyKwh * (assets.pulse.maxSocFraction - assets.pulse.minSocFraction);

    return Math.floor((pulseUsableKwh + assets.spin.energyKwh) / planDefaults.RESERVE_STEP_KWH) * planDefaults.RESERVE_STEP_KWH;
  }

  public static julyPeakDate(gridMonth: Detour.Firestore.Snapshot.IGridMonth | null): string {
    const dailyPeakMw = new Map<string, number>();

    for (const hour of gridMonth?.hours ?? []) {
      const localDate = hour.localHourStart.slice(0, 10);
      const [year, month, day] = localDate.split('-').map(Number);
      const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

      if (hour.demandMw === null || weekday === 0 || weekday === 6 || TimeHelper.isUtahTariffHoliday(localDate)) {
        continue;
      }

      dailyPeakMw.set(localDate, Math.max(dailyPeakMw.get(localDate) ?? 0, hour.demandMw));
    }

    let peakDate = planDefaults.JULY_PEAK_FALLBACK_DATE as string;
    let peakMw = 0;

    for (const [localDate, demandMw] of dailyPeakMw) {
      if (demandMw > peakMw) {
        peakDate = localDate;
        peakMw = demandMw;
      }
    }

    return peakDate;
  }

  public static monthsFor(date: string): string[] {
    return [...new Set([date.slice(0, 7), TimeHelper.addDays(date, 1).slice(0, 7)])];
  }

  public static buildRequest(
    controls: IPlanControls,
    date: string,
    site: ISiteArchetype,
    assets: IStationAssets
  ): IPlanRequest {
    return {
      ...PlanEngineHelper.defaultRequest(site, assets, PlanHelper.scheduleFor(controls.scheduleId), date),
      co2WeightPerKg: controls.co2WeightPerKg,
      wattsmartReserveKwh: Math.min(controls.wattsmartReserveKwh, PlanHelper.maxReserveKwh(assets))
    };
  }

  public static mefOrPlaceholder(series: IMarginalEmissionsSeries | undefined): IMarginalEmissionsSeries {
    return series && series.points.length > 0 ? series : placeholderMefSeries;
  }

  public static applyPeakSoFarMode(input: ILpInput, peakSoFarMode: PeakSoFarMode): ILpInput {
    if (peakSoFarMode === 'month-to-date') {
      return input;
    }

    return {
      ...input,
      request: { ...input.request, peakSoFarOnPeakKw: 0, peakSoFarAllHoursKw: 0 },
      monthToDateIntervals: [],
      monthToDateLoadKw: []
    };
  }

  public static edamSeries(
    intervals: IPlanInterval[],
    priceHours: Detour.Firestore.Snapshot.IPriceHour[]
  ): (number | null)[] {
    const priceByUtcHour = new Map<number, number | null>();

    for (const hour of priceHours) {
      priceByUtcHour.set(Math.floor(Date.parse(`${hour.utcStart.slice(0, 13)}:00:00Z`) / 3600000), hour.lmp);
    }

    return intervals.map(
      (interval: IPlanInterval) => priceByUtcHour.get(Math.floor(Date.parse(interval.startUtc) / 3600000)) ?? null
    );
  }

  public static buildViewModel(
    controls: IPlanControls,
    context: IPlanDateContext,
    result: IPlanResult,
    assets: IStationAssets,
    mef: IMarginalEmissionsSeries
  ): IPlanViewModel {
    const mefIsPlaceholder = mef === placeholderMefSeries;

    const schedule = PlanHelper.scheduleFor(controls.scheduleId);
    const rates = TariffHelper.seasonRatesFor(schedule, context.date);
    const pulseMinSocKwh = assets.pulse.energyKwh * assets.pulse.minSocFraction;
    const isOnPeakBasis = schedule.demandBasis === 'on-peak';

    return {
      controls,
      date: context.date,
      dateLabel: PlanHelper.dateLabel(context.date),
      result,
      tiles: PlanHelper.buildTiles(controls, context, result, mefIsPlaceholder),
      billLines: PlanHelper.billLineDeltas(result.baselineBill, result.plannedBill),
      edamPricePerMwh: PlanHelper.edamSeries(result.intervals, context.priceHours),
      demandLabel: `${isOnPeakBasis ? 'On-peak demand' : 'Demand (all hours)'} ${PlanHelper.formatNumber(result.demandKw)} kW`,
      billCaption: isOnPeakBasis
        ? `$${rates.demandRatePerKw.toFixed(2)}/kW, ${(rates.energyOnPeakPerKwh * 100).toFixed(1)}¢ vs ${(rates.energyOffPeakPerKwh * 100).toFixed(1)}¢/kWh`
        : `$${rates.demandRatePerKw.toFixed(2)}/kW any hour, ${(rates.energyOffPeakPerKwh * 100).toFixed(1)}¢/kWh flat`,
      carbonCaption: mefIsPlaceholder ? 'Marginal CO2, lb/MWh (placeholder)' : 'Marginal CO2, lb/MWh (EIA-930 regression)',
      mefIsPlaceholder,
      pulseMinSocKwh,
      pulseMaxSocKwh: assets.pulse.energyKwh * assets.pulse.maxSocFraction,
      spinMaxSocKwh: assets.spin.energyKwh,
      reserveFloorKwh: result.request.wattsmartReserveKwh > 0 ? pulseMinSocKwh + result.request.wattsmartReserveKwh : 0,
      maxReserveKwh: PlanHelper.maxReserveKwh(assets),
      solveLabel: result.status === 'optimal' ? `Solved in ${Math.round(result.solveMs)} ms` : 'No feasible plan'
    };
  }

  private static row(assets: IStationAssets, field: string, label: string, value: string): IAssetRow {
    const source = assets.sources[field];

    return {
      label,
      value,
      kind: source ? source.kind : 'assumption',
      note: source ? (source.note ?? source.label) : ''
    };
  }

  public static spinRows(assets: IStationAssets): IAssetRow[] {
    const spin = assets.spin;

    return [
      PlanHelper.row(assets, 'spin.powerKw', 'Power', `${spin.powerKw.toLocaleString()} kW`),
      PlanHelper.row(assets, 'spin.energyKwh', 'Energy', `${spin.energyKwh.toLocaleString()} kWh`),
      PlanHelper.row(
        assets,
        'spin.roundTripEfficiency',
        'Round trip',
        `${Math.round(spin.roundTripEfficiency * 100)}%`
      ),
      PlanHelper.row(assets, 'spin.cycleLife', 'Cycle life', spin.cycleLife.toLocaleString())
    ];
  }

  public static pulseRows(assets: IStationAssets): IAssetRow[] {
    const pulse = assets.pulse;

    return [
      PlanHelper.row(assets, 'pulse.powerKw', 'Power', `${pulse.powerKw.toLocaleString()} kW`),
      PlanHelper.row(assets, 'pulse.energyKwh', 'Energy', `${pulse.energyKwh.toLocaleString()} kWh`),
      PlanHelper.row(
        assets,
        'pulse.dischargeEfficiency',
        'Discharge eff.',
        `${Math.round(pulse.dischargeEfficiency * 100)}%`
      ),
      PlanHelper.row(
        assets,
        'pulse.rampLimitKwPerStep',
        'Ramp limit',
        `${pulse.rampLimitKwPerStep.toLocaleString()} kW per 15 min`
      ),
      PlanHelper.row(assets, 'pulse.cycleLife', 'Cycle life', pulse.cycleLife.toLocaleString())
    ];
  }

  private static buildTiles(
    controls: IPlanControls,
    context: IPlanDateContext,
    result: IPlanResult,
    mefIsPlaceholder: boolean
  ): IPlanTile[] {
    const metrics = result.metrics;
    const billChange = result.plannedBill.total - result.baselineBill.total;
    const demandChange = PlanHelper.lineChange(result, 'demand') + PlanHelper.lineChange(result, 'facilities');
    const demandShare = billChange < 0 ? Math.round((demandChange / billChange) * 100) : 0;
    const co2ChangeKg = metrics ? metrics.plannedCo2Kg - metrics.baselineCo2Kg : 0;
    const window = context.rushHourWindows[0];
    const windowLabel = window
      ? `${PlanHelper.hourLabel(window.startLocalHour)}–${PlanHelper.hourLabel(window.endLocalHour)}`
      : '';

    return [
      {
        id: 'bill',
        label:
          controls.peakSoFarMode === 'fresh'
            ? 'Bill change, 48 h as the month'
            : 'Bill change, month to date + 48 h',
        value: PlanHelper.formatMoneyChange(billChange),
        detail: billChange < 0 ? `${demandShare}% from demand and facilities charges` : 'No saving at these settings',
        source: `${PlanHelper.scheduleFor(controls.scheduleId).provenance.label}, base rates, riders excluded`,
        tone: billChange < -0.5 ? 'good' : billChange > 0.5 ? 'bad' : 'neutral'
      },
      {
        id: 'co2',
        label: 'Marginal CO2 change, 48 h',
        value: `${PlanHelper.signOf(co2ChangeKg)}${PlanHelper.formatNumber(Math.abs(co2ChangeKg))} kg`,
        detail: `CO2 weight $${controls.co2WeightPerKg.toFixed(2)}/kg in the objective`,
        source: mefIsPlaceholder
          ? 'PLACEHOLDER marginal CO2 by hour (regression unavailable)'
          : 'Siler-Evans marginal CO2 by hour × season, Δ fossil generation on EIA-930 PACE',
        tone: co2ChangeKg < -0.5 ? 'good' : co2ChangeKg > 0.5 ? 'bad' : 'neutral'
      },
      {
        id: 'traffic',
        label: 'Traffic avoided',
        value: `${PlanHelper.formatNumber(metrics?.trafficAvoidedKwh ?? 0)} kWh`,
        detail: `Grid draw moved out of PACE's rush hour (${windowLabel} local, both days)`,
        source:
          window && !window.isAssumption
            ? "Busiest 4 h of PACE's day-ahead forecast (EIA-930 / CAISO OASIS)"
            : 'Assumed 4–8 p.m. window (no PACE forecast for this day)',
        tone: (metrics?.trafficAvoidedKwh ?? 0) > 0.5 ? 'good' : 'neutral'
      },
      {
        id: 'wattsmart',
        label: 'Held for Wattsmart',
        value: `${PlanHelper.formatNumber(metrics?.wattsmartHeldKwh ?? 0)} kWh`,
        detail:
          controls.wattsmartReserveKwh > 0
            ? 'Pulse + Spin energy above the floor, every rush-hour interval'
            : 'Minimum energy left in the station during rush hour (no reserve set)',
        source: 'Wattsmart reserve constraint in the LP',
        tone: 'neutral'
      }
    ];
  }

  private static lineChange(result: IPlanResult, lineId: string): number {
    const amountOf = (bill: IBillBreakdown): number =>
      bill.lines.find((line: IBillLine) => line.id === lineId)?.amount ?? 0;

    return amountOf(result.plannedBill) - amountOf(result.baselineBill);
  }

  private static billLineDeltas(baseline: IBillBreakdown, planned: IBillBreakdown): IBillLineDelta[] {
    return baseline.lines.map((line: IBillLine) => {
      const plannedAmount = planned.lines.find((candidate: IBillLine) => candidate.id === line.id)?.amount ?? 0;

      return {
        id: line.id,
        label: line.label,
        baseline: line.amount,
        planned: plannedAmount,
        change: Math.round((plannedAmount - line.amount) * 100) / 100
      };
    });
  }

  private static dateLabel(date: string): string {
    const [year, month, day] = date.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
      timeZone: 'UTC',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  private static hourLabel(hour: number): string {
    const normalized = ((hour % 24) + 24) % 24;
    const suffix = normalized < 12 ? 'a.m.' : 'p.m.';
    const displayHour = normalized % 12 === 0 ? 12 : normalized % 12;

    return `${displayHour} ${suffix}`;
  }

  private static formatNumber(value: number): string {
    return Math.round(value).toLocaleString('en-US');
  }

  private static formatMoneyChange(value: number): string {
    return `${PlanHelper.signOf(value)}$${Math.abs(Math.round(value)).toLocaleString('en-US')}`;
  }

  private static signOf(value: number): string {
    const rounded = Math.round(value);

    return rounded < 0 ? '−' : rounded > 0 ? '+' : '';
  }
}
