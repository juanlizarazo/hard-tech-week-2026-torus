import { IBacktestDay, IBacktestResult, IBacktestStrategyResult } from '@app/core/backtest';
import { IInterval, IPlanInterval } from '@app/core/models';
import { IHourChartBand, IHourChartHighlight } from '@app/shared/components/hour-chart/hour-chart.interfaces';
import {
  backtestScreenSettings,
  backtestStrategyColors,
  backtestStrategyNames,
  longMonthNames,
  monthNames,
} from './backtest.constants';
import {
  IBacktestBillComponentDefinition,
  IBacktestCycleRow,
  IBacktestDayCharts,
  IBacktestTile,
  IBacktestViewModel,
  IComponentBarGroup,
  IMonthCalendarCell,
  IMonthCalendarScale,
} from './backtest.interfaces';

export class BacktestHelper {
  public static buildViewModel(result: IBacktestResult, selectedDate: string | null): IBacktestViewModel {
    const defaultDate = result.baseline.peakInterval?.localDate ?? result.days[0]?.localDate ?? '';
    const activeDate = selectedDate ?? defaultDate;
    const tiles = BacktestHelper.tiles(result);
    const cycleRows = BacktestHelper.cycleRows(result);
    const calendarScale = BacktestHelper.calendarScale(result);

    return {
      answer: BacktestHelper.answerSentence(result),
      leadTiles: tiles.slice(0, 4),
      secondaryTiles: tiles.slice(4),
      monthLabel: backtestScreenSettings.MONTH_LABEL,
      peakLabel: BacktestHelper.peakLabel(result.baseline),
      calendarNotice: BacktestHelper.calendarNotice(result),
      componentNotice: BacktestHelper.componentNotice(result),
      cyclesNotice: BacktestHelper.cyclesNotice(cycleRows),
      dayNotice: BacktestHelper.dayNotice(result, activeDate),
      calendarCells: BacktestHelper.calendarCells(result, activeDate, calendarScale),
      calendarScale,
      barGroups: BacktestHelper.barGroups(result),
      billSource: result.sources.tariff,
      legend: result.strategies.map((entry: IBacktestStrategyResult) => ({
        id: entry.strategy.id,
        label: BacktestHelper.strategyName(entry),
        color: BacktestHelper.strategyColor(entry),
      })),
      cycleRows,
      dayCharts: BacktestHelper.dayCharts(result, activeDate),
      sourceRows: result.provenance,
      leadName: BacktestHelper.strategyName(result.lead),
      shaverName: backtestStrategyNames.heuristic,
      oracleName: backtestStrategyNames.oracle,
    };
  }

  public static strategyName(entry: IBacktestStrategyResult): string {
    return backtestStrategyNames[entry.strategy.role] ?? entry.strategy.label;
  }

  public static strategyColor(entry: IBacktestStrategyResult): string {
    return backtestStrategyColors[entry.strategy.role] ?? backtestStrategyColors.baseline;
  }

  public static answerSentence(result: IBacktestResult): string {
    const total = result.lead.savings.total;
    const megawatts = BacktestHelper.formatMegawatts(result.summary.nominalPeakKw);
    const scheduleName = result.summary.scheduleName.split(' (')[0];
    const site = `a simulated ${megawatts} ${scheduleName} site`;
    const leadName = BacktestHelper.strategyName(result.lead);

    if (total <= 0) {
      return `Not this time: planning one day ahead, ${leadName} did not lower the July bill on ${site}.`;
    }

    const capture = result.lead.captureRate;
    const captureText =
      capture === null ? '' : ` That is a ${BacktestHelper.formatNumber(capture * 100)}% capture rate against ${backtestStrategyNames.oracle}.`;

    return `Yes. Planning one day ahead with only what was known the afternoon before, ${leadName} would have cut the July bill on ${site} by ${BacktestHelper.formatMoney(total)}, mostly by flattening the peaks that set the demand charge.${captureText}`;
  }

