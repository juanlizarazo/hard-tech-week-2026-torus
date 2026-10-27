import { Observable, catchError, map, of, startWith } from 'rxjs';
import { ISnapshotViewState } from '../interfaces/snapshot-view-state.interfaces';

export class SnapshotViewStateHelper {
  public static fromManifest(
    manifest$: Observable<Detour.Firestore.Snapshot.IManifest | null>
  ): Observable<ISnapshotViewState> {
    return manifest$.pipe(
      map(
        (manifest): ISnapshotViewState => ({
          status: manifest ? 'ready' : 'empty',
          manifest,
          errorMessage: ''
        })
      ),
      catchError(() =>
        of<ISnapshotViewState>({
          status: 'error',
          manifest: null,
          errorMessage: 'We could not load the grid snapshot. Check your connection and refresh the page.'
        })
      ),
      startWith<ISnapshotViewState>({ status: 'loading', manifest: null, errorMessage: '' })
    );
  }
}
