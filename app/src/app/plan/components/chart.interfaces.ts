export interface ILinearScale {
  domainMin: number;
  domainMax: number;
  rangeMin: number;
  rangeMax: number;
}

export interface IChartMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface IHourTick {
  x: number;
  label: string;
  dayLabel: string;
  isMidnight: boolean;
}

export interface IValueTick {
  y: number;
  label: string;
}

export interface IWindowRange {
  x0: number;
  x1: number;
  label: string;
  labelX: number;
  labelAnchor: 'start' | 'end';
}

export interface IRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface IFilledRect extends IRect {
  fill: string;
}

export interface IIndexRun {
  startIndex: number;
  endIndex: number;
}

export interface ILocalTimeParts {
  hour: number;
  minute: number;
  weekday: string;
  day: number;
}

export interface ITooltipRow {
  label: string;
  value: string;
  swatch: string;
}

export interface IChartTooltip {
  title: string;
  rows: ITooltipRow[];
  leftPercent: number;
  alignRight: boolean;
}
