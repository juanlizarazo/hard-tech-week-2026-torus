import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { GridSignalsService, LoadForecastService, SnapshotService, PlanningDayService, emissionFactors } from '@app/core';
import { weatherWeightsProvenance } from '@app/core/forecast/load-forecast.constants';
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
import { PlantMapComponent } from './components/plant-map/plant-map.component';
import { plantMapSettings } from './components/plant-map/plant-map.constants';
import { SignalStackComponent } from './components/signal-stack/signal-stack.component';
import { RankSlopeComponent } from './components/rank-slope/rank-slope.component';
import {
  forecastLimitations,
  forecastMethodSteps,
  trafficChartDefaults,
  trafficLimitations,
  trafficMethodSteps
} from './traffic.constants';
import { TrafficHelper } from './traffic.helper';
import { ITrafficChartOptions, ITrafficReport } from './traffic.interfaces';
import { TrafficViewStateHelper } from './traffic-view-state.helper';

@Component({
  selector: 'dt-traffic',
  imports: [
    AsyncPipe,
    DatePipe,
    DecimalPipe,
    MatIconModule,
    MatProgressSpinnerModule,
    AlertBannerComponent,
    ChartFrameComponent,
    FigureComponent,
    HourChartComponent,
    NextStopComponent,
    PlantMapComponent,
    RankSlopeComponent,
    SignalStackComponent,
    SourceChipComponent,
    TermComponent,
    UnderTheHoodComponent
  ],
  templateUrl: './traffic.component.html',
  styleUrl: './traffic.component.scss'
})
export class TrafficComponent {
  private readonly _snapshotService = inject(SnapshotService);
  private readonly _gridSignalsService = inject(GridSignalsService);
  private readonly _loadForecastService = inject(LoadForecastService);
  private readonly _planningDayService = inject(PlanningDayService);
  private readonly _options$ = new BehaviorSubject<ITrafficChartOptions>({ ...trafficChartDefaults });

  public readonly day$ = this._planningDayService.day$;
  public readonly factors = [emissionFactors.COAL, emissionFactors.GAS];
  public readonly limitations = trafficLimitations;
  public readonly methodSteps = trafficMethodSteps;
  public readonly forecastMethodSteps = forecastMethodSteps;
  public readonly forecastLimitations = forecastLimitations;
  public readonly weatherWeightsProvenance = weatherWeightsProvenance;
  public readonly megawattFormat = (value: number): string => `${Math.round(value).toLocaleString()} MW`;
  public readonly priceFormat = (value: number): string => `$${value.toFixed(0)}/MWh`;
  public readonly carbonFormat = (value: number): string => `${Math.round(value).toLocaleString()} lb/MWh`;
  public readonly forecastVerdict = TrafficHelper.forecastVerdict;
  public readonly frameSource = TrafficHelper.frameSource;

  public options = this._options$.value;
  public selectedHour: number | null = null;

  public readonly forecastViewModel$ = TrafficViewStateHelper.forecastFromSources(this._loadForecastService.forecast$);

  public readonly viewModel$ = combineLatest([
    TrafficViewStateHelper.fromSources({
      manifest$: this._snapshotService.manifest$,
      history$: this._gridSignalsService.history$,
      priceHours$: this._gridSignalsService.targetPriceHours$,
      marginalSeries$: this._gridSignalsService.marginalEmissions$,
      averagePoints$: this._gridSignalsService.averageEmissions$,
      score$: this._gridSignalsService.forecastScore$
    }),
    this.forecastViewModel$,
    this._options$,
    this.day$
  ]).pipe(
    map(([state, forecastState, options, day]) => ({
      state,
      hasOurForecast: !!forecastState.forecast,
      charts: state.report ? TrafficHelper.charts(state.report, forecastState.forecast, options) : null,
      answer: state.report ? TrafficHelper.answer(state.report) : [],
      signalRows: state.report ? TrafficHelper.signalRows(state.report) : [],
      clockReadouts: state.report ? TrafficHelper.clockReadouts(state.report, day.word) : [],
      siteKwByHour: state.report ? TrafficHelper.siteKwByHour(state.report.targetDate) : [],
      notices: state.report ? TrafficHelper.notices(state.report, forecastState.forecast) : null
    }))
  );

  public resolvedHour(report: ITrafficReport): number {
    return this.selectedHour ?? report.paceRush?.startLocalHour ?? plantMapSettings.FALLBACK_HOUR;
  }

  public loadCursorIndex(report: ITrafficReport, hour: number): number {
    return this.options.showAllDays ? report.load.targetStartIndex + hour : hour;
  }

  public onHourChange(hour: number): void {
    this.selectedHour = hour;
  }

  public onToggle(option: keyof ITrafficChartOptions): void {
    this.options = { ...this.options, [option]: !this.options[option] };
    this._options$.next(this.options);
  }
}
