import { IComponentBar, IComponentBarGroup } from '../../backtest.interfaces';

export interface IComponentBarRow {
  bar: IComponentBar;
  startPercent: number;
  lengthPercent: number;
  isNegative: boolean;
  offsetPercent: number;
  scale: number;
}

export interface IComponentBarGroupView {
  group: IComponentBarGroup;
  rows: IComponentBarRow[];
}