  public static tiles(result: IBacktestResult): IBacktestTile[] {
    const lead = result.lead;
    const total = lead.savings.total;
    const demandShare = total > 0 ? (lead.savings.demand / total) * 100 : 0;
    const capture = lead.captureRate;
    const shaver = result.strategies.find((entry: IBacktestStrategyResult) => entry.strategy.role === 'heuristic');
    const leadName = BacktestHelper.strategyName(lead);
    const oracleName = backtestStrategyNames.oracle;

    return [
      {
        id: 'saved',
        label: 'Saved in July',
        value: BacktestHelper.formatMoney(total),
        hint: `${backtestStrategyNames.baseline} ${BacktestHelper.formatMoney(result.baseline.bill.total)}, ${leadName} ${BacktestHelper.formatMoney(lead.bill.total)}. Base rates, riders excluded.`,
        tone: total > 0 ? 'good' : 'neutral',
        source: result.sources.tariff,
      },
      {
        id: 'demand-share',
        label: 'From the demand charge',
        value: `${BacktestHelper.formatNumber(demandShare)}%`,
        hint: `${leadName} cut billed demand from ${BacktestHelper.formatNumber(result.baseline.bill.determinants.demandKw)} kW to ${BacktestHelper.formatNumber(lead.bill.determinants.demandKw)} kW.`,
        tone: 'neutral',
        source: null,
      },
      {
        id: 'capture',
        label: 'Capture rate',
        value: capture === null ? 'Not available' : `${BacktestHelper.formatNumber(capture * 100)}%`,
        hint:
          capture === null
            ? `${oracleName} could not be solved for this site.`
            : `${leadName}'s share of the ${result.oracle ? BacktestHelper.formatMoney(result.oracle.savings.total) : ''} ${oracleName} saved.`,
        tone: 'neutral',
        source: null,
      },
      {
        id: 'wattsmart',
        label: 'Held for Wattsmart',
        value: `${BacktestHelper.formatNumber(lead.wattsmart.minimumHeldKwh)} kWh`,
        hint: `The least energy kept in reserve during any rush hour. Committed ${BacktestHelper.formatNumber(lead.wattsmart.committedKwh)} kWh.`,
        tone: 'neutral',
        source: result.sources.reserve,
      },
      {
        id: 'shaver',
        label: `${backtestStrategyNames.heuristic} saved`,
        value: shaver ? BacktestHelper.formatMoney(shaver.savings.total) : 'Not run',
        hint: 'Same Torus Station, no forecast or prices.',
        tone: 'neutral',
        source: result.sources.naiveTarget,
      },
      {
        id: 'moved',
        label: 'Moved out of rush hour',
        value: `${BacktestHelper.formatNumber(lead.traffic.avoidedKwh)} kWh`,
        hint: 'Grid draw shifted out of the rush-hour block over the month.',
        tone: 'neutral',
        source: result.sources.site,
      },
      {
        id: 'co2',
        label: 'CO2 kept out of rush hour',
        value: `${BacktestHelper.formatNumber(lead.traffic.avoidedKgCo2)} kg`,
        hint: `Net change over the month ${BacktestHelper.formatSigned(lead.traffic.netKgCo2Change)} kg, battery losses included.`,
        tone: 'neutral',
        source: result.sources.carbon,
      },
    ];
  }

  public static calendarNotice(result: IBacktestResult): string {
    const peak = result.baseline.peakInterval;

    if (!peak) {
      return 'No interval set a peak this month.';
    }

    const dollars = result.baseline.bill.lines
      .filter((line) => line.id === 'demand')
      .reduce((sum: number, line) => sum + line.amount, 0);
    const dollarText = dollars > 0 ? `, worth ${BacktestHelper.formatMoney(dollars)} with no storage` : '';

    const leadPeak = BacktestHelper.leadMonthPeakKw(result);
    const leadText =
      leadPeak > 0 ? ` ${BacktestHelper.strategyName(result.lead)} kept every billed hour at or under ${BacktestHelper.formatNumber(leadPeak)} kW.` : '';

    return `One 15-minute interval, ${BacktestHelper.formatTime(peak.localHour, peak.localMinute)} on ${BacktestHelper.formatDay(peak.localDate)}, set the whole month's demand charge${dollarText}.${leadText}`;
  }

