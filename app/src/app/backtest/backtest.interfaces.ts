import { BacktestStrategyRole, IBacktestResult, IBacktestStrategyResult } from '@app/core/backtest';
import { IProvenance, TariffScheduleId } from '@app/core/models';
import { IHourChartBand, IHourChartHighlight, IHourChartSeries } from '@app/shared/components/hour-chart/hour-chart.interfaces';
import { BacktestTileTone, BacktestViewStatus } from './backtest.types';

export interface IMonthCalendarCell {
  localDate: string;
  dayOfMonth: number;
  weekdayColumn: number;
  isOffPeakDay: boolean;
  offPeakReason: string;
  peakKw: number;
  leadPeakKw: number;
  peakFraction: number;
  leadFraction: number;
  isPeakDay: boolean;
  isSelected: boolean;
}

export interface IMonthCalendarScale {
  minKw: number;
  maxKw: number;
  monthPeakKw: number;
  leadMonthPeakKw: number;
  leadMonthPeakFraction: number;
  leadName: string;
}

export interface IComponentBar {
  strategyId: string;
  strategyLabel: string;
  color: string;
  savings: number;
}

export interface IComponentBarGroup {
  id: string;
  label: string;
  baselineAmount: number;
  bars: IComponentBar[];
}

export interface IBacktestControls {
  siteId: string;
  scheduleId: TariffScheduleId;
}

export interface IBacktestViewState {
  status: BacktestViewStatus;
  result: IBacktestResult | null;
  errorMessage: string;
}

export interface IBacktestTile {
  id: string;
  label: string;
  value: string;
  hint: string;
  tone: BacktestTileTone;
  source: IProvenance | null;
}

export interface IBacktestLegendItem {
  id: string;
  label: string;
  color: string;
}

export interface IBacktestCycleRow {
  strategyId: string;
  strategyLabel: string;
  color: string;
  pulseCycles: number;
  spinCycles: number;
  pulsePercentOfLife: number;
  spinPercentOfLife: number;
  pulseThroughputKwh: number;
  spinThroughputKwh: number;
}

export interface IBacktestChartPanel {
  series: IHourChartSeries[];
  bands: IHourChartBand[];
  highlight: IHourChartHighlight | null;
}

export interface IBacktestDayCharts {
  localDate: string;
  dateLabel: string;
  xLabels: string[];
  load: IBacktestChartPanel;
  dispatch: IBacktestChartPanel;
  dayPeakKw: number;
}

export interface IBacktestComparisonRow {
  strategyId: string;
  role: BacktestStrategyRole;
  strategyLabel: string;
  color: string;
  isLead: boolean;
  billSavings: number;
  captureRate: number | null;
  netKgCo2: number;
  carbonValue: number;
  wearCost: number;
  totalValue: number;
}

export interface IBacktestCaptureBar {
  strategyId: string;
  label: string;
  role: BacktestStrategyRole;
  isLead: boolean;
  fraction: number;
  captureLabel: string;
  savingsLabel: string;
}

export interface IBacktestCaptureGauge {
  isAvailable: boolean;
  valueLabel: string;
  oracleSavingsLabel: string;
  bars: IBacktestCaptureBar[];
}

export interface IBacktestSelectedDay {
  localDate: string;
  dateLabel: string;
  isOffPeakDay: boolean;
  offPeakReason: string;
  isPeakDay: boolean;
  baselinePeakLabel: string;
  leadPeakLabel: string;
  shavedLabel: string;
}

export interface IBacktestViewModel {
  answer: string;
  capture: IBacktestCaptureGauge;
  selectedDay: IBacktestSelectedDay | null;
  leadTiles: IBacktestTile[];
  secondaryTiles: IBacktestTile[];
  comparisonRows: IBacktestComparisonRow[];
  valueNotice: string;
  monthLabel: string;
  peakLabel: string;
  calendarNotice: string;
  componentNotice: string;
  cyclesNotice: string;
  dayNotice: string;
  calendarCells: IMonthCalendarCell[];
  calendarScale: IMonthCalendarScale;
  barGroups: IComponentBarGroup[];
  billSource: IProvenance;
  legend: IBacktestLegendItem[];
  cycleRows: IBacktestCycleRow[];
  dayCharts: IBacktestDayCharts;
  sourceRows: IProvenance[];
  leadName: string;
  shaverName: string;
  oracleName: string;
}

export interface IBacktestScreenModel {
  state: IBacktestViewState;
  model: IBacktestViewModel | null;
}

export interface IBacktestScheduleOption {
  id: TariffScheduleId;
  label: string;
}

export interface IBacktestBillComponentDefinition {
  id: string;
  label: string;
  match: (id: string) => boolean;
  pick: (entry: IBacktestStrategyResult) => number;
}
