export interface ISignalRow {
  key: string;
  label: string;
  values: (number | null)[];
  color: string;
  format: (value: number) => string;
}

export interface ISignalRowView {
  key: string;
  label: string;
  color: string;
  linePath: string;
  areaPath: string;
  valueText: string;
}

export interface ISignalPoint {
  x: number;
  y: number;
}
