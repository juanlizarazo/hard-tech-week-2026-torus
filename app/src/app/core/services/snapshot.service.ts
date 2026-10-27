import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Observable, defer, finalize, from, map, shareReplay, switchMap, tap } from 'rxjs';
import { LoadingService } from './loading.service';

@Injectable({ providedIn: 'root' })
export class SnapshotService {
  private readonly _firestore = inject(Firestore);
  private readonly _loadingService = inject(LoadingService);
  private readonly _gridMonthCache = new Map<string, Observable<Detour.Firestore.Snapshot.IGridMonth | null>>();
  private readonly _priceMonthCache = new Map<string, Observable<Detour.Firestore.Snapshot.IPriceMonth | null>>();
  private readonly _weatherMonthCache = new Map<string, Observable<Detour.Firestore.Snapshot.IWeatherMonth | null>>();

  public readonly pointer$: Observable<Detour.Firestore.Snapshot.IPointer | null> = defer(() =>
    from(getDoc(doc(this._firestore, 'config/snapshot')))
  ).pipe(
    map((snapshot) => (snapshot.exists() ? (snapshot.data() as Detour.Firestore.Snapshot.IPointer) : null)),
    shareReplay(1)
  );

  public readonly manifest$: Observable<Detour.Firestore.Snapshot.IManifest | null> = defer(() => {
    this._loadingService.show();

    return this.pointer$.pipe(
      switchMap((pointer) => this._loadManifest(pointer)),
      tap({ error: (error) => console.error('Failed to load snapshot manifest', error) }),
      finalize(() => this._loadingService.hide())
    );
  }).pipe(shareReplay(1));

  public getGridMonth(month: string): Observable<Detour.Firestore.Snapshot.IGridMonth | null> {
    return this._cached(this._gridMonthCache, month, 'gridMonths');
  }

  public getPriceMonth(month: string): Observable<Detour.Firestore.Snapshot.IPriceMonth | null> {
    return this._cached(this._priceMonthCache, month, 'priceMonths');
  }

  public getWeatherMonth(month: string): Observable<Detour.Firestore.Snapshot.IWeatherMonth | null> {
    return this._cached(this._weatherMonthCache, month, 'weatherMonths');
  }

  private _cached<T>(cache: Map<string, Observable<T | null>>, month: string, collectionName: string): Observable<T | null> {
    const existing = cache.get(month);

    if (existing) {
      return existing;
    }

    const request$ = this.manifest$.pipe(
      switchMap((manifest) => {
        if (!manifest) {
          return from([null]);
        }

        return from(getDoc(doc(this._firestore, `snapshots/${manifest.id}/${collectionName}/${month}`))).pipe(
          map((snapshot) => (snapshot.exists() ? (snapshot.data() as T) : null))
        );
      }),
      tap({ error: (error) => console.error(`Failed to load ${collectionName} ${month}`, error) }),
      shareReplay(1)
    );
    cache.set(month, request$);

    return request$;
  }

  private async _loadManifestById(snapshotId: string): Promise<Detour.Firestore.Snapshot.IManifest | null> {
    const snapshot = await getDoc(doc(this._firestore, `snapshots/${snapshotId}`));

    return snapshot.exists() ? ({ ...snapshot.data(), id: snapshot.id } as Detour.Firestore.Snapshot.IManifest) : null;
  }

  private _loadManifest(pointer: Detour.Firestore.Snapshot.IPointer | null): Observable<Detour.Firestore.Snapshot.IManifest | null> {
    if (!pointer) {
      return from([null]);
    }

    return from(
      this._loadManifestById(pointer.currentSnapshotId).then((current) => {
        if (current || !pointer.previousSnapshotId) {
          return current;
        }

        return this._loadManifestById(pointer.previousSnapshotId);
      })
    );
  }
}
