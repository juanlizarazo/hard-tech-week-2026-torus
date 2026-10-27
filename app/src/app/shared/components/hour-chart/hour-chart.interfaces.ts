export type HourChartLineStyle = 'solid' | 'dashed' | 'dotted';

export interface IHourChartSeries {
  label: string;
  values: (number | null)[];
  style: HourChartLineStyle;
  color: string;
}

export interface IHourChartBand {
  label: string;
  lower: (number | null)[];
  upper: (number | null)[];
  color: string;
}

export interface IHourChartHighlight {
  startIndex: number;
  endIndex: number;
  label: string;
}

export interface IHourChartTick {
  position: number;
  label: string;
}

export interface IHourChartPath {
  key: string;
  label: string;
  color: string;
  dashArray: string;
  opacity: number;
  path: string;
}

export interface IHourChartBandPath {
  label: string;
  color: string;
  path: string;
}

export interface IHourChartLegendItem {
  label: string;
  color: string;
  dashArray: string;
  isBand: boolean;
}

export interface IHourChartTooltipRow {
  label: string;
  color: string;
  dashArray: string;
  isBand: boolean;
  text: string;
}

export interface IHourChartTableRow {
  xLabel: string;
  cells: string[];
}
