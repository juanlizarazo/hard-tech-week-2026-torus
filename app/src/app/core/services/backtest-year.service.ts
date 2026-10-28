import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, of, shareReplay } from 'rxjs';
import { IBacktestYear } from '../backtest/backtest.interfaces';

@Injectable({ providedIn: 'root' })
export class BacktestYearService {
  private readonly _http = inject(HttpClient);

  public readonly year$: Observable<IBacktestYear | null> = this._http.get<IBacktestYear>('/data/backtest-year.json').pipe(
    catchError((error: unknown) => {
      console.error('Failed to load the year summary', error);

      return of(null);
    }),
    shareReplay(1),
  );
}
