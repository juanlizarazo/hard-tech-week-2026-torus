import { Observable, catchError, combineLatest, of, startWith, switchMap } from 'rxjs';
import { IBacktestResult, IBacktestSnapshotSources } from '@app/core/backtest';
import { backtestScreenSettings } from './backtest.constants';
import { IBacktestControls, IBacktestViewState } from './backtest.interfaces';

export class BacktestViewStateHelper {
  public static fromSources(
    sources$: Observable<IBacktestSnapshotSources>,
    controls$: Observable<IBacktestControls>,
    run: (sources: IBacktestSnapshotSources, controls: IBacktestControls) => Observable<IBacktestResult>,
  ): Observable<IBacktestViewState> {
    return combineLatest([sources$, controls$]).pipe(
      switchMap(([sources, controls]): Observable<IBacktestViewState> => {
        if (!sources.manifest || !sources.gridMonth || !sources.marginalEmissions) {
          return of({ status: 'empty', result: null, errorMessage: '' });
        }

        return run(sources, controls).pipe(
          switchMap((result: IBacktestResult) => of<IBacktestViewState>({ status: 'ready', result, errorMessage: '' })),
          catchError((error: unknown) => BacktestViewStateHelper.failed(error)),
        );
      }),
      catchError((error: unknown) => BacktestViewStateHelper.failed(error)),
      startWith<IBacktestViewState>({ status: 'loading', result: null, errorMessage: '' }),
    );
  }

  private static failed(error: unknown): Observable<IBacktestViewState> {
    console.error('Failed to run the backtest', error);

    return of<IBacktestViewState>({
      status: 'error',
      result: null,
      errorMessage: backtestScreenSettings.ERROR_MESSAGE,
    });
  }
}
