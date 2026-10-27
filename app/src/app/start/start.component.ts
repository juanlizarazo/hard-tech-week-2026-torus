import { Component, inject } from '@angular/core';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, catchError, combineLatest, map, of, startWith } from 'rxjs';
import { GridSignalsService, PlanningDayService, SnapshotService } from '@app/core';
import { DayRelationHelper } from '@app/shared/helpers';
import {
  AlertBannerComponent,
  ArchitectureComponent,
  NextStopComponent,
  TermComponent,
  ThreeClocksComponent,
  UnderTheHoodComponent
} from '@app/shared/components';
import { PlanHelper } from '../plan/plan.helper';
import { startSettings, startSteps } from './start.constants';
import { StartHelper } from './start.helper';
import { IStartStep, IStartViewState } from './start.interfaces';

@Component({
  selector: 'dt-start',
  imports: [AsyncPipe, DecimalPipe, RouterLink, MatIconModule, MatProgressSpinnerModule, AlertBannerComponent, ArchitectureComponent, NextStopComponent, TermComponent, ThreeClocksComponent, UnderTheHoodComponent],
  templateUrl: './start.component.html',
  styleUrl: './start.component.scss'
})
export class StartComponent {
  private readonly _snapshotService = inject(SnapshotService);
  private readonly _gridSignalsService = inject(GridSignalsService);
  private readonly _planningDayService = inject(PlanningDayService);

  public readonly hook = PlanHelper.hookNumbers();
  public readonly day$ = this._planningDayService.day$;
  public readonly seasonBridge$: Observable<string> = this.day$.pipe(map((day) => StartHelper.seasonBridge(day)));
  public readonly steps$: Observable<IStartStep[]> = this.day$.pipe(
    map((day) =>
      startSteps.map((step) => ({
        ...step,
        title: DayRelationHelper.phrase(step.title, day),
        question: DayRelationHelper.phrase(step.question, day),
        description: DayRelationHelper.phrase(step.description, day),
        linkLabel: DayRelationHelper.phrase(step.linkLabel, day)
      }))
    )
  );

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
