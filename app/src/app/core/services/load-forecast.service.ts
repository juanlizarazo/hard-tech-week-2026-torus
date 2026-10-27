import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';
import { LoadForecastHelper } from '../forecast/load-forecast.helper';
import { ILoadForecast } from '../models';
import { GridSignalsService } from './grid-signals.service';
import { SnapshotService } from './snapshot.service';

@Injectable({ providedIn: 'root' })
export class LoadForecastService {
  private readonly _snapshotService = inject(SnapshotService);
  private readonly _gridSignalsService = inject(GridSignalsService);

  public readonly forecast$: Observable<ILoadForecast | null> = this._snapshotService.manifest$.pipe(
    switchMap((manifest) => {
      if (!manifest || !manifest.weatherMonths || manifest.weatherMonths.length === 0) {
        return of(null);
      }

      return forkJoin([
        this._gridSignalsService.history$,
        forkJoin(manifest.weatherMonths.map((entry) => this._snapshotService.getWeatherMonth(entry.month))),
      ]).pipe(
        map(([gridHours, weatherMonths]) => {
          const weatherHours = weatherMonths.flatMap((month) => (month ? month.hours : []));

          return LoadForecastHelper.build(
            gridHours,
            weatherHours,
            manifest.targetDate,
            manifest.weatherPulledAt ? manifest.weatherPulledAt.toDate().toISOString() : '',
          );
        }),
      );
    }),
    shareReplay(1),
  );
}
