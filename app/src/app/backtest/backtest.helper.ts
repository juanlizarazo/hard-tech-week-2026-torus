import { IBacktestDay, IBacktestResult, IBacktestStrategyResult } from '@app/core/backtest';
import { IInterval, IPlanInterval } from '@app/core/models';
import { IHourChartBand, IHourChartHighlight } from '@app/shared/components/hour-chart/hour-chart.interfaces';
import { backtestScreenSettings } from './backtest.constants';
import {
  IBacktestCycleRow,
  IBacktestDayCharts,
  IBacktestTile,
  IBacktestViewModel,
  IComponentBarGroup,
  IMonthCalendarCell,
} from './backtest.interfaces';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const longMonthNames = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
];

export class BacktestHelper {
  public static buildViewModel(result: IBacktestResult, selectedDate: string | null): IBacktestViewModel {
    const defaultDate = result.baseline.peakInterval?.localDate ?? result.days[0]?.localDate ?? '';
    const activeDate = selectedDate ?? defaultDate;

    return {
      lead: BacktestHelper.leadSentence(result),
      tiles: BacktestHelper.tiles(result),
      monthLabel: backtestScreenSettings.MONTH_LABEL,
      peakLabel: BacktestHelper.peakLabel(result.baseline),
      calendarCells: BacktestHelper.calendarCells(result, activeDate),
      barGroups: BacktestHelper.barGroups(result),
      legend: result.strategies.map((entry: IBacktestStrategyResult) => ({
        id: entry.strategy.id,
        label: entry.strategy.label,
        colorIndex: BacktestHelper.colorIndex(entry),
      })),
      cycleRows: BacktestHelper.cycleRows(result),
      dayCharts: BacktestHelper.dayCharts(result, activeDate),
      sourceRows: result.provenance,
      isCapturePending: result.lead.captureRate === null,
    };
  }

  public static leadSentence(result: IBacktestResult): string {
    const lead = result.lead;
    const total = lead.savings.total;
    const megawatts = BacktestHelper.formatMegawatts(result.summary.nominalPeakKw);
    const scheduleName = result.summary.scheduleName.split(' (')[0];
    const held = `${BacktestHelper.formatNumber(lead.wattsmart.minimumHeldKwh)} kWh held for Wattsmart`;
    const capture =
      lead.captureRate === null
        ? backtestScreenSettings.PENDING_CAPTURE_TEXT
        : `${BacktestHelper.formatNumber(lead.captureRate * 100)}% of the perfect-foresight optimum`;
    const label = lead.strategy.label;

    if (total <= 0) {
      return `The ${label.toLowerCase()} did not lower the bill on a simulated ${megawatts} ${scheduleName} site in ${backtestScreenSettings.MONTH_LABEL}. Share of the perfect-foresight optimum: ${capture}. ${held}.`;
    }

    const demandPercent = (lead.savings.demand / total) * 100;
    const captureText =
      lead.captureRate === null ? `Share of the perfect-foresight optimum: ${capture}.` : `That is ${capture}.`;

    return `The ${label.toLowerCase()} saved ${BacktestHelper.formatMoney(total)} on a simulated ${megawatts} ${scheduleName} site in ${backtestScreenSettings.MONTH_LABEL}. ${BacktestHelper.formatNumber(demandPercent)}% of it came from the demand charge. ${captureText} ${held}.`;
  }

  public static tiles(result: IBacktestResult): IBacktestTile[] {
    const lead = result.lead;
    const total = lead.savings.total;
    const demandShare = total > 0 ? (lead.savings.demand / total) * 100 : 0;
    const capture = lead.captureRate;
    const peakRatio = result.baseline.bill.determinants.demandKw;

    return [
      {
        label: 'Saved in July',
        value: BacktestHelper.formatMoney(total),
        hint: `${BacktestHelper.formatMoney(result.baseline.bill.total)} to ${BacktestHelper.formatMoney(lead.bill.total)}, base rates, riders excluded`,
        source: result.sources.tariff,
      },
      {
        label: 'From the demand charge',
        value: `${BacktestHelper.formatNumber(demandShare)}%`,
        hint: `Billed demand ${BacktestHelper.formatNumber(peakRatio)} kW to ${BacktestHelper.formatNumber(lead.bill.determinants.demandKw)} kW`,
        source: result.sources.site,
      },
      {
        label: 'Share of the oracle',
        value: capture === null ? backtestScreenSettings.PENDING_CAPTURE_TEXT : `${BacktestHelper.formatNumber(capture * 100)}%`,
        hint: 'Realized savings divided by perfect-foresight savings',
        source: result.sources.tariff,
      },
      {
        label: 'Held for Wattsmart',
        value: `${BacktestHelper.formatNumber(lead.wattsmart.minimumHeldKwh)} kWh`,
        hint: `Lowest stored energy above the floor in any rush hour. Committed ${BacktestHelper.formatNumber(lead.wattsmart.committedKwh)} kWh`,
        source: result.sources.reserve,
      },
      {
        label: 'Traffic avoided',
        value: `${BacktestHelper.formatNumber(lead.traffic.avoidedKwh)} kWh`,
        hint: 'Moved out of the rush-hour band, simulated site draw',
        source: result.sources.site,
      },
      {
        label: 'CO2 moved out of traffic',
        value: `${BacktestHelper.formatNumber(lead.traffic.avoidedKgCo2)} kg`,
        hint: `Net change over the month ${BacktestHelper.formatNumber(lead.traffic.netKgCo2Change)} kg, losses included`,
        source: result.sources.carbon,
      },
    ];
  }

