import { IPlanInterval, IRushHourWindow } from '@app/core/models';
import { DispatchOrderAction, DispatchOrderAsset } from './dispatch-orders.types';

export interface IDispatchOrdersInput {
  date: string;
  siteName: string;
  seed: number;
  scheduleLabel: string;
  intervals: IPlanInterval[];
  rushHourWindows: IRushHourWindow[];
  isOnPeakBasis: boolean;
  demandRatePerKw: number;
  wattsmartReserveKwh: number;
  reserveFloorKwh: number;
  pulseMinSocKwh: number;
  pulseMaxSocKwh: number;
  spinWearPerKwh: number;
  pulseWearPerKwh: number;
}

export interface IDispatchOrder {
  id: string;
  number: string;
  action: DispatchOrderAction;
  actionLabel: string;
  asset: DispatchOrderAsset;
  assetLabel: string;
  startUtc: string;
  endUtc: string;
  timeRange: string;
  amount: string;
  why: string;
}

export interface IDispatchSheet {
  input: IDispatchOrdersInput;
  dateLabel: string;
  isTargetDay: boolean;
  revision: number;
  dayIntervals: IPlanInterval[];
  orders: IDispatchOrder[];
  fileName: string;
}

export interface IDispatchRun {
  startIndex: number;
  endIndex: number;
}

export interface IDispatchApproval {
  approvedAtLabel: string;
  revision: number;
}
