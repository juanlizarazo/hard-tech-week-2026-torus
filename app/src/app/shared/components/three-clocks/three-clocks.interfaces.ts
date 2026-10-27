import { IFilledRect, IRect } from '../../charts/chart.interfaces';

export interface IClockLane {
  title: string;
  caption: string;
  titleX: number;
  titleY: number;
  stripY: number;
}

export interface IHeatLegend {
  visible: boolean;
  minLabel: string;
  maxLabel: string;
}

export interface ILabeledRect extends IRect {
  label: string;
}

export interface IHeatLaneView {
  lane: IClockLane;
  cells: IFilledRect[];
  gaps: ILabeledRect[];
  legend: IHeatLegend;
}
