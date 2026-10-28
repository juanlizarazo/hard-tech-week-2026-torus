import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AsyncPipe, Location, NgTemplateOutlet } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { BehaviorSubject, Observable, combineLatest, concat, debounceTime, distinctUntilChanged, map, shareReplay, skip, startWith, switchMap, take } from 'rxjs';
import { BacktestService, BacktestYearService } from '@app/core';
import { BacktestMonthsHelper, backtestSettings } from '@app/core/backtest';
import { ISiteArchetype, TariffScheduleId } from '@app/core/models';
import { SitesHelper } from '@app/core/sites';
import {
  AlertBannerComponent,
  ChartFrameComponent,
  FigureComponent,
  HourChartComponent,
  NextStopComponent,
  SourceChipComponent,
  TermComponent,
  UnderTheHoodComponent
} from '@app/shared/components';
import { backtestScheduleOptions, backtestScreenSettings } from './backtest.constants';
import { BacktestHelper } from './backtest.helper';
import {
  IBacktestCaptureBar,
  IBacktestControls,
  IBacktestHeading,
  IBacktestScreenModel,
  IBacktestViewState,
  IYearLedgerScreen
} from './backtest.interfaces';
import { BacktestViewStateHelper } from './backtest-view-state.helper';
import { ComponentBarsComponent, MonthCalendarComponent, YearLedgerComponent } from './components';
import { YearLedgerHelper } from './year-ledger.helper';

@Component({
  selector: 'dt-backtest',
  imports: [
    AsyncPipe,
    NgTemplateOutlet,
    RouterLink,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    AlertBannerComponent,
    ChartFrameComponent,
    ComponentBarsComponent,
    FigureComponent,
    HourChartComponent,
    MonthCalendarComponent,
    NextStopComponent,
    SourceChipComponent,
    TermComponent,
    UnderTheHoodComponent,
    YearLedgerComponent
  ],
  templateUrl: './backtest.component.html',
  styleUrl: './backtest.component.scss'
})
export class BacktestComponent {
  private readonly _backtestService = inject(BacktestService);
  private readonly _backtestYearService = inject(BacktestYearService);
  private readonly _router = inject(Router);
  private readonly _location = inject(Location);
  private readonly _route = inject(ActivatedRoute);
  private readonly _month$ = new BehaviorSubject<string>(
    BacktestComponent._monthFrom(this._route.snapshot.queryParamMap.get('month'))
  );
  private readonly _controls$ = new BehaviorSubject<IBacktestControls>({
    siteId: 'airport',
    scheduleId: backtestScreenSettings.DEFAULT_SCHEDULE_ID
  });
  private readonly _selectedDate$ = new BehaviorSubject<string | null>(null);

  public readonly sites: ISiteArchetype[] = SitesHelper.listArchetypes();
  public readonly scheduleOptions = backtestScheduleOptions;
  public readonly controls$: Observable<IBacktestControls> = this._controls$.asObservable();
  public readonly kilowattFormat = (value: number): string => `${Math.round(value).toLocaleString('en-US')} kW`;
  public readonly formatNumber = BacktestHelper.formatNumber;
  public readonly formatMoney = BacktestHelper.formatMoney;

  public readonly month$: Observable<string> = combineLatest([this._month$, this._backtestService.calendar$]).pipe(
    map(([month, calendar]) =>
      !calendar || calendar.months.includes(month) ? month : backtestSettings.DEFAULT_MONTH
    ),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  public readonly heading$: Observable<IBacktestHeading> = combineLatest([
    this.month$,
    this._backtestService.calendar$
  ]).pipe(
    map(([month, calendar]) => {
      const throughDate = calendar ? BacktestMonthsHelper.partialThrough(month, calendar.throughDate) : null;

      return {
        question: 'Has DETOUR paid off in 2026?',
        monthQuestion: `Would it have paid off in ${BacktestHelper.monthPhrase(month, throughDate)}?`,
        monthLabel: BacktestHelper.monthLabel(month, throughDate)
      };
    }),
    startWith<IBacktestHeading>({ question: 'Has DETOUR paid off in 2026?', monthQuestion: 'Would it have paid off in July?', monthLabel: 'July 2026' })
  );

  public readonly ledger$: Observable<IYearLedgerScreen | null> = combineLatest([
    this._backtestService.calendar$,
    this._backtestYearService.year$,
    this._controls$,
    this.month$
  ]).pipe(
    map(([calendar, year, controls, month]) =>
      calendar
        ? { ledger: YearLedgerHelper.build(calendar, year, controls.siteId, controls.scheduleId), selected: month }
        : null
    )
  );

  public readonly state$: Observable<IBacktestViewState> = BacktestViewStateHelper.fromSources(
    concat(this.month$.pipe(take(1)), this.month$.pipe(skip(1), debounceTime(backtestScreenSettings.REPLAY_DEBOUNCE_MS))).pipe(
      distinctUntilChanged(),
      switchMap((month: string) => this._backtestService.sourcesFor(month))
    ),
    this._controls$,
    (sources, controls) => this._backtestService.run(sources, controls.siteId, controls.scheduleId)
  ).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  public readonly viewModel$: Observable<IBacktestScreenModel> = combineLatest([
    this.state$,
    this._selectedDate$,
    this.month$
  ]).pipe(
    map(([state, selectedDate, month]) => ({
      state,
      model: state.result ? BacktestHelper.buildViewModel(state.result, selectedDate) : null,
      isReplaying: state.isReplaying || (state.result !== null && state.result.summary.month !== month),
      replayingLabel: BacktestHelper.monthName(month)
    }))
  );

  public readonly captureTicks = backtestScreenSettings.CAPTURE_TICKS;
  public readonly loadingMessage = backtestScreenSettings.LOADING_MESSAGE;
  public readonly emptyMessage = backtestScreenSettings.EMPTY_MESSAGE;

  public onMonthSelected(month: string): void {
    this._selectedDate$.next(null);
    this._month$.next(month);
    this._location.replaceState(
      this._router.createUrlTree([], { relativeTo: this._route, queryParams: { month }, queryParamsHandling: 'merge' }).toString()
    );
  }

  public onSiteChange(siteId: string): void {
    const scheduleId = SitesHelper.getArchetype(siteId)?.scheduleId ?? this._controls$.value.scheduleId;

    this._selectedDate$.next(null);
    this._controls$.next({ ...this._controls$.value, siteId, scheduleId });
  }

  public onScheduleChange(scheduleId: TariffScheduleId): void {
    this._selectedDate$.next(null);
    this._controls$.next({ ...this._controls$.value, scheduleId });
  }

  public onDaySelected(localDate: string): void {
    this._selectedDate$.next(localDate);
  }

  public captureAria(bars: IBacktestCaptureBar[]): string {
    return bars.map((bar) => `${bar.label}: ${bar.captureLabel} capture, ${bar.savingsLabel} saved`).join('. ');
  }

  public scrollToDay(event: Event): void {
    event.preventDefault();
    const target = document.getElementById('backtest-day-title');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    target?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    target?.focus({ preventScroll: true });
  }

  public barWidth(percentOfLife: number): number {
    return Math.min(100, Math.max(1, percentOfLife * 100));
  }

  private static _monthFrom(value: string | null): string {
    return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : backtestSettings.DEFAULT_MONTH;
  }
}