  public static componentNotice(result: IBacktestResult): string {
    const lead = result.lead;
    const shaver = result.strategies.find((entry: IBacktestStrategyResult) => entry.strategy.role === 'heuristic');
    const leadName = BacktestHelper.strategyName(lead);

    if (!shaver || shaver.savings.demand <= 0) {
      return `The demand line is where ${leadName} earns most of its saving.`;
    }

    const ratio = lead.savings.demand / shaver.savings.demand;

    return `On the demand line ${leadName} saves ${ratio.toFixed(1)}× what the ${backtestStrategyNames.heuristic.toLowerCase()} does with the same machines.`;
  }

  public static cyclesNotice(rows: IBacktestCycleRow[]): string {
    const maxPercent = Math.max(0, ...rows.flatMap((row: IBacktestCycleRow) => [row.pulsePercentOfLife, row.spinPercentOfLife]));

    if (maxPercent < 1) {
      return `Small is good: July used under 1% of either machine's life in every strategy (at most ${maxPercent.toFixed(2)}%).`;
    }

    return `July used up to ${maxPercent.toFixed(1)}% of a machine's rated life. Lower is better.`;
  }

  public static dayNotice(result: IBacktestResult, localDate: string): string {
    const day = result.days.find((entry: IBacktestDay) => entry.localDate === localDate) ?? result.days[0];

    if (!day) {
      return '';
    }

    const leadName = BacktestHelper.strategyName(result.lead);

    if (day.baselinePeakKw <= 0) {
      return `${BacktestHelper.formatDay(day.localDate)} has no on-peak window, so ${leadName} uses it to recharge cheaply.`;
    }

    return `With no storage the site would have peaked at ${BacktestHelper.formatNumber(day.baselinePeakKw)} kW; ${leadName} held billed demand to ${BacktestHelper.formatNumber(day.leadPeakKw)} kW.`;
  }

  public static peakLabel(baseline: IBacktestStrategyResult): string {
    const peak = baseline.peakInterval;

    if (!peak) {
      return '';
    }

    return `${BacktestHelper.formatNumber(peak.kw)} kW at ${BacktestHelper.formatTime(peak.localHour, peak.localMinute)} on ${BacktestHelper.formatDay(peak.localDate)}`;
  }

  public static leadMonthPeakKw(result: IBacktestResult): number {
    return Math.max(0, ...result.days.map((day: IBacktestDay) => day.leadPeakKw));
  }

  public static calendarScale(result: IBacktestResult): IMonthCalendarScale {
    const billedDays = result.days.filter((day: IBacktestDay) => day.baselinePeakKw > 0);
    const monthPeakKw = Math.max(1, ...billedDays.map((day: IBacktestDay) => day.baselinePeakKw));
    const lowest = Math.min(monthPeakKw, ...billedDays.flatMap((day: IBacktestDay) => [day.baselinePeakKw, day.leadPeakKw]));
    const step = backtestScreenSettings.CALENDAR_SCALE_STEP_KW;
    const minKw = Math.max(0, Math.floor((lowest - (monthPeakKw - lowest) * 0.25) / step) * step);
    const maxKw = monthPeakKw;
    const leadMonthPeakKw = BacktestHelper.leadMonthPeakKw(result);

    return {
      minKw,
      maxKw,
      monthPeakKw,
      leadMonthPeakKw,
      leadMonthPeakFraction: BacktestHelper.scaleFraction(leadMonthPeakKw, minKw, maxKw),
      leadName: BacktestHelper.strategyName(result.lead),
    };
  }

  public static scaleFraction(kw: number, minKw: number, maxKw: number): number {
    const span = maxKw - minKw || 1;

    return Math.min(1, Math.max(0, (kw - minKw) / span));
  }

