import { Component, Input, OnDestroy, inject } from '@angular/core';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BehaviorSubject, Observable, Subscription, catchError, combineLatest, interval, map, of, shareReplay, startWith } from 'rxjs';
import { GridSignalsService } from '@app/core';
import { IRushHourWindow } from '@app/core/models';
import { AlertBannerComponent, ChartFrameComponent, SourceChipComponent } from '@app/shared/components';
import { mapFuels, plantMapLayout, plantMapSettings } from './plant-map.constants';
import { PlantMapHelper } from './plant-map.helper';
import { IPacePlantsFile, IPaceStatesFile, IPlantMapHourView, IPlantMapState, IRushTrack } from './plant-map.interfaces';

@Component({
  selector: 'dt-plant-map',
  imports: [AsyncPipe, DecimalPipe, MatProgressSpinnerModule, AlertBannerComponent, ChartFrameComponent, SourceChipComponent],
  templateUrl: './plant-map.component.html',
  styleUrl: './plant-map.component.scss'
})
export class PlantMapComponent implements OnDestroy {
  private readonly _httpClient = inject(HttpClient);
  private readonly _gridSignalsService = inject(GridSignalsService);
  private readonly _rush$ = new BehaviorSubject<IRushHourWindow | null>(null);
  private readonly _weatherPoints$ = new BehaviorSubject<Detour.Firestore.Snapshot.IWeatherPoint[]>([]);
  private readonly _hour$ = new BehaviorSubject<number | null>(null);
  private _playSubscription: Subscription | null = null;

  @Input() public set rush(value: IRushHourWindow | null) {
    this._rush$.next(value);
  }

  @Input() public set weatherPoints(value: Detour.Firestore.Snapshot.IWeatherPoint[] | null | undefined) {
    this._weatherPoints$.next(value ?? []);
  }

  public readonly width = plantMapLayout.WIDTH;
  public readonly fuels = mapFuels;
  public readonly honestyNote = plantMapSettings.HONESTY_NOTE;
  public readonly historyDays = plantMapSettings.HISTORY_DAYS;
  public readonly eia930Url = plantMapSettings.EIA_930_URL;
  public readonly tickHours = [0, 6, 12, 18];
  public readonly tickLabel = PlantMapHelper.tickLabel;
  public isPlaying = false;

  private readonly _rushTrack$: Observable<IRushTrack> = this._rush$.pipe(map((rush) => PlantMapHelper.rushTrack(rush)));

  public readonly state$: Observable<IPlantMapState> = combineLatest([
    this._httpClient.get<IPacePlantsFile>(plantMapSettings.PLANTS_URL),
    this._httpClient.get<IPaceStatesFile>(plantMapSettings.STATES_URL),
    this._gridSignalsService.history$,
    this._weatherPoints$,
    this._rushTrack$
  ]).pipe(
    map(([plantsFile, statesFile, history, weatherPoints, rushTrack]): IPlantMapState => {
      const data = PlantMapHelper.build(plantsFile, statesFile, history, weatherPoints, rushTrack);

      return { status: data ? 'ready' : 'empty', data, errorMessage: '' };
    }),
    startWith<IPlantMapState>({ status: 'loading', data: null, errorMessage: '' }),
    catchError((error) => {
      console.error('Failed to load the PACE plant map', error);

      return of<IPlantMapState>({ status: 'error', data: null, errorMessage: "The power-plant map couldn't load. The charts above still work." });
    }),
    shareReplay(1)
  );

  public readonly viewModel$ = combineLatest([this.state$, this._hour$, this._rushTrack$]).pipe(
    map(([state, hour, rushTrack]) => {
      const selectedHour = hour ?? rushTrack.startLocalHour;
      const hourView: IPlantMapHourView | null = state.data ? PlantMapHelper.hourView(state.data, selectedHour, rushTrack) : null;

      return { state, rushTrack, hourView };
    })
  );

  public onHourInput(event: Event): void {
    this.onStop();
    this._hour$.next(Number((event.target as HTMLInputElement).value));
  }

  public onTogglePlay(currentHour: number): void {
    if (this.isPlaying) {
      this.onStop();

      return;
    }

    let hour = currentHour >= 23 ? 5 : currentHour;
    this.isPlaying = true;
    this._hour$.next(hour);
    this._playSubscription = interval(plantMapLayout.PLAY_STEP_MS).subscribe(() => {
      hour += 1;
      this._hour$.next(hour);

      if (hour >= 23) {
        this.onStop();
      }
    });
  }

  public onStop(): void {
    this._playSubscription?.unsubscribe();
    this._playSubscription = null;
    this.isPlaying = false;
  }

  public ngOnDestroy(): void {
    this.onStop();
  }
}
