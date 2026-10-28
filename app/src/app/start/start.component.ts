import { Component, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Observable, Subscription, animationFrames, catchError, combineLatest, distinctUntilChanged, filter, interval, map, of, shareReplay, startWith, switchMap, takeWhile, tap, timer } from 'rxjs';
import { BacktestYearService, GridSignalsService, PlanningDayService, SnapshotService } from '@app/core';
import {
  AlertBannerComponent,
  ArchitectureComponent,
  SimulatedBadgeComponent,
  SnapshotBadgeComponent,
  UnderTheHoodComponent
} from '@app/shared/components';
import { PlanHelper } from '../plan/plan.helper';
import { PlantMapDataService } from '../traffic/components/plant-map/plant-map-data.service';
import { PlantMapHelper } from '../traffic/components/plant-map/plant-map.helper';
import { PlantMapSurfaceComponent } from '../traffic/components/plant-map-surface/plant-map-surface.component';
import { TrafficHelper } from '../traffic/traffic.helper';
import { startSettings } from './start.constants';
import { StartHelper } from './start.helper';
import { IStartScene, IStartTile, IStartViewState } from './start.interfaces';

@Component({
  selector: 'dt-start',
  imports: [
    AsyncPipe,
    RouterLink,
    MatIconModule,
    AlertBannerComponent,
    ArchitectureComponent,
    PlantMapSurfaceComponent,
    SimulatedBadgeComponent,
    SnapshotBadgeComponent,
    UnderTheHoodComponent
  ],
  templateUrl: './start.component.html',
  styleUrl: './start.component.scss'
})
export class StartComponent implements OnInit, OnDestroy {
  private readonly _snapshotService = inject(SnapshotService);
  private readonly _gridSignalsService = inject(GridSignalsService);
  private readonly _planningDayService = inject(PlanningDayService);
  private readonly _plantMapDataService = inject(PlantMapDataService);
  private readonly _backtestYearService = inject(BacktestYearService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private _sequence: Subscription | null = null;
  private _fragment: Subscription | null = null;
  private _rotation: Subscription | null = null;
  private _hookIndex = 0;

  public readonly hook = PlanHelper.hookNumbers();
  public readonly hookSentence = StartHelper.hookSentence(this.hook.roundedKwh);
  public readonly hookLines = StartHelper.hookLines(this.hook.roundedKwh);
  public readonly architectureId = startSettings.ARCHITECTURE_ID;
  public readonly day$ = this._planningDayService.day$;
  public figureProgress = 0;
  public hookPhase: 'hidden' | 'in' | 'out' = 'hidden';
  public areTilesIn = false;

  public readonly state$: Observable<IStartViewState> = combineLatest([
    this._snapshotService.manifest$,
    this._gridSignalsService.history$,
    this._gridSignalsService.targetPriceHours$,
    this._gridSignalsService.marginalEmissions$
  ]).pipe(
    map(([manifest, history, priceHours, marginalSeries]): IStartViewState => {
      if (!manifest || history.length === 0) {
        return { status: 'empty', preview: null, errorMessage: startSettings.EMPTY_MESSAGE };
      }

      const fossilSeries = marginalSeries.find((series) => series.method === 'fossil-generation');

      return {
        status: 'ready',
        preview: StartHelper.preview(manifest.targetDate, history, priceHours, fossilSeries),
        errorMessage: ''
      };
    }),
    catchError((error: unknown) => {
      console.error('Failed to build the start preview', error);

      return of<IStartViewState>({ status: 'error', preview: null, errorMessage: startSettings.ERROR_MESSAGE });
    }),
    startWith<IStartViewState>({ status: 'loading', preview: null, errorMessage: '' }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  public readonly tiles$: Observable<IStartTile[]> = combineLatest([this.state$, this.day$, this._backtestYearService.year$.pipe(startWith(null))]).pipe(
    map(([state, day, year]) => [StartHelper.forecastTile(state.preview, day), StartHelper.decideTile(day), StartHelper.proveTile(year)])
  );

  private readonly _rushTrack$ = this.state$.pipe(
    map((state) => PlantMapHelper.rushTrack(state.preview?.rushHourWindows[0] ?? null)),
    distinctUntilChanged((first, second) => first.startLocalHour === second.startLocalHour && first.endLocalHour === second.endLocalHour)
  );

  public readonly scene$: Observable<IStartScene> = combineLatest([
    this._plantMapDataService.state$(of([]), this._rushTrack$),
    this._rushTrack$,
    this.state$
  ]).pipe(
    map(([plantState, rushTrack, state]): IStartScene => {
      if (!plantState.data) {
        return { data: null, hourView: null };
      }

      const siteKw = state.preview ? TrafficHelper.siteKwByHour(state.preview.targetDate) : [];

      return { data: plantState.data, hourView: PlantMapHelper.hourView(plantState.data, rushTrack.startLocalHour, rushTrack, siteKw) };
    })
  );

  public get hookWords(): string[] {
    return this.hookLines[this._hookIndex].split(' ');
  }

  public get peakFigure(): string {
    return StartHelper.countUp(this.hook.demandRateLabel, this.figureProgress);
  }

  public get spreadFigure(): string {
    return StartHelper.countUp(this.hook.spreadLabel, this.figureProgress);
  }

  public ngOnInit(): void {
    this._fragment = this._route.fragment.pipe(filter((fragment) => fragment === this.architectureId)).subscribe(() => {
      setTimeout(() => this.openArchitecture());
    });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this._finishSequence();

      return;
    }

    this._sequence = animationFrames()
      .pipe(takeWhile((frame) => frame.elapsed < startSettings.SEQUENCE_MS, true))
      .subscribe((frame) => this._advanceSequence(frame.elapsed));
  }

  public ngOnDestroy(): void {
    this._sequence?.unsubscribe();
    this._rotation?.unsubscribe();
    this._fragment?.unsubscribe();
  }

  public openArchitecture(): void {
    const host = this._elementRef.nativeElement.querySelector<HTMLElement>(`#${this.architectureId}`);
    const details = host?.querySelector<HTMLDetailsElement>('details');
    const summary = details?.querySelector<HTMLElement>('summary');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (details) {
      details.open = true;
    }

    host?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    summary?.focus({ preventScroll: true });
  }

  private _advanceSequence(elapsed: number): void {
    this.figureProgress = 1 - Math.pow(1 - Math.min(elapsed / startSettings.COUNT_UP_MS, 1), 3);

    if (elapsed >= startSettings.TYPE_START_MS && this.hookPhase === 'hidden') {
      this.hookPhase = 'in';
    }

    this.areTilesIn = elapsed >= startSettings.TILES_AT_MS;

    if (elapsed >= startSettings.SEQUENCE_MS) {
      this._finishSequence();
    }
  }

  private _finishSequence(): void {
    this.figureProgress = 1;
    this._hookIndex = 0;
    this.hookPhase = 'in';
    this.areTilesIn = true;

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && !this._rotation) {
      this._rotation = interval(startSettings.ROTATE_PERIOD_MS)
        .pipe(
          tap(() => (this.hookPhase = 'out')),
          switchMap(() => timer(startSettings.DISSOLVE_OUT_MS))
        )
        .subscribe(() => {
          this._hookIndex = (this._hookIndex + 1) % this.hookLines.length;
          this.hookPhase = 'in';
        });
    }
  }
}
