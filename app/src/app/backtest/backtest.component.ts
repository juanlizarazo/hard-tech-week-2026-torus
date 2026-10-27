import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { BehaviorSubject, Observable, combineLatest, map, shareReplay } from 'rxjs';
import { BacktestService } from '@app/core';
import { ISiteArchetype, TariffScheduleId } from '@app/core/models';
import { SitesHelper } from '@app/core/sites';
import {
  AlertBannerComponent,
  HourChartComponent,
  ScreenToolbarComponent,
  SimulatedBadgeComponent
} from '@app/shared/components';
import { backtestScheduleOptions, backtestScreenSettings } from './backtest.constants';
import { BacktestHelper } from './backtest.helper';
import { IBacktestControls, IBacktestViewModel, IBacktestViewState } from './backtest.interfaces';
import { BacktestViewStateHelper } from './backtest-view-state.helper';
import { ComponentBarsComponent, MonthCalendarComponent } from './components';

@Component({
  selector: 'dt-backtest',
  imports: [
    AsyncPipe,
    MatButtonToggleModule,
    MatCardModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    AlertBannerComponent,
    ComponentBarsComponent,
    HourChartComponent,
    MonthCalendarComponent,
    ScreenToolbarComponent,
    SimulatedBadgeComponent
  ],
  templateUrl: './backtest.component.html',
  styleUrl: './backtest.component.scss'
})
export class BacktestComponent {
  private readonly _backtestService = inject(BacktestService);
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

  public readonly state$: Observable<IBacktestViewState> = BacktestViewStateHelper.fromSources(
    this._backtestService.sources$,
    this._controls$,
    (sources, controls) => this._backtestService.run(sources, controls.siteId, controls.scheduleId)
  ).pipe(shareReplay({ bufferSize: 1, refCount: true }));

  public readonly viewModel$: Observable<{ state: IBacktestViewState; model: IBacktestViewModel | null }> = combineLatest([
    this.state$,
    this._selectedDate$
  ]).pipe(
    map(([state, selectedDate]) => ({
      state,
      model: state.result ? BacktestHelper.buildViewModel(state.result, selectedDate) : null
    }))
  );

  public readonly loadingMessage = backtestScreenSettings.LOADING_MESSAGE;
  public readonly emptyMessage = backtestScreenSettings.EMPTY_MESSAGE;

  public onSiteChange(siteId: string): void {
    this._selectedDate$.next(null);
    this._controls$.next({ ...this._controls$.value, siteId });
  }

  public onScheduleChange(scheduleId: TariffScheduleId): void {
    this._selectedDate$.next(null);
    this._controls$.next({ ...this._controls$.value, scheduleId });
  }

  public onDaySelected(localDate: string): void {
    this._selectedDate$.next(localDate);
  }

  public barWidth(percentOfLife: number): number {
    return Math.min(100, Math.max(2, percentOfLife * 10));
  }
}
