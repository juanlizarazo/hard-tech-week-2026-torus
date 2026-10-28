import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe, CurrencyPipe, DecimalPipe, Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import {
  BehaviorSubject,
  asapScheduler,
  concat,
  filter,
  pairwise,
  scan,
  timer,
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
import { GridSignalsService, SnapshotService, PlanningDayService } from '@app/core';
import { IMarginalEmissionsSeries, ISiteArchetype, IStationAssets, TariffScheduleId } from '@app/core/models';
import { PlanEngineHelper, PlanSolverService, placeholderMefSeries } from '@app/core/plan';
import { SitesHelper } from '@app/core/sites';
import {
  AlertBannerComponent,
  ChartFrameComponent,
  FigureComponent,
  IndexTagComponent,
  NextStopComponent,
  RunLogComponent,
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
  LpTextComponent,
  PrintFooterComponent,
  PrintMastheadComponent
} from './components';
import { IAssetRow, IPlanControls, IPlanDeltaState, IPlanHook, IPlanViewModel, IPlanDateContext, IPlanSiteCard, IPlanSolveState, IPlanTile } from './plan.interfaces';
import { PeakSoFarMode, PlanDateMode, PlanSolverRailState } from './plan.types';
import { PlanHelper } from './plan.helper';
import { planBaseline, planDefaults, planDeltaSettings } from './plan.constants';
import { PlanDeltaHelper } from './plan-delta.helper';
import { DispatchOrdersHelper } from './dispatch-orders.helper';
import { IDispatchApproval, IDispatchOrder, IDispatchSheet } from './dispatch-orders.interfaces';
import { TimeHelper } from '@app/core/helpers';
import { PlanShareHelper } from './plan-share.helper';
import { planShareSettings } from './plan-share.constants';

@Component({
  selector: 'dt-plan',
  imports: [
    AsyncPipe,
    CurrencyPipe,
    DecimalPipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSliderModule,
    AlertBannerComponent,
    ChartFrameComponent,
    IndexTagComponent,
    FigureComponent,
    NextStopComponent,
    RunLogComponent,
    SourceChipComponent,
    TermComponent,
    ThreeClocksComponent,
    UnderTheHoodComponent,
    DispatchChartComponent,
    LoadChartComponent,
    LpTextComponent,
    PrintFooterComponent,
    PrintMastheadComponent
  ],
  templateUrl: './plan.component.html',
  styleUrl: './plan.component.scss'
})
export class PlanComponent {
  private readonly _snapshotService = inject(SnapshotService);
  private readonly _planSolverService = inject(PlanSolverService);
  private readonly _route = inject(ActivatedRoute);
  private readonly _router = inject(Router);
  private readonly _location = inject(Location);
  private readonly _clipboard = inject(Clipboard);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _controls$ = new BehaviorSubject<IPlanControls>(
    PlanShareHelper.controlsFromParams(this._route.snapshot.queryParamMap)
  );
  private readonly _copied$ = new BehaviorSubject<number>(0);
  private readonly _gridSignalsService = inject(GridSignalsService);
  private readonly _planningDayService = inject(PlanningDayService);
  private readonly _mef$: Observable<IMarginalEmissionsSeries> = this._gridSignalsService.marginalEmissions$.pipe(
    subscribeOn(asapScheduler),
    map(([fossilGenerationSeries]) => PlanHelper.mefOrPlaceholder(fossilGenerationSeries)),
    catchError(() => of(placeholderMefSeries)),
    shareReplay(1)
  );
  private _lastState: IPlanSolveState | null = null;

  public dialsOpen = false;
  public approval: IDispatchApproval | null = null;
  public readonly day$ = this._planningDayService.day$;
  public readonly siteCards: IPlanSiteCard[] = PlanHelper.buildSiteCards();
  public readonly defaults = planDefaults;
  public controls = this._controls$.value;
  public spinRows: IAssetRow[] = [];
  public pulseRows: IAssetRow[] = [];
  public maxReserveKwh = 0;
  public isSharedPlan = PlanShareHelper.isShared(this._route.snapshot.queryParamMap);
  public shareUrl = '';

  public readonly linkCopied$: Observable<boolean> = this._copied$.pipe(
    switchMap((copyCount: number) =>
      copyCount === 0
        ? of(false)
        : concat(of(true), timer(planShareSettings.COPIED_VISIBLE_MS).pipe(map(() => false)))
    )
  );

  public readonly pulledAt$: Observable<Date | null> = this._snapshotService.manifest$.pipe(
    map((manifest) => manifest?.pulledAt?.toDate?.() ?? null)
  );

  public readonly state$: Observable<ISnapshotViewState> = SnapshotViewStateHelper.fromManifest(
    this._snapshotService.manifest$
  );

  public readonly dates$: Observable<Record<PlanDateMode, string>> = this._snapshotService.manifest$.pipe(
    map((manifest) => ({ target: manifest?.targetDate ?? planDefaults.JULY_PEAK_FALLBACK_DATE })),
    shareReplay(1)
  );

  public readonly hook$: Observable<IPlanHook> = this.dates$.pipe(
    map((dates) => PlanHelper.buildHook(dates.target)),
    distinctUntilChanged((previous, current) => previous.subtitle === current.subtitle)
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


  public readonly sheet$: Observable<IDispatchSheet | null> = this.solve$.pipe(
    filter(
      (state: IPlanSolveState) =>
        state.status === 'ready' && state.viewModel !== null && state.viewModel.result.status === 'optimal'
    ),
    map((state: IPlanSolveState) => state.viewModel as IPlanViewModel),
    distinctUntilChanged(),
    scan(
      (previous: IDispatchSheet | null, viewModel: IPlanViewModel) =>
        DispatchOrdersHelper.fromViewModel(viewModel, (previous?.revision ?? 0) + 1),
      null as IDispatchSheet | null
    ),
    startWith(null),
    shareReplay(1)
  );

  public readonly deltas$: Observable<IPlanDeltaState> = this.solve$.pipe(
    filter((state: IPlanSolveState) => state.status === 'ready' && state.viewModel !== null),
    map((state: IPlanSolveState) => state.viewModel as IPlanViewModel),
    distinctUntilChanged(),
    pairwise(),
    switchMap(([previous, current]) =>
      concat(
        of(PlanDeltaHelper.deltaState(previous.tiles, current.tiles)),
        timer(planDeltaSettings.VISIBLE_MS).pipe(map(() => PlanDeltaHelper.emptyState()))
      )
    ),
    startWith(PlanDeltaHelper.emptyState())
  );

  public constructor() {
    this._refreshAssetRows();
    this._syncShareUrl();
  }

  public get dialsSummary(): string {
    return PlanHelper.dialsSummary(this.controls);
  }

  public siteShortName(site: ISiteArchetype): string {
    return PlanHelper.siteShortName(site);
  }

  public onResetDials(): void {
    this._update(PlanHelper.defaultControls());
  }

  public railState(solve: IPlanSolveState): PlanSolverRailState {
    if (solve.status === 'solving') {
      return 'solving';
    }

    if (solve.status === 'ready') {
      return 'solved';
    }

    return !solve.isStale && solve.viewModel?.result.status === 'infeasible' ? 'infeasible' : 'failed';
  }

  public tileSources(tiles: IPlanTile[]): string[] {
    return [...new Set(tiles.map((tile) => tile.source).filter((source): source is string => !!source))];
  }

  public leadTiles(tiles: IPlanTile[]): IPlanTile[] {
    return tiles.filter((tile) => tile.id !== 'energy' && tile.id !== 'co2');
  }

  public secondaryTiles(tiles: IPlanTile[]): IPlanTile[] {
    return tiles.filter((tile) => tile.id === 'energy' || tile.id === 'co2');
  }

  public canApprove(solve: IPlanSolveState, sheet: IDispatchSheet | null): boolean {
    return this.railState(solve) === 'solved' && sheet !== null;
  }

  public isApproved(sheet: IDispatchSheet | null): boolean {
    return this.approval !== null && sheet !== null && this.approval.revision === sheet.revision;
  }

  public orderKey(order: IDispatchOrder): string {
    return `${order.id}|${order.timeRange}|${order.amount}`;
  }

  public onApprove(sheet: IDispatchSheet): void {
    const parts = TimeHelper.localParts(Date.now());

    this.approval = {
      approvedAtLabel: `${String(parts.hour).padStart(2, '0')}:${String(parts.minute).padStart(2, '0')} MT`,
      revision: sheet.revision
    };
  }

  public onDownloadCsv(sheet: IDispatchSheet): void {
    const blob = new Blob([DispatchOrdersHelper.csv(sheet)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = sheet.fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  public onCopyLink(): void {
    if (this._clipboard.copy(this.shareUrl)) {
      this._copied$.next(this._copied$.value + 1);
    }
  }

  public onDownloadPdf(): void {
    window.print();
  }

  public onToggleDials(): void {
    this.dialsOpen = !this.dialsOpen;
  }

  public get selectedSiteCard(): IPlanSiteCard | undefined {
    return this.siteCards.find((card: IPlanSiteCard) => card.archetype.id === this.controls.siteId);
  }

  public onSiteChange(siteId: string): void {
    const site = SitesHelper.getArchetype(siteId);

    if (site) {
      this._update({
        siteId: site.id,
        scheduleId: site.scheduleId,
        wattsmartReserveKwh: PlanHelper.defaultReserveKwh(SitesHelper.getAssets(site.id) as IStationAssets)
      });
    }
  }

  public headingDay(solve: IPlanSolveState | null, planningDayWord: string | undefined): string {
    const viewModel = solve?.viewModel ?? null;

    return PlanHelper.dayPhrase(viewModel?.controls.dateMode ?? null, planningDayWord ?? 'tomorrow', viewModel?.dateLabel ?? '');
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

  public onGridReliefChange(gridReliefPerKw: number): void {
    this._update({ gridReliefPerKw });
  }

  private _update(changes: Partial<IPlanControls>): void {
    const next = { ...this.controls, ...changes };

    if ((Object.keys(next) as (keyof IPlanControls)[]).every((key) => next[key] === this.controls[key])) {
      return;
    }

    this.isSharedPlan = false;
    this.controls = next;
    this._refreshAssetRows();
    this._controls$.next(this.controls);
  }

  private _syncShareUrl(): void {
    combineLatest([
      this._controls$,
      this._snapshotService.manifest$.pipe(map((manifest) => manifest?.id ?? null))
    ])
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe(([controls, snapshotId]) => {
        const pageUrl = this._router.serializeUrl(
          this._router.createUrlTree([], {
            relativeTo: this._route,
            queryParams: PlanShareHelper.toQueryParams(controls, snapshotId, this.isSharedPlan),
            queryParamsHandling: 'merge'
          })
        );
        const sharePath = this._router.serializeUrl(
          this._router.createUrlTree([], {
            relativeTo: this._route,
            queryParams: PlanShareHelper.toQueryParams(controls, snapshotId, true)
          })
        );

        this.shareUrl = `${window.location.origin}${this._location.prepareExternalUrl(sharePath)}`;

        if (pageUrl !== this._location.path()) {
          this._location.replaceState(pageUrl);
        }
      });
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
    const isStale = state.viewModel === null && this._lastState?.viewModel !== null;
    const merged = {
      ...state,
      viewModel: state.viewModel ?? this._lastState?.viewModel ?? null,
      isStale
    };
    this._lastState = merged;

    return merged;
  }
}
