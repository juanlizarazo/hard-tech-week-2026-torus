import { Observable, catchError, combineLatest, map, of, startWith } from 'rxjs';
import { ITrafficViewSources, ITrafficViewState } from './traffic.interfaces';
import { TrafficHelper } from './traffic.helper';

export class TrafficViewStateHelper {
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
