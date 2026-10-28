import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, combineLatest, map, of, shareReplay, startWith } from 'rxjs';
import { GridSignalsService } from '@app/core';
import { plantMapSettings } from './plant-map.constants';
import { PlantMapHelper } from './plant-map.helper';
import { IPacePlantsFile, IPaceStatesFile, IPlantMapState, IRushTrack } from './plant-map.interfaces';

@Injectable({ providedIn: 'root' })
export class PlantMapDataService {
  private readonly _httpClient = inject(HttpClient);
  private readonly _gridSignalsService = inject(GridSignalsService);
  private readonly _plants$ = this._httpClient.get<IPacePlantsFile>(plantMapSettings.PLANTS_URL).pipe(shareReplay(1));
  private readonly _states$ = this._httpClient.get<IPaceStatesFile>(plantMapSettings.STATES_URL).pipe(shareReplay(1));

  public state$(
    weatherPoints$: Observable<Detour.Firestore.Snapshot.IWeatherPoint[]>,
    rushTrack$: Observable<IRushTrack>
  ): Observable<IPlantMapState> {
    return combineLatest([this._plants$, this._states$, this._gridSignalsService.recentHistory$, weatherPoints$, rushTrack$]).pipe(
      map(([plantsFile, statesFile, history, weatherPoints, rushTrack]): IPlantMapState => {
        const data = PlantMapHelper.build(plantsFile, statesFile, history, weatherPoints, rushTrack);

        return { status: data ? 'ready' : 'empty', data, errorMessage: '' };
      }),
      startWith<IPlantMapState>({ status: 'loading', data: null, errorMessage: '' }),
      catchError((error) => {
        console.error('Failed to load the PACE plant map', error);

        return of<IPlantMapState>({ status: 'error', data: null, errorMessage: "The power-plant map couldn't load. The charts below still work." });
      }),
      shareReplay(1)
    );
  }
}
