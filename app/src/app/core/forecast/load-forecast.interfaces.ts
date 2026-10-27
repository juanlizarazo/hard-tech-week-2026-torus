import { MefSeason } from '../models/emissions.types';

export interface IWeightedWeatherHour {
  utcHourEnding: string;
  temperatureF: number;
  ghiWm2: number;
}

export interface IForecastFeatureRow {
  utcHourEnding: string;
  localDate: string;
  localHour: number;
  month: string;
  dayOfMonth: number;
  season: MefSeason;
  features: number[];
  demandMw: number | null;
  dayAheadForecastMw: number | null;
  forecastExcluded: boolean;
  lag168Mw: number;
}

export interface IResidualQuantile {
  q10: number;
  q90: number;
}

export interface IFeatureStats {
  means: number[];
  stds: number[];
}
