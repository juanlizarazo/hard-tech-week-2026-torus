import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, catchError, combineLatest, map, of, startWith } from 'rxjs';
import { GridSignalsService, SnapshotService } from '@app/core';
import { AlertBannerComponent, TermComponent, ThreeClocksComponent } from '@app/shared/components';
import { PlanHelper } from '../plan/plan.helper';
import { startSettings, startSteps } from './start.constants';
import { StartHelper } from './start.helper';
import { IStartViewState } from './start.interfaces';

@Component({
  selector: 'dt-start',
  imports: [AsyncPipe, RouterLink, MatIconModule, MatProgressSpinnerModule, AlertBannerComponent, TermComponent, ThreeClocksComponent],
  templateUrl: './start.component.html',
  styleUrl: './start.component.scss'
})
export class StartComponent {
  private readonly _snapshotService = inject(SnapshotService);
  private readonly _gridSignalsService = inject(GridSignalsService);

  public readonly hook = PlanHelper.hookNumbers();
  public readonly steps = startSteps;

  public readonly state$: Observable<IStartViewState> = combineLatest([
    this._snapshotService.manifest$,
    this._gridSignalsService.history$,
    this._gridSignalsService.targetPriceHours$,
    this._gridSignalsService.marginalEmissions$
  ]).pipe(
    map(([manifest, history, priceHours, marginalSeries]): IStartViewState => {
      if (!manifest || history.length === 0) {
        return { status: 'empty', preview: null, errorMessage: startSettings.EMPTY_MESSAGE };
      }

      const fossilSeries = marginalSeries.find((series) => series.method === 'fossil-generation');

      return {
        status: 'ready',
        preview: StartHelper.preview(manifest.targetDate, history, priceHours, fossilSeries),
        errorMessage: ''
      };
    }),
    catchError((error: unknown) => {
      console.error('Failed to build the start preview', error);

      return of<IStartViewState>({ status: 'error', preview: null, errorMessage: startSettings.ERROR_MESSAGE });
    }),
    startWith<IStartViewState>({ status: 'loading', preview: null, errorMessage: '' })
  );
}
