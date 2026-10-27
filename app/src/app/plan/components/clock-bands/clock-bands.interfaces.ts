import { IFilledRect, IRect } from '../chart.interfaces';

export interface IClockLane {
  title: string;
  caption: string;
  titleX: number;
  titleY: number;
  stripY: number;
  captionX: number;
  captionY: number;
}

export interface IHeatLegend {
  visible: boolean;
  x: number;
  y: number;
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
