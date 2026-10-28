import { Injectable, inject } from '@angular/core';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Observable, catchError, combineLatest, defer, finalize, from, map, of, shareReplay, switchMap, tap, timeout } from 'rxjs';
import { IDerivedSignals } from '../models';
import { LoadingService } from './loading.service';
import { ISnapshotResolution, ISnapshotStatus } from './snapshot.interfaces';

const derivedReadTimeoutMs = 3000;

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

  private readonly _resolution$: Observable<ISnapshotResolution> = defer(() => {
    this._loadingService.show();

    return this.pointer$.pipe(
      switchMap((pointer) => from(this._resolveManifest(pointer))),
      tap({ error: (error) => console.error('Failed to load snapshot manifest', error) }),
      finalize(() => this._loadingService.hide())
    );
  }).pipe(shareReplay(1));

  public readonly manifest$: Observable<Detour.Firestore.Snapshot.IManifest | null> = this._resolution$.pipe(
    map((resolution) => resolution.manifest),
    shareReplay(1)
  );

  public readonly derived$: Observable<IDerivedSignals | null> = this.manifest$.pipe(
    switchMap((manifest) => {
      if (!manifest) {
        return of(null);
      }

      return from(getDoc(doc(this._firestore, `snapshots/${manifest.id}/derived/signals`))).pipe(
        timeout({ first: derivedReadTimeoutMs }),
        map((snapshot) => (snapshot.exists() ? (snapshot.data() as IDerivedSignals) : null)),
        catchError((error: unknown) => {
          console.error('Failed to load derived signals, computing locally', error);

          return of(null);
        })
      );
    }),
    shareReplay(1)
  );

  public readonly status$: Observable<ISnapshotStatus> = combineLatest([this.pointer$, this._resolution$]).pipe(
    map(([pointer, resolution]): ISnapshotStatus => {
      const lastRun = pointer?.lastRun ?? null;
      const isLastRunUnhealthy = lastRun?.status === 'rejected' || lastRun?.status === 'failed';
      const pinnedSnapshotId = pointer?.pinnedSnapshotId ?? null;

      return {
        ...resolution,
        lastRun,
        pinnedSnapshotId,
        isPinned: pinnedSnapshotId !== null && pinnedSnapshotId === resolution.manifest?.id,
        isShowingLastGood: resolution.isFallback || isLastRunUnhealthy
      };
    }),
    shareReplay(1)
  );

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

  private async _tryLoadManifest(snapshotId: string): Promise<Detour.Firestore.Snapshot.IManifest | null> {
    try {
      return await this._loadManifestById(snapshotId);
    } catch (error) {
      console.error(`Failed to load snapshot ${snapshotId}`, error);

      return null;
    }
  }

  private async _resolveManifest(pointer: Detour.Firestore.Snapshot.IPointer | null): Promise<ISnapshotResolution> {
    if (!pointer) {
      return { manifest: null, requestedSnapshotId: null, isFallback: false };
    }

    const requestedSnapshotId = pointer.pinnedSnapshotId ?? pointer.currentSnapshotId;
    const fallbackIds = [
      ...(pointer.lastGoodSnapshotIds ?? []),
      pointer.currentSnapshotId,
      pointer.previousSnapshotId
    ].filter((snapshotId, index, snapshotIds): snapshotId is string =>
      Boolean(snapshotId) && snapshotId !== requestedSnapshotId && snapshotIds.indexOf(snapshotId) === index
    );

    for (const snapshotId of [requestedSnapshotId, ...fallbackIds]) {
      const manifest = await this._tryLoadManifest(snapshotId);

      if (manifest) {
        return { manifest, requestedSnapshotId, isFallback: snapshotId !== requestedSnapshotId };
      }
    }

    return { manifest: null, requestedSnapshotId, isFallback: false };
  }
}
