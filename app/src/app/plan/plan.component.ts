import { Component, inject } from '@angular/core';
import { AsyncPipe, CurrencyPipe, DecimalPipe } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSliderModule } from '@angular/material/slider';
import {
  BehaviorSubject,
  asapScheduler,
  Observable,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  from,
  map,
  of,
  shareReplay,
  startWith,
  subscribeOn,
  switchMap
} from 'rxjs';
import { GridSignalsService, SnapshotService } from '@app/core';
import { IMarginalEmissionsSeries, ISiteArchetype, IStationAssets, TariffScheduleId } from '@app/core/models';
import { PlanEngineHelper, PlanSolverService, placeholderMefSeries } from '@app/core/plan';
import { SitesHelper } from '@app/core/sites';
import {
  AlertBannerComponent,
  ChartFrameComponent,
  FigureComponent,
  SourceChipComponent,
  TermComponent,
  ThreeClocksComponent,
  UnderTheHoodComponent
} from '@app/shared/components';
import { ISnapshotViewState } from '@app/shared/interfaces/snapshot-view-state.interfaces';
import { SnapshotViewStateHelper } from '@app/shared/helpers/snapshot-view-state.helper';
import {
  DispatchChartComponent,
  LoadChartComponent,
  LpTextComponent
} from './components';
import { IAssetRow, IPlanControls, IPlanDateContext, IPlanSiteCard, IPlanSolveState } from './plan.interfaces';
import { PeakSoFarMode, PlanDateMode } from './plan.types';
import { PlanHelper } from './plan.helper';
import { planBaseline, planDefaults } from './plan.constants';

@Component({
  selector: 'dt-plan',
  imports: [
    AsyncPipe,
    CurrencyPipe,
    DecimalPipe,
    MatButtonToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSliderModule,
    AlertBannerComponent,
    ChartFrameComponent,
    FigureComponent,
    SourceChipComponent,
    TermComponent,
    ThreeClocksComponent,
    UnderTheHoodComponent,
    DispatchChartComponent,
    LoadChartComponent,
    LpTextComponent
  ],
  templateUrl: './plan.component.html',
  styleUrl: './plan.component.scss'
})
export class PlanComponent {
  private readonly _snapshotService = inject(SnapshotService);
  private readonly _planSolverService = inject(PlanSolverService);
  private readonly _controls$ = new BehaviorSubject<IPlanControls>(PlanHelper.defaultControls());
  private readonly _gridSignalsService = inject(GridSignalsService);
  private readonly _mef$: Observable<IMarginalEmissionsSeries> = this._gridSignalsService.marginalEmissions$.pipe(
    subscribeOn(asapScheduler),
    map(([fossilGenerationSeries]) => PlanHelper.mefOrPlaceholder(fossilGenerationSeries)),
    catchError(() => of(placeholderMefSeries)),
    shareReplay(1)
  );
  private _lastState: IPlanSolveState | null = null;

  public dialsOpen = false;
  public readonly siteCards: IPlanSiteCard[] = PlanHelper.buildSiteCards();
  public readonly defaults = planDefaults;
  public controls = this._controls$.value;
  public spinRows: IAssetRow[] = [];
  public pulseRows: IAssetRow[] = [];
  public maxReserveKwh = 0;

  public readonly state$: Observable<ISnapshotViewState> = SnapshotViewStateHelper.fromManifest(
    this._snapshotService.manifest$
  );

  private readonly _julyPeakDate$: Observable<string> = this._snapshotService
    .getGridMonth(planBaseline.MONTH)
    .pipe(
      map((gridMonth) => PlanHelper.julyPeakDate(gridMonth)),
      catchError(() => of(planDefaults.JULY_PEAK_FALLBACK_DATE as string))
    );

  public readonly dates$: Observable<Record<PlanDateMode, string>> = combineLatest([
    this._snapshotService.manifest$,
    this._julyPeakDate$
  ]).pipe(
    map(([manifest, julyPeakDate]) => ({
      target: manifest?.targetDate ?? planDefaults.JULY_PEAK_FALLBACK_DATE,
      'july-peak': julyPeakDate
    })),
    shareReplay(1)
  );

  private readonly _dateContext$: Observable<IPlanDateContext> = combineLatest([
    this.dates$,
    this._controls$.pipe(
      map((controls: IPlanControls) => controls.dateMode),
      distinctUntilChanged()
    )
  ]).pipe(
    switchMap(([dates, dateMode]) => this._loadDateContext(dateMode, dates[dateMode])),
    shareReplay(1)
  );

