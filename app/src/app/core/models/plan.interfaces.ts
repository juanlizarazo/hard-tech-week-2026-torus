import { TariffScheduleId } from './tariff.types';
import { IBillBreakdown } from './tariff.interfaces';

export interface IPlanRequest {
  siteId: string;
  scheduleId: TariffScheduleId;
  date: string;
  horizonDays: number;
  co2WeightPerKg: number;
  wattsmartReserveKwh: number;
  peakSoFarOnPeakKw: number;
  peakSoFarAllHoursKw: number;
  initialSpinSocKwh: number;
  initialPulseSocKwh: number;
}

export interface IPlanInterval {
  startUtc: string;
  loadKw: number;
  gridKw: number;
  spinChargeKw: number;
  spinDischargeKw: number;
  pulseChargeKw: number;
  pulseDischargeKw: number;
  spinSocKwh: number;
  pulseSocKwh: number;
  isOnPeak: boolean;
  energyPricePerKwh: number;
  marginalKgCo2PerKwh: number;
}

export interface IRushHourWindow {
  startUtc: string;
  endUtc: string;
  startLocalHour: number;
  endLocalHour: number;
  isAssumption: boolean;
}

export interface IPlanMetrics {
  baselineCo2Kg: number;
  plannedCo2Kg: number;
  baselineRushHourKwh: number;
  plannedRushHourKwh: number;
  trafficAvoidedKwh: number;
  rushHourWindows: IRushHourWindow[];
  wattsmartHeldKwh: number;
  spinThroughputKwh: number;
  pulseThroughputKwh: number;
  objectiveValue: number;
}

export interface IPlanResult {
  request: IPlanRequest;
  status: 'optimal' | 'infeasible' | 'error';
  intervals: IPlanInterval[];
  demandKw: number;
  baselineBill: IBillBreakdown;
  plannedBill: IBillBreakdown;
  lpText: string;
  solveMs: number;
  metrics?: IPlanMetrics;
  errorMessage?: string;
}
