import { Observable } from 'rxjs';
import { MefSeason } from '@app/core/models/emissions.types';
import { IAverageEmissionsPoint, IForecastScore, ILoadForecast, IMarginalEmissionsSeries, IRushHourWindow } from '@app/core/models';
import { IHourChartBand, IHourChartHighlight, IHourChartSeries } from '@app/shared/components/hour-chart/hour-chart.interfaces';
import { TrafficViewStatus } from './traffic.types';
import { IRankSlopeRow } from './components/rank-slope/rank-slope.interfaces';

export interface ITrafficLoadWindow {
  xLabels: string[];
  actualLoadMw: (number | null)[];
  actualNetLoadMw: (number | null)[];
  forecastMw: (number | null)[];
  estimatedNetLoadMw: (number | null)[];
  targetStartIndex: number;
  dividerIndices: number[];
}

export interface ITrafficHour {
  hour: number;
  forecastMw: number | null;
  estimatedNetLoadMw: number | null;
  lmp: number | null;
  mefFossilLbPerMwh: number | null;
  mefFossilLowLbPerMwh: number | null;
  mefFossilHighLbPerMwh: number | null;
  mefDemandLbPerMwh: number | null;
  mefDemandLowLbPerMwh: number | null;
  mefDemandHighLbPerMwh: number | null;
  averageLbPerMwh: number | null;
}

export interface IRushHourHour {
  hour: number;
  clocks: string[];
}

export interface IRushHourBand {
  startHour: number;
  endHourExclusive: number;
  hours: IRushHourHour[];
}

export interface ITrafficInsights {
  headline: string;
  sentences: string[];
}

export interface ITrafficRange {
  minLbPerMwh: number;
  maxLbPerMwh: number;
  meanLbPerMwh: number;
}

export interface ITrafficInputs {
  manifest: Detour.Firestore.Snapshot.IManifest;
  history: Detour.Firestore.Snapshot.IGridHour[];
  priceHours: Detour.Firestore.Snapshot.IPriceHour[];
  marginalSeries: IMarginalEmissionsSeries[];
  averagePoints: IAverageEmissionsPoint[];
  score: IForecastScore;
}

export interface ITrafficReport {
  targetDate: string;
  targetDateLabel: string;
  season: MefSeason;
  peakMissLabel: string;
  load: ITrafficLoadWindow;
  hours: ITrafficHour[];
  hasPrices: boolean;
  hourLabels: string[];
  rushHour: IRushHourBand | null;
  paceRush: IRushHourWindow | null;
  ranking: IRankSlopeRow[];
  insights: ITrafficInsights;
  fossilRange: ITrafficRange | null;
  demandRange: ITrafficRange | null;
  score: IForecastScore;
  marginalSeries: IMarginalEmissionsSeries[];
}

export interface ITrafficViewState {
  status: TrafficViewStatus;
  manifest: Detour.Firestore.Snapshot.IManifest | null;
  report: ITrafficReport | null;
  errorMessage: string;
}

export interface ITrafficChart {
  series: IHourChartSeries[];
  bands: IHourChartBand[];
  highlight: IHourChartHighlight | null;
  xLabels: string[];
  dividerIndices: number[];
  estimateFromIndex: number | null;
}

export interface ITrafficCharts {
  load: ITrafficChart;
  price: ITrafficChart;
  carbon: ITrafficChart;
}

export interface ITrafficViewSources {
  manifest$: Observable<Detour.Firestore.Snapshot.IManifest | null>;
  history$: Observable<Detour.Firestore.Snapshot.IGridHour[]>;
  priceHours$: Observable<Detour.Firestore.Snapshot.IPriceHour[]>;
  marginalSeries$: Observable<IMarginalEmissionsSeries[]>;
  averagePoints$: Observable<IAverageEmissionsPoint[]>;
  score$: Observable<IForecastScore>;
}

export interface IForecastViewState {
  status: TrafficViewStatus;
  forecast: ILoadForecast | null;
  errorMessage: string;
}

export interface ITrafficChartOptions {
  showAllDays: boolean;
  showOurForecast: boolean;
  showUncertainty: boolean;
}

export interface ITrafficNotices {
  load: string;
  price: string;
  carbon: string;
  ranking: string;
}

export interface ITrafficHourValue {
  hour: number;
  value: number;
}