  public static calendarCells(result: IBacktestResult, activeDate: string, scale: IMonthCalendarScale): IMonthCalendarCell[] {
    return result.days.map((day: IBacktestDay) => {
      const weekday = new Date(`${day.localDate}T00:00:00Z`).getUTCDay();
      const isOffPeakDay = !day.isWeekday || day.isHoliday;

      return {
        localDate: day.localDate,
        dayOfMonth: Number(day.localDate.slice(8, 10)),
        weekdayColumn: (weekday + 6) % 7,
        isOffPeakDay,
        offPeakReason: day.isHoliday ? 'Tariff holiday: no on-peak window' : isOffPeakDay ? 'Weekend: no on-peak window' : '',
        peakKw: day.baselinePeakKw,
        leadPeakKw: day.leadPeakKw,
        peakFraction: BacktestHelper.scaleFraction(day.baselinePeakKw, scale.minKw, scale.maxKw),
        leadFraction: BacktestHelper.scaleFraction(day.leadPeakKw, scale.minKw, scale.maxKw),
        isPeakDay: day.hasBaselinePeak,
        isSelected: day.localDate === activeDate,
      };
    });
  }

  public static barGroups(result: IBacktestResult): IComponentBarGroup[] {
    const lines = result.baseline.bill.lines;
    const baselineFor = (match: (id: string) => boolean): number =>
      lines.filter((line) => match(line.id)).reduce((sum: number, line) => sum + line.amount, 0);
    const groups: IBacktestBillComponentDefinition[] = [
      { id: 'demand', label: 'Demand charge', match: (id) => id === 'demand', pick: (entry) => entry.savings.demand },
      { id: 'facilities', label: 'Facilities charge', match: (id) => id === 'facilities', pick: (entry) => entry.savings.facilities },
      { id: 'energy', label: 'Energy', match: (id) => id.startsWith('energy'), pick: (entry) => entry.savings.energy },
      { id: 'customer', label: 'Customer charge', match: (id) => id === 'customer-charge', pick: (entry) => entry.savings.customer },
    ];

    return groups.map((group) => ({
      id: group.id,
      label: group.label,
      baselineAmount: baselineFor(group.match),
      bars: result.strategies.map((entry: IBacktestStrategyResult) => ({
        strategyId: entry.strategy.id,
        strategyLabel: BacktestHelper.strategyName(entry),
        color: BacktestHelper.strategyColor(entry),
        savings: group.pick(entry),
      })),
    }));
  }

  public static cycleRows(result: IBacktestResult): IBacktestCycleRow[] {
    return result.strategies.map((entry: IBacktestStrategyResult) => ({
      strategyId: entry.strategy.id,
      strategyLabel: BacktestHelper.strategyName(entry),
      color: BacktestHelper.strategyColor(entry),
      pulseCycles: entry.cycles.pulseEquivalentFullCycles,
      spinCycles: entry.cycles.spinEquivalentFullCycles,
      pulsePercentOfLife: (entry.cycles.pulseEquivalentFullCycles / result.summary.pulseCycleLife) * 100,
      spinPercentOfLife: (entry.cycles.spinEquivalentFullCycles / result.summary.spinCycleLife) * 100,
      pulseThroughputKwh: entry.cycles.pulseThroughputKwh,
      spinThroughputKwh: entry.cycles.spinThroughputKwh,
    }));
  }

