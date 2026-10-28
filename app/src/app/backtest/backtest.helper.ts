import { IBacktestDay, IBacktestResult, IBacktestStrategyResult, IComponentSavings } from '@app/core/backtest';
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
  IBacktestCaptureBar,
  IBacktestCaptureGauge,
  IBacktestComparisonRow,
  IBacktestCycleRow,
  IBacktestDayCharts,
  IBacktestSelectedDay,
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
    const calendarCells = BacktestHelper.calendarCells(result, activeDate, calendarScale);

    return {
      answer: BacktestHelper.answerSentence(result),
      capture: BacktestHelper.captureGauge(result),
      selectedDay: BacktestHelper.selectedDay(calendarCells),
      leadTiles: tiles.slice(0, 3),
      secondaryTiles: tiles.slice(3),
      comparisonRows: BacktestHelper.comparisonRows(result),
      valueNotice: BacktestHelper.valueNotice(result),
      monthLabel: BacktestHelper.monthLabel(result.summary.month, result.summary.throughDate),
      monthName: BacktestHelper.monthName(result.summary.month),
      monthPhrase: BacktestHelper.monthPhrase(result.summary.month, result.summary.throughDate),
      isPartialMonth: result.summary.throughDate !== null,
      peakLabel: BacktestHelper.peakLabel(result.baseline),
      calendarNotice: BacktestHelper.calendarNotice(result),
      componentNotice: BacktestHelper.componentNotice(result),
      cyclesNotice: BacktestHelper.cyclesNotice(cycleRows, BacktestHelper.monthName(result.summary.month)),
      dayNotice: BacktestHelper.dayNotice(result, activeDate),
      calendarCells,
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
    const lead = result.lead;
    const total = lead.savings.total;
    const megawatts = BacktestHelper.formatMegawatts(result.summary.nominalPeakKw);
    const scheduleName = result.summary.scheduleName.split(' (')[0];
    const siteNoun = BacktestHelper.siteNoun(result.summary.siteName);
    const leadName = BacktestHelper.strategyName(lead);

    if (total <= 0) {
      return `Not this time: planning one day ahead on a load forecast, ${leadName} did not lower the ${BacktestHelper.monthName(result.summary.month)} bill${result.summary.throughDate ? ' so far' : ''} on a simulated ${megawatts} ${scheduleName} ${siteNoun}. ${BacktestHelper.co2Clause(result)}`;
    }

    const demandClause = BacktestHelper.demandClause(lead.savings);
    const capture = lead.captureRate;
    const captureText =
      capture === null ? '' : `, ${BacktestHelper.formatNumber(capture * 100)}% of the ${backtestStrategyNames.oracle.toLowerCase()} optimum`;
    const leadSentence = `${BacktestHelper.formatMoney(total)} saved on a simulated ${megawatts} ${scheduleName} ${siteNoun}, ${demandClause}${captureText}, with ${BacktestHelper.formatNumber(lead.wattsmart.minimumHeldKwh)} kWh held for Wattsmart.`;

    return [leadSentence, BacktestHelper.partialClause(result), BacktestHelper.shaverClause(result), BacktestHelper.co2Clause(result)]
      .filter(Boolean)
      .join(' ');
  }

  public static partialClause(result: IBacktestResult): string {
    return result.summary.throughDate
      ? `Month to date: the demand charge is the peak so far, through ${BacktestHelper.formatDay(result.summary.throughDate)}.`
      : '';
  }

  public static monthName(month: string): string {
    return longMonthNames[Number(month.slice(5, 7)) - 1];
  }

  public static monthPhrase(month: string, throughDate: string | null): string {
    return throughDate ? `${BacktestHelper.monthName(month)} so far` : BacktestHelper.monthName(month);
  }

  public static monthLabel(month: string, throughDate: string | null): string {
    if (throughDate) {
      return `${monthNames[Number(month.slice(5, 7)) - 1]} 1–${Number(throughDate.slice(8, 10))} · month to date`;
    }

    return `${BacktestHelper.monthName(month)} ${month.slice(0, 4)}`;
  }

  public static demandClause(savings: IComponentSavings): string {
    if (savings.total <= 0) {
      return '';
    }

    const share = (savings.demand / savings.total) * 100;

    if (share <= 100) {
      return `${BacktestHelper.formatNumber(Math.max(0, share))}% from the demand charge`;
    }

    return `all of it from the demand charge (${BacktestHelper.formatMoney(savings.demand)} there, ${BacktestHelper.formatMoney(savings.demand - savings.total)} given back on other lines)`;
  }

  public static siteNoun(siteName: string): string {
    return siteName.replace(/^Simulated\s+/, '').replace(/\s*\(.*\)$/, '').toLowerCase();
  }

  public static shaverClause(result: IBacktestResult): string {
    const shaver = result.shaver;
    const lead = result.lead;
    const leadName = BacktestHelper.strategyName(lead);
    const shaverName = backtestStrategyNames.heuristic.toLowerCase();

    if (!shaver || shaver.savings.total <= lead.savings.total) {
      return '';
    }

    const weight = `$${result.summary.co2WeightPerKg.toFixed(2)}/kg`;

    if (lead.value.total > shaver.value.total) {
      return `The ${shaverName} saved more on the bill alone (${BacktestHelper.formatMoney(shaver.savings.total)}), but counting carbon at ${weight} and machine wear, ${leadName} is worth ${BacktestHelper.formatMoney(lead.value.total)} to its ${BacktestHelper.formatMoney(shaver.value.total)}.`;
    }

    return `The ${shaverName} did better here (${BacktestHelper.formatMoney(shaver.savings.total)} on the bill, ${BacktestHelper.formatMoney(shaver.value.total)} counting carbon and wear): a day-ahead forecast misses this site's short spikes.`;
  }

  public static co2Clause(result: IBacktestResult): string {
    const netKg = result.lead.traffic.netKgCo2Change;
    const leadName = BacktestHelper.strategyName(result.lead);

    if (netKg > 0.5) {
      return `CO2 rose ${BacktestHelper.formatNumber(netKg)} kg net over the month, mostly battery losses; raise the CO2 weight dial on the Plan to trade bill savings for carbon.`;
    }

    if (netKg < -0.5) {
      return `${leadName} also cut CO2 by ${BacktestHelper.formatNumber(-netKg)} kg net.`;
    }

    return '';
  }

  public static tiles(result: IBacktestResult): IBacktestTile[] {
    const lead = result.lead;
    const total = lead.savings.total;
    const demandShare = total > 0 ? (lead.savings.demand / total) * 100 : 0;
    const isDemandOverNet = demandShare > 100;
    const shaver = result.shaver;
    const perfectLoad = result.perfectLoad;
    const leadName = BacktestHelper.strategyName(lead);
    const oracleName = backtestStrategyNames.oracle;
    const netKg = lead.traffic.netKgCo2Change;

    return [
      {
        id: 'saved',
        label: `Saved in ${BacktestHelper.monthPhrase(result.summary.month, result.summary.throughDate)}`,
        value: BacktestHelper.formatMoney(total),
        hint: `${backtestStrategyNames.baseline} ${BacktestHelper.formatMoney(result.baseline.bill.total)}, ${leadName} ${BacktestHelper.formatMoney(lead.bill.total)}. Base rates, riders excluded.`,
        tone: total > 0 ? 'good' : 'neutral',
        source: result.sources.tariff,
      },
      {
        id: 'demand-share',
        label: 'From the demand charge',
        value: isDemandOverNet ? BacktestHelper.formatMoney(lead.savings.demand) : `${BacktestHelper.formatNumber(Math.max(0, demandShare))}%`,
        hint: `${leadName} cut billed demand from ${BacktestHelper.formatNumber(result.baseline.bill.determinants.demandKw)} kW to ${BacktestHelper.formatNumber(lead.bill.determinants.demandKw)} kW.${isDemandOverNet ? ` More than the net saving: other bill lines gave back ${BacktestHelper.formatMoney(lead.savings.demand - total)}.` : ''}`,
        tone: 'neutral',
        source: result.sources.tariff,
      },
      {
        id: 'wattsmart',
        label: 'Held for Wattsmart',
        value: `${BacktestHelper.formatNumber(lead.wattsmart.minimumHeldKwh)} kWh`,
        hint: `The least Pulse energy above its floor in any rush hour. Committed ${BacktestHelper.formatNumber(lead.wattsmart.committedKwh)} kWh.`,
        tone: 'neutral',
        source: result.sources.reserve,
      },
      {
        id: 'co2',
        label: 'Net CO2 change',
        value: `${BacktestHelper.formatSigned(netKg)} kg`,
        hint: netKg > 0.5 ? 'Battery losses add CO2; raise the CO2 weight on the Plan to push charging into cleaner hours.' : 'Marginal CO2 over the month, battery losses included.',
        tone: netKg < -0.5 ? 'good' : netKg > 0.5 ? 'bad' : 'neutral',
        source: result.sources.carbon,
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
        id: 'perfect-load',
        label: 'With a perfect load forecast',
        value: perfectLoad ? BacktestHelper.formatMoney(perfectLoad.savings.total) : 'Not run',
        hint:
          perfectLoad && perfectLoad.captureRate !== null
            ? `${BacktestHelper.formatNumber(perfectLoad.captureRate * 100)}% capture if ${leadName} knew each day's load in advance.`
            : 'The same planner, told the real load in advance.',
        tone: 'neutral',
        source: result.sources.site,
      },
      {
        id: 'moved',
        label: 'Moved out of rush hour',
        value: `${BacktestHelper.formatNumber(lead.traffic.avoidedKwh)} kWh`,
        hint: 'Grid draw shifted out of the rush-hour block over the month.',
        tone: 'neutral',
        source: result.sources.rushHour,
      },
    ];
  }

  public static comparisonRows(result: IBacktestResult): IBacktestComparisonRow[] {
    return result.strategies.map((entry: IBacktestStrategyResult) => ({
      strategyId: entry.strategy.id,
      role: entry.strategy.role,
      strategyLabel: BacktestHelper.strategyName(entry),
      color: BacktestHelper.strategyColor(entry),
      isLead: entry.strategy.id === result.lead.strategy.id,
      billSavings: entry.savings.total,
      captureRate: entry.captureRate,
      netKgCo2: entry.traffic.netKgCo2Change,
      carbonValue: entry.value.carbonValue,
      wearCost: entry.value.wearCost,
      totalValue: entry.value.total,
    }));
  }

  public static isLoss(result: IBacktestResult): boolean {
    return result.lead.savings.total < 0;
  }

  public static lossCause(result: IBacktestResult): string {
    const lossLabel = BacktestHelper.formatMoney(-result.lead.savings.total);
    const avoidedKg = -result.lead.traffic.netKgCo2Change;

    return avoidedKg > 0.5
      ? `The ${lossLabel} loss bought ${BacktestHelper.formatNumber(avoidedKg)} kg less CO2; lower the CO2 weight on the Plan to stop paying for it.`
      : `The ${lossLabel} loss came from a new peak set against a forecast.`;
  }

  public static captureGauge(result: IBacktestResult): IBacktestCaptureGauge {
    const capture = result.lead.captureRate;
    const ordered = [result.lead, result.shaver, result.oracle].filter(
      (entry): entry is IBacktestStrategyResult => entry !== null && entry !== undefined
    );
    const bars: IBacktestCaptureBar[] = ordered
      .filter((entry: IBacktestStrategyResult) => entry.captureRate !== null || entry.strategy.role === 'oracle')
      .map((entry: IBacktestStrategyResult) => {
        const rate = entry.strategy.role === 'oracle' ? 1 : (entry.captureRate ?? 0);

        return {
          strategyId: entry.strategy.id,
          label: BacktestHelper.strategyName(entry),
          role: entry.strategy.role,
          isLead: entry.strategy.id === result.lead.strategy.id,
          fraction: Math.min(1, Math.max(0, rate)),
          captureLabel: `${BacktestHelper.formatNumber(rate * 100)}%`,
          savingsLabel: BacktestHelper.formatMoney(entry.savings.total),
        };
      });

    return {
      isAvailable: capture !== null && result.oracle !== null,
      valueLabel: capture === null ? 'Not available' : BacktestHelper.isLoss(result) ? 'Cost money' : `${BacktestHelper.formatNumber(capture * 100)}%`,
      lossCause: BacktestHelper.isLoss(result) ? BacktestHelper.lossCause(result) : '',
      oracleSavingsLabel: result.oracle ? BacktestHelper.formatMoney(result.oracle.savings.total) : '',
      bars,
    };
  }

  public static selectedDay(cells: IMonthCalendarCell[]): IBacktestSelectedDay | null {
    const cell = cells.find((entry: IMonthCalendarCell) => entry.isSelected) ?? cells[0];

    if (!cell) {
      return null;
    }

    return {
      localDate: cell.localDate,
      dateLabel: BacktestHelper.formatLongDay(cell.localDate),
      isOffPeakDay: cell.isOffPeakDay,
      offPeakReason: cell.offPeakReason,
      isPeakDay: cell.isPeakDay,
      baselinePeakLabel: cell.peakKw > 0 ? `${BacktestHelper.formatNumber(cell.peakKw)} kW` : '—',
      leadPeakLabel: cell.peakKw > 0 ? `${BacktestHelper.formatNumber(cell.leadPeakKw)} kW` : '—',
      shavedLabel: cell.peakKw > 0 ? `${BacktestHelper.formatNumber(Math.max(0, cell.peakKw - cell.leadPeakKw))} kW` : '—',
    };
  }

  public static valueNotice(result: IBacktestResult): string {
    const lead = result.lead;
    const shaver = result.shaver;
    const leadName = BacktestHelper.strategyName(lead);
    const weight = `$${result.summary.co2WeightPerKg.toFixed(2)}/kg`;
    const basis = `Total value is the bill saving, plus CO2 avoided at ${weight}, minus machine wear.`;

    if (!shaver) {
      return basis;
    }

    if (lead.savings.total >= shaver.savings.total) {
      return `${basis} ${leadName} beats the ${backtestStrategyNames.heuristic.toLowerCase()} on the bill alone here.`;
    }

    if (lead.value.total >= shaver.value.total) {
      return `${basis} ${leadName} prices carbon and wear, so it can lose on the bill alone and still come out ahead in total.`;
    }

    return `${basis} On this site and rate plan the ${backtestStrategyNames.heuristic.toLowerCase()} wins on both: a day-ahead load forecast cannot see its short spikes coming.`;
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

  public static cyclesNotice(rows: IBacktestCycleRow[], monthName: string): string {
    const maxPercent = Math.max(0, ...rows.flatMap((row: IBacktestCycleRow) => [row.pulsePercentOfLife, row.spinPercentOfLife]));

    if (maxPercent < 1) {
      return `Small is good: ${monthName} used under 1% of either machine's life in every strategy (at most ${maxPercent.toFixed(2)}%).`;
    }

    return `${monthName} used up to ${maxPercent.toFixed(1)}% of a machine's rated life. Lower is better.`;
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
