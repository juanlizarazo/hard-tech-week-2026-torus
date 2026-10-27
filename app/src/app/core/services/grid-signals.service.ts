import { Injectable, inject } from '@angular/core';
import { Observable, defer, finalize, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';
import { EmissionsHelper } from '../signals/emissions.helper';
import { ForecastScoreHelper } from '../signals/forecast-score.helper';
import { LoadingService } from './loading.service';
import { SnapshotService } from './snapshot.service';

@Injectable({ providedIn: 'root' })
export class GridSignalsService {
  private readonly _snapshotService = inject(SnapshotService);
  private readonly _loadingService = inject(LoadingService);

  public readonly history$ = defer(() => {
    this._loadingService.show();

    return this._snapshotService.manifest$.pipe(
      switchMap((manifest) => {
        if (!manifest || manifest.gridMonths.length === 0) {
          return of([]);
        }

        return forkJoin(manifest.gridMonths.map((entry) => this._snapshotService.getGridMonth(entry.month)));
      }),
      map((months) =>
        months
          .flatMap((month) => (month ? month.hours : []))
          .sort((first, second) => first.utcHourEnding.localeCompare(second.utcHourEnding))
      ),
      finalize(() => this._loadingService.hide())
    );
  }).pipe(shareReplay(1));

  public readonly marginalEmissions$ = this.history$.pipe(
    map((hours) => {
      const rows = EmissionsHelper.buildRows(hours);

      return [EmissionsHelper.marginalSeries(rows, 'fossil-generation'), EmissionsHelper.marginalSeries(rows, 'demand')];
    }),
    shareReplay(1)
  );

  public readonly averageEmissions$ = this.history$.pipe(
    map((hours) => EmissionsHelper.averageIntensity(EmissionsHelper.buildRows(hours))),
    shareReplay(1)
  );

  public readonly forecastScore$ = this.history$.pipe(
    map((hours) => ForecastScoreHelper.score(hours)),
    shareReplay(1)
  );

  public readonly targetPriceHours$ = this._snapshotService.manifest$.pipe(
    switchMap((manifest) => {
      if (!manifest) {
        return of(null);
      }

      return this._snapshotService.getPriceMonth(manifest.targetDate.slice(0, 7));
    }),
    map((month) => (month ? month.hours : [])),
    shareReplay(1)
  );
}
