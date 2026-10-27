import { IBacktestResult } from '@app/core/backtest';
import { IProvenance, TariffScheduleId } from '@app/core/models';
import { IHourChartBand, IHourChartHighlight, IHourChartSeries } from '@app/shared/components/hour-chart/hour-chart.interfaces';
import { BacktestViewStatus } from './backtest.types';

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
  tone: 'good' | 'bad' | 'neutral';
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

export interface IBacktestDayCharts {
  localDate: string;
  dateLabel: string;
  xLabels: string[];
  load: {
    series: IHourChartSeries[];
    bands: IHourChartBand[];
    highlight: IHourChartHighlight | null;
  };
  dispatch: {
    series: IHourChartSeries[];
    bands: IHourChartBand[];
    highlight: IHourChartHighlight | null;
  };
  dayPeakKw: number;
}

export interface IBacktestViewModel {
  answer: string;
  leadTiles: IBacktestTile[];
  secondaryTiles: IBacktestTile[];
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
