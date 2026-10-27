import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { GridSignalsService, LoadForecastService, SnapshotService, emissionFactors } from '@app/core';
import { weatherWeightsProvenance } from '@app/core/forecast/load-forecast.constants';
import {
  AlertBannerComponent,
  ChartFrameComponent,
  FigureComponent,
  HourChartComponent,
  SourceChipComponent,
  TermComponent,
  UnderTheHoodComponent
} from '@app/shared/components';
import { RankSlopeComponent } from './components/rank-slope/rank-slope.component';
import {
  forecastLimitations,
  forecastMethodSteps,
  trafficChartDefaults,
  trafficLimitations,
  trafficMethodSteps
} from './traffic.constants';
import { TrafficHelper } from './traffic.helper';
import { ITrafficChartOptions } from './traffic.interfaces';
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
    RankSlopeComponent,
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
  private readonly _options$ = new BehaviorSubject<ITrafficChartOptions>({ ...trafficChartDefaults });

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

  public options = this._options$.value;

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
    this._options$
  ]).pipe(
    map(([state, forecastState, options]) => ({
      state,
      hasOurForecast: !!forecastState.forecast,
      charts: state.report ? TrafficHelper.charts(state.report, forecastState.forecast, options) : null,
      answer: state.report ? TrafficHelper.answer(state.report) : [],
      notices: state.report ? TrafficHelper.notices(state.report) : null
    }))
  );

  public onToggle(option: keyof ITrafficChartOptions): void {
    this.options = { ...this.options, [option]: !this.options[option] };
    this._options$.next(this.options);
  }
}