  public static dayCharts(result: IBacktestResult, localDate: string): IBacktestDayCharts {
    const day = result.days.find((entry: IBacktestDay) => entry.localDate === localDate) ?? result.days[0];
    const range = result.intervals.slice(day.startIndex, day.endIndex + 1);
    const lead = result.lead.intervals.slice(day.startIndex, day.endIndex + 1);
    const rush = result.rushHourMask.slice(day.startIndex, day.endIndex + 1);
    const onPeak = lead.map((entry: IPlanInterval) => entry.isOnPeak);
    const xLabels = range.map((interval: IInterval) => BacktestHelper.formatCompactTime(interval.localHour, interval.localMinute));
    const loadValues = lead.map((entry: IPlanInterval) => entry.loadKw);
    const gridValues = lead.map((entry: IPlanInterval) => entry.gridKw);
    const ceiling = Math.max(...loadValues, 1);
    const onPeakBand: IHourChartBand = {
      label: 'On-peak hours (demand billed)',
      lower: onPeak.map((isOnPeak: boolean) => (isOnPeak ? 0 : null)),
      upper: onPeak.map((isOnPeak: boolean) => (isOnPeak ? ceiling : null)),
      color: backtestScreenSettings.ON_PEAK_BAND_COLOR,
    };
    const rushHighlight = BacktestHelper.range(rush, 'Rush hour');
    const spinNet = lead.map((entry: IPlanInterval) => entry.spinDischargeKw - entry.spinChargeKw);
    const pulseNet = lead.map((entry: IPlanInterval) => entry.pulseDischargeKw - entry.pulseChargeKw);

    return {
      localDate: day.localDate,
      dateLabel: BacktestHelper.formatDay(day.localDate),
      xLabels,
      load: {
        series: [
          { label: 'Site load, no storage', values: loadValues, style: 'solid', color: backtestScreenSettings.LOAD_COLOR },
          {
            label: `Grid draw with ${BacktestHelper.strategyName(result.lead)}`,
            values: gridValues,
            style: 'dashed',
            color: backtestScreenSettings.GRID_COLOR,
          },
        ],
        bands: result.summary.scheduleId === 'schedule-8' ? [onPeakBand] : [],
        highlight: rushHighlight,
      },
      dispatch: {
        series: [
          { label: 'Nova Spin (flywheel)', values: spinNet, style: 'solid', color: backtestScreenSettings.SPIN_COLOR },
          { label: 'Nova Pulse (battery)', values: pulseNet, style: 'solid', color: backtestScreenSettings.PULSE_COLOR },
        ],
        bands: [],
        highlight: rushHighlight,
      },
      dayPeakKw: day.baselinePeakKw,
    };
  }

  public static formatMoney(value: number): string {
    return `${value < 0 ? '-' : ''}$${Math.round(Math.abs(value)).toLocaleString('en-US')}`;
  }

  public static formatSigned(value: number): string {
    const rounded = Math.round(value);

    return `${rounded > 0 ? '+' : rounded < 0 ? '−' : ''}${Math.abs(rounded).toLocaleString('en-US')}`;
  }

  public static formatNumber(value: number): string {
    return Math.round(value).toLocaleString('en-US');
  }

  public static formatMegawatts(kilowatts: number): string {
    const megawatts = kilowatts / 1000;

    return `${Number.isInteger(megawatts) ? megawatts : megawatts.toFixed(1)} MW`;
  }

  public static formatDay(localDate: string): string {
    return `${monthNames[Number(localDate.slice(5, 7)) - 1]} ${Number(localDate.slice(8, 10))}`;
  }

  public static formatLongDay(localDate: string): string {
    return `${longMonthNames[Number(localDate.slice(5, 7)) - 1]} ${Number(localDate.slice(8, 10))}`;
  }

  public static formatTime(hour: number, minute: number): string {
    const suffix = hour >= 12 ? 'p.m.' : 'a.m.';
    const twelveHour = hour % 12 === 0 ? 12 : hour % 12;

    return `${twelveHour}:${String(minute).padStart(2, '0')} ${suffix}`;
  }

  public static formatCompactTime(hour: number, minute: number): string {
    if (minute !== 0) {
      return BacktestHelper.formatTime(hour, minute);
    }

    return `${hour % 12 === 0 ? 12 : hour % 12} ${hour >= 12 ? 'p.m.' : 'a.m.'}`;
  }

  private static range(flags: boolean[], label: string): IHourChartHighlight | null {
    const first = flags.indexOf(true);
    const last = flags.lastIndexOf(true);

    return first < 0 ? null : { startIndex: first, endIndex: last, label };
  }
}
