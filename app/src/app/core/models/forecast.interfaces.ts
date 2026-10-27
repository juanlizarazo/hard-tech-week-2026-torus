import { IProvenance } from './provenance.interfaces';

export interface IForecastScore {
  mapePercent: number;
  biasPercent: number;
  peakUnderForecastRate: number;
  meanPeakMissMw: number;
  hoursScored: number;
  daysScored: number;
  startDate: string;
  endDate: string;
  provenance: IProvenance[];
}
