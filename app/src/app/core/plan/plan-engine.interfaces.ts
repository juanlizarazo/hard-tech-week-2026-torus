import { IInterval, IPlanRequest, IRushHourWindow, IStationAssets, ITariffSchedule } from '../models';

export interface ILpInput {
  request: IPlanRequest;
  schedule: ITariffSchedule;
  assets: IStationAssets;
  intervals: IInterval[];
  loadKw: number[];
  onPeakMask: boolean[];
  energyPricePerKwh: number[];
  marginalKgCo2PerKwh: number[];
  rushHourMask: boolean[];
  rushHourWindows: IRushHourWindow[];
  monthToDateIntervals: IInterval[];
  monthToDateLoadKw: number[];
}

export interface ILpModel {
  lpText: string;
  columnNames: string[];
}

export interface ILpTerm {
  coefficient: number;
  variable: string;
}

export interface IMonthToDate {
  intervals: IInterval[];
  loadKw: number[];
}
