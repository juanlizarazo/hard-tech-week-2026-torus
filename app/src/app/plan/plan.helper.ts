import {
  IMarginalEmissionsSeries,
  IPlanInterval,
  IPlanRequest,
  IPlanMetrics,
  IPlanResult,
  IPlanValue,
  IRushHourWindow,
  ISiteArchetype,
  IStationAssets,
  ITariffSchedule,
  TariffScheduleId,
  TariffSeason
} from '@app/core/models';
import { SiteGeneratorHelper, SitesHelper } from '@app/core/sites';
import { TariffHelper, tariffSchedules } from '@app/core/tariff';
import { TimeHelper } from '@app/core/helpers';
import { backtestSettings } from '@app/core/backtest';
import { ILpInput, PlanEngineHelper, placeholderMefSeries } from '@app/core/plan';
import { TimeLabelHelper } from '@app/shared/helpers/time-label.helper';
import {
  IAssetRow,
  IBillLineDelta,
  IPlanControls,
  IPlanDateContext,
  IPlanForecastPeak,
  IPlanHook,
  IPlanHookNumbers,
  IPlanNotices,
  IPlanSiteCard,
  IPlanTile,
  IPlanViewModel
} from './plan.interfaces';
import { planBaseline, planDefaults, planFleetSettings } from './plan.constants';
import { PeakSoFarMode, PlanDateMode } from './plan.types';

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

  public static hookNumbers(season: TariffSeason = 'summer'): IPlanHookNumbers {
    const rates = tariffSchedules.SCHEDULE_8.seasons[season];
    const spread = rates.energyOnPeakPerKwh - rates.energyOffPeakPerKwh;
    const equivalentKwh = Math.round(rates.demandRatePerKw / spread);

    return {
      season,
      demandRateLabel: `$${rates.demandRatePerKw.toFixed(2)}`,
      spreadLabel: `${(spread * 100).toFixed(1)}¢`,
      equivalentKwh,
      roundedKwh: Math.round(equivalentKwh / 50) * 50
    };
  }

  public static seasonOf(date: string): TariffSeason {
    return TariffHelper.seasonOf(tariffSchedules.SCHEDULE_8, Number(date.slice(5, 7)));
  }

  public static buildHook(date: string): IPlanHook {
    const numbers = PlanHelper.hookNumbers(PlanHelper.seasonOf(date));

    return {
      title: `${numbers.demandRateLabel} vs ${numbers.spreadLabel}`,
      subtitle: `On Schedule 8 in ${PlanHelper.monthName(date)}, one kW of on-peak demand costs ${numbers.demandRateLabel} a month, and moving one kWh to a cheaper hour saves ${numbers.spreadLabel}: about ${PlanHelper.formatNumber(numbers.roundedKwh)} kWh of shifting per kW. The money is in the peak.`
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
      wattsmartReserveKwh: PlanHelper.defaultReserveKwh(SitesHelper.getAssets(site.id) as IStationAssets),
      gridReliefPerKw: planDefaults.GRID_RELIEF_PER_KW
    };
  }

  public static defaultReserveKwh(assets: IStationAssets): number {
    const reserveKwh = assets.pulse.energyKwh * backtestSettings.WATTSMART_RESERVE_FRACTION;

    return Math.round(reserveKwh / planDefaults.RESERVE_STEP_KWH) * planDefaults.RESERVE_STEP_KWH;
  }

  public static maxReserveKwh(assets: IStationAssets): number {
    const pulseUsableKwh = assets.pulse.energyKwh * (assets.pulse.maxSocFraction - assets.pulse.minSocFraction);

    return Math.floor(pulseUsableKwh / planDefaults.RESERVE_STEP_KWH) * planDefaults.RESERVE_STEP_KWH;
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
      wattsmartReserveKwh: Math.min(controls.wattsmartReserveKwh, PlanHelper.maxReserveKwh(assets)),
      gridReliefPerKw: controls.gridReliefPerKw
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

  public static siteShortName(site: ISiteArchetype): string {
    return site.name.replace(/^Simulated\s+/, '').replace(/\s*\(.*\)$/, '');
  }

  public static dialsSummary(controls: IPlanControls): string {
    const site = SitesHelper.getArchetype(controls.siteId) as ISiteArchetype;
    const schedule = controls.scheduleId === 'schedule-8' ? 'Schedule 8' : 'Schedule 6';

    return `${PlanHelper.siteShortName(site)}, ${schedule}, CO2 $${controls.co2WeightPerKg.toFixed(2)}/kg, reserve ${PlanHelper.formatNumber(controls.wattsmartReserveKwh)} kWh`;
  }

  public static answer(controls: IPlanControls, result: IPlanResult, date: string, assets: IStationAssets): string {
    const site = SitesHelper.getArchetype(controls.siteId) as ISiteArchetype;
    const siteName = PlanHelper.siteShortName(site).toLowerCase();
    const movedKwh = result.metrics?.trafficAvoidedKwh ?? 0;
    const cutKw = result.metrics?.rushPeakCutKw ?? 0;
    const window = result.metrics?.rushHourWindows[0];
    const windowLabel = window ? TimeLabelHelper.window(window.startLocalHour, window.endLocalHour) : 'rush hour';

    if (result.status !== 'optimal' || !result.metrics) {
      return `No plan fits these settings for the ${siteName}. Lower the Wattsmart reserve and it will solve again.`;
    }

    const relief = cutKw > 0.5
      ? `takes ${PlanHelper.formatNumber(cutKw)} kW off PACE's rush hour (${windowLabel})`
      : movedKwh > 0.5
        ? `moves ${PlanHelper.formatNumber(movedKwh)} kWh out of PACE's rush hour (${windowLabel})`
        : `keeps its grid draw where it is in PACE's rush hour (${windowLabel})`;

    return [
      `Plan for the ${siteName}: ${relief}.`,
      PlanHelper.peakSentence(controls, result.metrics.value, date),
      PlanHelper.flywheelSentence(result, assets),
      PlanHelper.co2Sentence(controls, result)
    ]
      .filter(Boolean)
      .join(' ');
  }

  public static peakSentence(controls: IPlanControls, value: IPlanValue, date: string): string {
    if (value.peakCutKw < 0.5) {
      return controls.peakSoFarMode === 'fresh'
        ? 'The billed peak does not fall at these settings.'
        : `${PlanHelper.monthName(date)} already set a higher peak, so cutting this one saves nothing.`;
    }

    const condition = controls.peakSoFarMode === 'fresh'
      ? "if the planned day sets the month's peak"
      : `above the peak ${PlanHelper.monthName(date)} already set`;

    return `It cuts the billed peak by ${PlanHelper.formatNumber(value.peakCutKw)} kW, worth ${PlanHelper.formatMoney(value.worthPerMonth)}/month on the demand and facilities charges ${condition}.`;
  }

  public static flywheelSentence(result: IPlanResult, assets: IStationAssets): string {
    const metrics = result.metrics;

    if (!metrics || metrics.spinBurstCount === 0) {
      return '';
    }

    const spinWear = assets.spin.degradationCostPerKwh;
    const pulseWear = assets.pulse.degradationCostPerKwh;
    const ratio = Math.round(pulseWear / spinWear);
    const share = ratio === 3 ? 'about a third' : ratio === 2 ? 'about half' : `about 1/${ratio}`;
    const spikes = `${metrics.spinBurstCount} short spike${metrics.spinBurstCount === 1 ? '' : 's'}`;
    const wear = `${share} of Pulse's wear ($${spinWear.toFixed(3)} vs $${pulseWear.toFixed(3)} per kWh)`;

    if (metrics.wattsmartHeldKwh > 0.5) {
      return `Spin catches ${spikes} at ${wear}, which leaves Pulse free to keep ${PlanHelper.formatNumber(metrics.wattsmartHeldKwh)} kWh for Wattsmart.`;
    }

    return `Spin catches ${spikes} at ${wear}.`;
  }

  public static energyDetail(energyChange: number, peakCutKw: number, isOnPeakBasis: boolean): string {
    if (energyChange > 0.5) {
      return peakCutKw > 0.5
        ? 'Charging losses cost a little energy; the peak charges pay for it'
        : 'Charging losses cost a little energy at these settings';
    }

    if (energyChange < -0.5) {
      return isOnPeakBasis ? 'Energy bought off-peak instead of on-peak' : 'Energy bought in cheaper hours';
    }

    return 'Energy cost is about the same';
  }

  public static dayPhrase(dateMode: PlanDateMode | null, planningDayWord: string, dateLabel: string): string {
    return planningDayWord;
  }

  private static co2Sentence(controls: IPlanControls, result: IPlanResult): string {
    const metrics = result.metrics;
    const co2ChangeKg = metrics ? metrics.plannedCo2Kg - metrics.baselineCo2Kg : 0;
    const co2Kg = PlanHelper.formatNumber(Math.abs(co2ChangeKg));
    const weight = `$${controls.co2WeightPerKg.toFixed(2)}/kg`;

    if (co2ChangeKg < -0.5) {
      return `CO2 falls too, by ${co2Kg} kg over the 48 hours.`;
    }

    if (co2ChangeKg <= 0.5) {
      return 'CO2 stays about the same.';
    }

    if (controls.co2WeightPerKg <= 0) {
      return `At $0/kg the plan ignores carbon and adds ${co2Kg} kg CO2; raise the CO2 weight to charge in cleaner hours.`;
    }

    return `At ${weight} the bill outweighs carbon: charging losses add ${co2Kg} kg CO2 over the 48 hours.`;
  }

  private static monthName(date: string): string {
    const [year, month] = date.split('-').map(Number);

    return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'long' });
  }

  public static notices(controls: IPlanControls, result: IPlanResult, demandLabel: string): IPlanNotices {
    const window = result.metrics?.rushHourWindows[0];
    const windowLabel = window ? TimeLabelHelper.window(window.startLocalHour, window.endLocalHour) : 'rush hour';
    const isOnPeakBasis = controls.scheduleId === 'schedule-8';
    const spinKwh = result.metrics?.spinThroughputKwh ?? 0;
    const pulseKwh = result.metrics?.pulseThroughputKwh ?? 0;

    return {
      clocks: isOnPeakBasis
        ? `The bill only charges demand in the dark on-peak blocks, the price peaks in the evening and carbon peaks elsewhere. Rush hour, ${windowLabel}, is where the plan avoids the grid.`
        : `On Schedule 6 every hour can set the demand charge, so the whole bill lane is hatched. Rush hour, ${windowLabel}, still marks where the plan avoids the grid.`,
      load: `The green area is what the site buys with the station working. It dips under the black line in rush hour and never rises above the dashed ${demandLabel.toLowerCase()} line in billed hours.`,
      dispatch: spinKwh > 0.5 && pulseKwh > 0.5
        ? `Pulse moves ${PlanHelper.formatNumber(pulseKwh)} kWh in long blocks; Spin moves ${PlanHelper.formatNumber(spinKwh)} kWh in short, sharp bursts around the ramps.`
        : 'Bars above zero feed the site; bars below zero charge from the grid.'
    };
  }

  public static buildViewModel(
    controls: IPlanControls,
    context: IPlanDateContext,
    solvedResult: IPlanResult,
    assets: IStationAssets,
    mef: IMarginalEmissionsSeries
  ): IPlanViewModel {
    const mefIsPlaceholder = mef === placeholderMefSeries;

    const schedule = PlanHelper.scheduleFor(controls.scheduleId);
    const rates = TariffHelper.seasonRatesFor(schedule, context.date);
    const pulseMinSocKwh = assets.pulse.energyKwh * assets.pulse.minSocFraction;
    const isOnPeakBasis = schedule.demandBasis === 'on-peak';
    const result = PlanEngineHelper.withSolarShares(solvedResult, context.gridHours);

    return {
      controls,
      date: context.date,
      dateLabel: PlanHelper.dateLabel(context.date),
      result,
      tiles: PlanHelper.buildTiles(controls, context, result, mefIsPlaceholder),
      billLines: PlanHelper.valueLines(result),
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
      solveLabel: result.status === 'optimal' ? `Solved in ${Math.round(result.solveMs)} ms` : 'No feasible plan',
      answer: PlanHelper.answer(controls, result, context.date, assets),
      fleetLine: PlanHelper.fleetLine(result, context.gridHours),
      lpStatsLine: PlanHelper.lpStatsLine(result),
      billTableCaption: controls.peakSoFarMode === 'fresh'
        ? "Demand and facilities lines are one month's charge at the peak these two days would set, if that peak stands all month. The energy line covers only these 48 hours. The proof has the full-month saving."
        : `Demand and facilities lines are one month's charge at the higher of this plan's peak and the peak ${PlanHelper.monthName(context.date)} already set. The energy line covers only these 48 hours.`,
      notices: PlanHelper.notices(controls, result, `${isOnPeakBasis ? 'On-peak demand' : 'Demand'}`)
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
    const value = metrics?.value;
    const schedule = PlanHelper.scheduleFor(controls.scheduleId);
    const tariffSource = schedule.provenance.label;
    const isOnPeakBasis = schedule.demandBasis === 'on-peak';
    const co2ChangeKg = value?.co2ChangeKg ?? 0;
    const energyChange = value?.energyCostChange ?? 0;
    const window = context.rushHourWindows[0];
    const windowLabel = window ? TimeLabelHelper.window(window.startLocalHour, window.endLocalHour) : 'rush hour';
    const peakCutKw = value?.peakCutKw ?? 0;
    const worth = value?.worthPerMonth ?? 0;
    const condition = controls.peakSoFarMode === 'fresh' ? "If the planned day sets the month's peak" : 'Above the peak this month already set';

    const rushCutKw = metrics?.rushPeakCutKw ?? 0;
    const billedPeak = value
      ? `Billed ${isOnPeakBasis ? 'on-peak' : 'any-hour'} demand ${PlanHelper.formatNumber(value.baselinePeakKw)} → ${PlanHelper.formatNumber(value.plannedPeakKw)} kW`
      : 'No plan at these settings';
    const isSameCut = !!value && Math.abs(rushCutKw - peakCutKw) < 1;
    const movedDetail = `${PlanHelper.formatNumber(metrics?.trafficAvoidedKwh ?? 0)} kWh moved out of ${windowLabel}`;

    const tiles: IPlanTile[] = [
      {
        id: 'traffic',
        label: "Off PACE's rush hour",
        value: `${PlanHelper.formatNumber(rushCutKw)} kW`,
        detail: isSameCut ? `${movedDetail}. Also the billed peak cut: ${billedPeak.charAt(0).toLowerCase()}${billedPeak.slice(1)}` : movedDetail,
        source: window && !window.isAssumption ? "PACE's day-ahead forecast" : 'Assumed window, no PACE forecast yet',
        tone: rushCutKw > planFleetSettings.MIN_CUT_KW ? 'good' : 'neutral'
      },
      {
        id: 'peak-cut',
        label: 'Peak cut',
        value: `${PlanHelper.formatNumber(peakCutKw)} kW`,
        detail: billedPeak,
        source: tariffSource,
        tone: peakCutKw > 0.5 ? 'good' : 'neutral'
      },
      {
        id: 'demand-worth',
        label: 'Worth per month on peak charges',
        value: PlanHelper.formatMoney(worth),
        detail: value
          ? `${condition}: ${PlanHelper.formatNumber(value.peakCutKw)} kW × $${value.demandRatePerKw.toFixed(2)} demand + ${PlanHelper.formatNumber(value.facilitiesCutKw)} kW × $${value.facilitiesRatePerKw.toFixed(2)} facilities`
          : 'No plan at these settings',
        source: tariffSource,
        tone: worth > 0.5 ? 'good' : 'neutral'
      },
      {
        id: 'energy',
        label: 'Energy cost change (48 h)',
        value: PlanHelper.formatMoneyChange(energyChange),
        detail: PlanHelper.energyDetail(energyChange, peakCutKw, isOnPeakBasis),
        source: tariffSource,
        tone: energyChange < -0.5 ? 'good' : 'neutral'
      },
      {
        id: 'co2',
        label: 'CO2 change (48 h)',
        value: `${PlanHelper.signOf(co2ChangeKg)}${PlanHelper.formatNumber(Math.abs(co2ChangeKg))} kg`,
        detail: PlanHelper.co2Detail(controls.co2WeightPerKg, co2ChangeKg),
        source: mefIsPlaceholder ? 'Typical hourly carbon (used until grid data loads)' : 'EIA-930 marginal CO2 regression',
        tone: co2ChangeKg < -0.5 ? 'good' : 'neutral'
      },
      {
        id: 'wattsmart',
        label: 'Held for Wattsmart',
        value: `${PlanHelper.formatNumber(metrics?.wattsmartHeldKwh ?? 0)} kWh`,
        detail:
          controls.wattsmartReserveKwh > 0
            ? `Least Pulse energy above its floor in any rush-hour interval; ${PlanHelper.formatNumber(controls.wattsmartReserveKwh)} kWh committed`
            : `No reserve committed. Pulse still had ${PlanHelper.formatNumber(metrics?.rushHourPulseMinKwh ?? 0)} kWh above its floor, unpromised`,
        source: 'Plan LP, Pulse only',
        tone: 'neutral'
      }
    ];

    return isSameCut ? tiles.filter((tile: IPlanTile) => tile.id !== 'peak-cut') : tiles;
  }

  public static lpStatsLine(result: IPlanResult): string {
    const stats = result.lpStats;

    if (!stats || stats.variableCount === 0) {
      return '';
    }

    return `${stats.intervalCount.toLocaleString('en-US')} intervals · ${stats.variableCount.toLocaleString('en-US')} variables · ${stats.constraintCount.toLocaleString('en-US')} constraints · solved in ${Math.round(stats.solveMs).toLocaleString('en-US')} ms by HiGHS.`;
  }

  private static valueLines(result: IPlanResult): IBillLineDelta[] {
    const value = result.metrics?.value;

    if (!value) {
      return [];
    }

    const line = (id: string, label: string, baseline: number, planned: number): IBillLineDelta => ({
      id,
      label,
      baseline,
      planned,
      change: Math.round((planned - baseline) * 100) / 100
    });

    return [
      line(
        'demand',
        `Demand charge, per month (${PlanHelper.formatNumber(value.baselinePeakKw)} → ${PlanHelper.formatNumber(value.plannedPeakKw)} kW)`,
        value.baselinePeakKw * value.demandRatePerKw,
        value.plannedPeakKw * value.demandRatePerKw
      ),
      line(
        'facilities',
        `Facilities charge, per month (${PlanHelper.formatNumber(value.baselineFacilitiesKw)} → ${PlanHelper.formatNumber(value.plannedFacilitiesKw)} kW)`,
        value.baselineFacilitiesKw * value.facilitiesRatePerKw,
        value.plannedFacilitiesKw * value.facilitiesRatePerKw
      ),
      line('energy', 'Energy, these 48 hours', value.baselineEnergyCost, value.plannedEnergyCost)
    ];
  }

  public static fleetLine(result: IPlanResult, gridHours: Detour.Firestore.Snapshot.IGridHour[]): string {
    const metrics = result.metrics;

    if (result.status !== 'optimal' || !metrics || metrics.rushPeakCutKw < planFleetSettings.MIN_CUT_KW) {
      return '';
    }

    const fleetMw = (metrics.rushPeakCutKw * planFleetSettings.STATIONS) / planFleetSettings.KW_PER_MW;
    const fleetLabel = fleetMw < 10 ? fleetMw.toFixed(1) : PlanHelper.formatNumber(fleetMw);
    const peakHour = PlanHelper.rushForecastPeak(metrics.rushHourWindows[0], result.request.date, gridHours);
    const share = peakHour
      ? `, ${((fleetMw / peakHour.forecastMw) * 100).toFixed(1)}% of its forecast load at ${TimeLabelHelper.hour(peakHour.hour)}`
      : '.';

    return `If ${planFleetSettings.STATIONS} stations like this ran DETOUR, about ${fleetLabel} MW would come off PACE's rush hour${share} Illustrative fleet, not Torus's installed base.`;
  }

  private static rushForecastPeak(
    window: IRushHourWindow | undefined,
    date: string,
    gridHours: Detour.Firestore.Snapshot.IGridHour[]
  ): IPlanForecastPeak | null {
    if (!window || window.isAssumption) {
      return null;
    }

    let peak: IPlanForecastPeak | null = null;

    for (const gridHour of gridHours) {
      if (!gridHour.localHourStart.startsWith(date)) {
        continue;
      }

      const hour = Number(gridHour.localHourStart.slice(11, 13));
      const forecastMw = gridHour.dayAheadForecastMw;

      if (hour < window.startLocalHour || hour >= window.endLocalHour || forecastMw === null || !(forecastMw > 0)) {
        continue;
      }

      if (!peak || forecastMw > peak.forecastMw) {
        peak = { hour, forecastMw };
      }
    }

    return peak;
  }

  private static co2Detail(co2WeightPerKg: number, co2ChangeKg: number): string {
    const weight = `$${co2WeightPerKg.toFixed(2)}/kg`;

    if (co2ChangeKg <= 0.5) {
      return `Marginal CO2, with carbon valued at ${weight}`;
    }

    return co2WeightPerKg > 0
      ? `Mostly charging losses; the bill outweighs carbon at ${weight}`
      : 'Carbon not valued at $0/kg';
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

  private static formatNumber(value: number): string {
    return Math.round(value).toLocaleString('en-US');
  }

  private static formatMoney(value: number): string {
    return `$${Math.round(value).toLocaleString('en-US')}`;
  }

  private static formatMoneyChange(value: number): string {
    return `${PlanHelper.signOf(value)}$${Math.abs(Math.round(value)).toLocaleString('en-US')}`;
  }

  private static signOf(value: number): string {
    const rounded = Math.round(value);

    return rounded < 0 ? '−' : rounded > 0 ? '+' : '';
  }
}
