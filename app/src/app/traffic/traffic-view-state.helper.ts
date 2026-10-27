import { Observable, catchError, combineLatest, map, of, startWith } from 'rxjs';
import { ILoadForecast } from '@app/core/models';
import { IForecastViewState, ITrafficViewSources, ITrafficViewState } from './traffic.interfaces';
import { TrafficHelper } from './traffic.helper';

export class TrafficViewStateHelper {
  public static forecastFromSources(forecast$: Observable<ILoadForecast | null>): Observable<IForecastViewState> {
    return forecast$.pipe(
      map((forecast): IForecastViewState => {
        if (!forecast) {
          return { status: 'empty', forecast: null, errorMessage: '' };
        }

        return { status: 'ready', forecast, errorMessage: '' };
      }),
      catchError((error: unknown) => {
        console.error('Failed to build the load forecast', error);

        return of<IForecastViewState>({
          status: 'error',
          forecast: null,
          errorMessage: 'We could not build our forecast from the snapshot weather. The rest of the Traffic Report is unaffected.',
        });
      }),
      startWith<IForecastViewState>({ status: 'loading', forecast: null, errorMessage: '' }),
    );
  }

  public static fromSources(sources: ITrafficViewSources): Observable<ITrafficViewState> {
    return combineLatest([
      sources.manifest$,
      sources.history$,
      sources.priceHours$,
      sources.marginalSeries$,
      sources.averagePoints$,
      sources.score$,
    ]).pipe(
      map(([manifest, history, priceHours, marginalSeries, averagePoints, score]): ITrafficViewState => {
        if (!manifest || history.length === 0) {
          return { status: 'empty', manifest, report: null, errorMessage: '' };
        }

        return {
          status: 'ready',
          manifest,
          report: TrafficHelper.buildReport({ manifest, history, priceHours, marginalSeries, averagePoints, score }),
          errorMessage: '',
        };
      }),
      catchError((error: unknown) => {
        console.error('Failed to build the traffic report', error);

        return of<ITrafficViewState>({
          status: 'error',
          manifest: null,
          report: null,
          errorMessage: 'We could not build the traffic report from the grid snapshot. Check your connection and refresh the page.',
        });
      }),
      startWith<ITrafficViewState>({ status: 'loading', manifest: null, report: null, errorMessage: '' }),
    );
  }
}
