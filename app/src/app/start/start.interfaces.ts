import { IPlanInterval, IRushHourWindow } from '@app/core/models';
import { IPlantMapData, IPlantMapHourView } from '../traffic/components/plant-map/plant-map.interfaces';
import { StartViewStatus } from './start.types';

export interface IStartPreview {
  targetDate: string;
  dateLabel: string;
  intervals: IPlanInterval[];
  edamPricePerMwh: (number | null)[];
  rushHourWindows: IRushHourWindow[];
  rushLabel: string;
  rushIsAssumption: boolean;
  billCaption: string;
  carbonCaption: string;
  mefIsPlaceholder: boolean;
}

export interface IStartViewState {
  status: StartViewStatus;
  preview: IStartPreview | null;
  errorMessage: string;
}

export interface IStartTile {
  path: string;
  code: string;
  stage: string;
  figure: string;
  unit: string;
  caption: string;
  isMuted: boolean;
}

export interface IStartScene {
  data: IPlantMapData | null;
  hourView: IPlantMapHourView | null;
}
