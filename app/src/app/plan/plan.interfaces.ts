import {
  IBillBreakdown,
  IPlanResult,
  IRushHourWindow,
  ISiteArchetype,
  ProvenanceKind,
  TariffScheduleId,
  TariffSeason
} from '@app/core/models';
import { ISiteLoadStats } from '@app/core/sites';
import { PeakSoFarMode, PlanDateMode } from './plan.types';

export interface IAssetRow {
  label: string;
  value: string;
  kind: ProvenanceKind;
  note: string;
}

export interface IPlanSiteCard {
  archetype: ISiteArchetype;
  scheduleName: string;
  julyStats: ISiteLoadStats;
  julyBill: IBillBreakdown;
  spinRows: IAssetRow[];
  pulseRows: IAssetRow[];
}

export interface IPlanControls {
  siteId: string;
  dateMode: PlanDateMode;
  scheduleId: TariffScheduleId;
  peakSoFarMode: PeakSoFarMode;
  co2WeightPerKg: number;
  wattsmartReserveKwh: number;
}

export interface IPlanDateContext {
  dateMode: PlanDateMode;
  date: string;
  gridHours: Detour.Firestore.Snapshot.IGridHour[];
  priceHours: Detour.Firestore.Snapshot.IPriceHour[];
  rushHourWindows: IRushHourWindow[];
}

export interface IPlanTile {
  id: string;
  label: string;
  value: string;
  detail: string;
  source: string;
  tone: 'good' | 'bad' | 'neutral';
}

export interface IBillLineDelta {
  id: string;
  label: string;
  baseline: number;
  planned: number;
  change: number;
}

export interface IPlanViewModel {
  controls: IPlanControls;
  date: string;
  dateLabel: string;
  result: IPlanResult;
  tiles: IPlanTile[];
  billLines: IBillLineDelta[];
  edamPricePerMwh: (number | null)[];
  demandLabel: string;
  billCaption: string;
  carbonCaption: string;
  mefIsPlaceholder: boolean;
  pulseMinSocKwh: number;
  pulseMaxSocKwh: number;
  spinMaxSocKwh: number;
  reserveFloorKwh: number;
  maxReserveKwh: number;
  solveLabel: string;
  answer: string;
  fleetLine: string;
  lpStatsLine: string;
  billTableCaption: string;
  notices: IPlanNotices;
}

export interface IPlanSolveState {
  status: 'solving' | 'ready' | 'error';
  viewModel: IPlanViewModel | null;
  errorMessage: string;
  isStale?: boolean;
}

export interface IPlanHook {
  title: string;
  subtitle: string;
}

export interface IPlanHookNumbers {
  season: TariffSeason;
  demandRateLabel: string;
  spreadLabel: string;
  equivalentKwh: number;
  roundedKwh: number;
}

export interface IPlanNotices {
  clocks: string;
  load: string;
  dispatch: string;
}

export interface IPlanParsedValue {
  amount: number;
  unit: string;
  isMoney: boolean;
}

export interface IPlanTileDelta {
  text: string;
  direction: 'up' | 'down';
}

export interface IPlanDeltaState {
  deltas: Record<string, IPlanTileDelta>;
  isUnchanged: boolean;
}

export interface IPlanForecastPeak {
  hour: number;
  forecastMw: number;
}