  public static peakLabel(baseline: IBacktestStrategyResult): string {
    const peak = baseline.peakInterval;

    if (!peak) {
      return 'No peak interval';
    }

    return `${BacktestHelper.formatDay(peak.localDate)} · ${BacktestHelper.formatTime(peak.localHour, peak.localMinute)} · ${BacktestHelper.formatNumber(peak.kw)} kW`;
  }

  public static calendarCells(result: IBacktestResult, activeDate: string): IMonthCalendarCell[] {
    const monthPeakKw = Math.max(1, ...result.days.map((day: IBacktestDay) => day.baselinePeakKw));

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
        barFraction: day.baselinePeakKw / monthPeakKw,
        isPeakDay: day.hasBaselinePeak,
        isSelected: day.localDate === activeDate,
      };
    });
  }

  public static barGroups(result: IBacktestResult): IComponentBarGroup[] {
    const lines = result.baseline.bill.lines;
    const sourceFor = (match: (id: string) => boolean): IComponentBarGroup['source'] =>
      (lines.find((line) => match(line.id)) ?? lines[0]).provenance;
    const baselineFor = (match: (id: string) => boolean): number =>
      lines.filter((line) => match(line.id)).reduce((sum: number, line) => sum + line.amount, 0);
    const groups: { id: string; label: string; match: (id: string) => boolean; pick: (entry: IBacktestStrategyResult) => number }[] = [
      { id: 'demand', label: 'Demand', match: (id) => id === 'demand', pick: (entry) => entry.savings.demand },
      { id: 'facilities', label: 'Facilities', match: (id) => id === 'facilities', pick: (entry) => entry.savings.facilities },
      { id: 'energy', label: 'Energy', match: (id) => id.startsWith('energy'), pick: (entry) => entry.savings.energy },
      { id: 'customer', label: 'Customer', match: (id) => id === 'customer-charge', pick: (entry) => entry.savings.customer },
    ];

    return groups.map((group) => ({
      id: group.id,
      label: group.label,
      baselineAmount: baselineFor(group.match),
      source: sourceFor(group.match),
      bars: result.strategies.map((entry: IBacktestStrategyResult) => ({
        strategyId: entry.strategy.id,
        strategyLabel: entry.strategy.label,
        colorIndex: BacktestHelper.colorIndex(entry),
        savings: group.pick(entry),
      })),
    }));
  }

  public static cycleRows(result: IBacktestResult): IBacktestCycleRow[] {
    return result.strategies.map((entry: IBacktestStrategyResult) => ({
      strategyId: entry.strategy.id,
      strategyLabel: entry.strategy.label,
      colorIndex: BacktestHelper.colorIndex(entry),
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
    const rushBand: IHourChartBand = {
      label: 'Rush hour (PACE)',
      lower: rush.map((isRush: boolean) => (isRush ? 0 : null)),
      upper: rush.map((isRush: boolean) => (isRush ? ceiling : null)),
      color: backtestScreenSettings.RUSH_BAND_COLOR,
    };
    const spinNet = lead.map((entry: IPlanInterval) => entry.spinDischargeKw - entry.spinChargeKw);
    const pulseNet = lead.map((entry: IPlanInterval) => entry.pulseDischargeKw - entry.pulseChargeKw);
    const spinBand: IHourChartBand = {
      label: 'Spin',
      lower: spinNet.map((value: number) => Math.min(value, 0)),
      upper: spinNet.map((value: number) => Math.max(value, 0)),
      color: backtestScreenSettings.SPIN_COLOR,
    };
    const pulseBand: IHourChartBand = {
      label: 'Pulse',
      lower: pulseNet.map((value: number, index: number) =>
        value > 0 ? Math.max(spinNet[index], 0) : value < 0 ? Math.min(spinNet[index], 0) + value : 0,
      ),
      upper: pulseNet.map((value: number, index: number) =>
        value > 0 ? Math.max(spinNet[index], 0) + value : value < 0 ? Math.min(spinNet[index], 0) : 0,
      ),
      color: backtestScreenSettings.PULSE_COLOR,
    };

    const dispatchLow = Math.min(0, ...(pulseBand.lower as number[]), ...(spinBand.lower as number[]));
    const dispatchHigh = Math.max(1, ...(pulseBand.upper as number[]), ...(spinBand.upper as number[]));
    const dispatchRushBand: IHourChartBand = {
      ...rushBand,
      lower: rush.map((isRush: boolean) => (isRush ? dispatchLow : null)),
      upper: rush.map((isRush: boolean) => (isRush ? dispatchHigh : null)),
    };

    return {
      localDate: day.localDate,
      dateLabel: BacktestHelper.formatDay(day.localDate),
      xLabels,
      load: {
        series: [
          { label: 'Site load, no storage', values: loadValues, style: 'solid', color: backtestScreenSettings.LOAD_COLOR },
          {
            label: `Grid draw, ${result.lead.strategy.label.toLowerCase()}`,
            values: gridValues,
            style: 'dashed',
            color: backtestScreenSettings.GRID_COLOR,
          },
        ],
        bands: [rushBand],
        highlight: BacktestHelper.range(onPeak, 'On-peak window'),
      },
      dispatch: {
        series: [],
        bands: [spinBand, pulseBand, dispatchRushBand],
        highlight: null,
      },
      dayPeakKw: day.baselinePeakKw,
    };
  }

  public static colorIndex(entry: IBacktestStrategyResult): number {
    return backtestScreenSettings.STRATEGY_COLOR_INDEX[entry.strategy.role];
  }

  public static formatMoney(value: number): string {
    return `${value < 0 ? '-' : ''}$${Math.round(Math.abs(value)).toLocaleString('en-US')}`;
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
