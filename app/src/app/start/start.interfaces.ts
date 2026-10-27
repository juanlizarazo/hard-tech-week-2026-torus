import { IPlanInterval, IRushHourWindow } from '@app/core/models';

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
  status: 'loading' | 'empty' | 'error' | 'ready';
  preview: IStartPreview | null;
  errorMessage: string;
}

export interface IStartStep {
  path: string;
  step: string;
  title: string;
  question: string;
  description: string;
  linkLabel: string;
}
