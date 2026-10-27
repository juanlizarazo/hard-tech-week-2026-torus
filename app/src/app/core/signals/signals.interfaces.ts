import { MefSeason } from '../models/emissions.types';

export interface IEmissionsRow {
  utcMs: number;
  localDate: string;
  localHour: number;
  season: MefSeason;
  demandMw: number | null;
  fossilMw: number | null;
  emissionsLbPerHour: number | null;
  generationMw: number | null;
}

export interface IRegressionResult {
  slope: number;
  intercept: number;
  slopeStandardError: number;
  n: number;
}

export interface IScoredHour {
  localDate: string;
  demandMw: number;
  forecastMw: number;
}