  public readonly solve$: Observable<IPlanSolveState> = combineLatest([
    this._controls$,
    this._dateContext$,
    this._mef$
  ]).pipe(
    debounceTime(planDefaults.SOLVE_DEBOUNCE_MS),
    switchMap(([controls, context, mef]) =>
      from(this._solve(controls, context, mef)).pipe(
        startWith<IPlanSolveState>({ status: 'solving', viewModel: null, errorMessage: '' })
      )
    ),
    startWith<IPlanSolveState>({ status: 'solving', viewModel: null, errorMessage: '' }),
    map((state: IPlanSolveState) => this._keepLastViewModel(state)),
    shareReplay(1)
  );

  public constructor() {
    this._refreshAssetRows();
  }

  public get dialsSummary(): string {
    return PlanHelper.dialsSummary(this.controls);
  }

  public siteShortName(site: ISiteArchetype): string {
    return PlanHelper.siteShortName(site);
  }

  public onToggleDials(): void {
    this.dialsOpen = !this.dialsOpen;
  }

  public onSiteSelect(site: ISiteArchetype): void {
    this._update({ siteId: site.id, scheduleId: site.scheduleId, wattsmartReserveKwh: 0 });
  }

  public onDateModeChange(dateMode: PlanDateMode): void {
    this._update({ dateMode });
  }

  public onScheduleChange(scheduleId: TariffScheduleId): void {
    this._update({ scheduleId });
  }

  public onPeakSoFarModeChange(peakSoFarMode: PeakSoFarMode): void {
    this._update({ peakSoFarMode });
  }

  public onCo2WeightChange(co2WeightPerKg: number): void {
    this._update({ co2WeightPerKg });
  }

  public onReserveChange(wattsmartReserveKwh: number): void {
    this._update({ wattsmartReserveKwh });
  }

  private _update(changes: Partial<IPlanControls>): void {
    this.controls = { ...this.controls, ...changes };
    this._refreshAssetRows();
    this._controls$.next(this.controls);
  }

  private _refreshAssetRows(): void {
    const assets = this._assets();
    this.spinRows = PlanHelper.spinRows(assets);
    this.pulseRows = PlanHelper.pulseRows(assets);
    this.maxReserveKwh = PlanHelper.maxReserveKwh(assets);
  }

  private _assets(): IStationAssets {
    return SitesHelper.getAssets(this.controls.siteId) as IStationAssets;
  }

  private _loadDateContext(dateMode: PlanDateMode, date: string): Observable<IPlanDateContext> {
    const months = PlanHelper.monthsFor(date);

    return combineLatest([
      combineLatest(months.map((month: string) => this._snapshotService.getGridMonth(month))),
      combineLatest(months.map((month: string) => this._snapshotService.getPriceMonth(month)))
    ]).pipe(
      map(([gridMonths, priceMonths]) => {
        const gridHours = gridMonths.flatMap((gridMonth) => gridMonth?.hours ?? []);
        const priceHours = priceMonths.flatMap((priceMonth) => priceMonth?.hours ?? []);

        return {
          dateMode,
          date,
          gridHours,
          priceHours,
          rushHourWindows: PlanEngineHelper.rushHourWindows(gridHours, date)
        };
      }),
      catchError((error: unknown) => {
        console.error('Failed to load grid context for the plan', error);

        return of({
          dateMode,
          date,
          gridHours: [],
          priceHours: [],
          rushHourWindows: PlanEngineHelper.rushHourWindows([], date)
        });
      })
    );
  }

  private async _solve(
    controls: IPlanControls,
    context: IPlanDateContext,
    mef: IMarginalEmissionsSeries
  ): Promise<IPlanSolveState> {
    try {
      const site = SitesHelper.getArchetype(controls.siteId) as ISiteArchetype;
      const assets = SitesHelper.getAssets(controls.siteId) as IStationAssets;
      const schedule = PlanHelper.scheduleFor(controls.scheduleId);
      const request = PlanHelper.buildRequest(controls, context.date, site, assets);
      const input = PlanHelper.applyPeakSoFarMode(
        PlanEngineHelper.buildInput(site, assets, schedule, request, mef, context.rushHourWindows),
        controls.peakSoFarMode
      );
      const result = await this._planSolverService.solve(input);
      const viewModel = PlanHelper.buildViewModel(controls, context, result, assets, mef);

      if (result.status !== 'optimal') {
        return {
          status: 'error',
          viewModel,
          errorMessage: result.errorMessage ?? 'The solver could not find a plan for these settings.'
        };
      }

      return { status: 'ready', viewModel, errorMessage: '' };
    } catch (error: unknown) {
      console.error('Plan solve failed', error);

      return {
        status: 'error',
        viewModel: null,
        errorMessage: 'The optimizer failed to load or solve. Refresh the page and try again.'
      };
    }
  }

  private _keepLastViewModel(state: IPlanSolveState): IPlanSolveState {
    const merged = { ...state, viewModel: state.viewModel ?? this._lastState?.viewModel ?? null };
    this._lastState = merged;

    return merged;
  }
}
