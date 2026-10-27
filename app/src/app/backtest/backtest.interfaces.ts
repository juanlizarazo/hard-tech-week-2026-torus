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
  barFraction: number;
  isPeakDay: boolean;
  isSelected: boolean;
}

export interface IComponentBar {
  strategyId: string;
  strategyLabel: string;
  colorIndex: number;
  savings: number;
}

export interface IComponentBarGroup {
  id: string;
  label: string;
  baselineAmount: number;
  source: IProvenance;
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
  label: string;
  value: string;
  hint: string;
  source: IProvenance;
}

export interface IBacktestCycleRow {
  strategyId: string;
  strategyLabel: string;
  colorIndex: number;
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
  lead: string;
  tiles: IBacktestTile[];
  monthLabel: string;
  peakLabel: string;
  calendarCells: IMonthCalendarCell[];
  barGroups: IComponentBarGroup[];
  legend: { id: string; label: string; colorIndex: number }[];
  cycleRows: IBacktestCycleRow[];
  dayCharts: IBacktestDayCharts;
  sourceRows: IProvenance[];
  isCapturePending: boolean;
}
