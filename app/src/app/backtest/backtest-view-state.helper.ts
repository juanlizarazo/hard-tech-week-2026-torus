import { Observable, catchError, combineLatest, concat, defer, map, of, startWith, switchMap, tap } from 'rxjs';
import { IBacktestResult, IBacktestSnapshotSources } from '@app/core/backtest';
import { backtestScreenSettings } from './backtest.constants';
import { IBacktestControls, IBacktestViewState } from './backtest.interfaces';

export class BacktestViewStateHelper {
  public static fromSources(
    sources$: Observable<IBacktestSnapshotSources>,
    controls$: Observable<IBacktestControls>,
    run: (sources: IBacktestSnapshotSources, controls: IBacktestControls) => Observable<IBacktestResult>,
  ): Observable<IBacktestViewState> {
    return defer(() => {
      let lastResult: IBacktestResult | null = null;

      return combineLatest([sources$, controls$]).pipe(
        switchMap(([sources, controls]): Observable<IBacktestViewState> => {
          if (!sources.manifest || !sources.gridMonth || !sources.marginalEmissions) {
            return of({ status: 'empty', result: null, errorMessage: '', isReplaying: false });
          }

          const replaying$ = of<IBacktestViewState>({
            status: lastResult ? 'ready' : 'loading',
            result: lastResult,
            errorMessage: '',
            isReplaying: true,
          });
          const ready$ = run(sources, controls).pipe(
            tap((result: IBacktestResult) => (lastResult = result)),
            map((result: IBacktestResult): IBacktestViewState => ({ status: 'ready', result, errorMessage: '', isReplaying: false })),
            catchError((error: unknown) => BacktestViewStateHelper.failed(error)),
          );

          return concat(replaying$, ready$);
        }),
        catchError((error: unknown) => BacktestViewStateHelper.failed(error)),
        startWith<IBacktestViewState>({ status: 'loading', result: null, errorMessage: '', isReplaying: true }),
      );
    });
  }

  private static failed(error: unknown): Observable<IBacktestViewState> {
    console.error('Failed to run the backtest', error);

    return of<IBacktestViewState>({
      status: 'error',
      result: null,
      errorMessage: backtestScreenSettings.ERROR_MESSAGE,
      isReplaying: false,
    });
  }
}
