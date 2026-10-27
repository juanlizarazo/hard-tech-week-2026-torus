import { IComponentBar, IComponentBarGroup } from '../../backtest.interfaces';

export interface IComponentBarLegendItem {
  id: string;
  label: string;
  colorIndex: number;
}

export interface IComponentBarRow {
  bar: IComponentBar;
  startPercent: number;
  lengthPercent: number;
  isNegative: boolean;
}

export interface IComponentBarGroupView {
  group: IComponentBarGroup;
  rows: IComponentBarRow[];
}
