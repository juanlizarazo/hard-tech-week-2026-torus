import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { combineLatest, map } from 'rxjs';
import { GridSignalsService, LoadForecastService, SnapshotService, emissionFactors } from '@app/core';
import { weatherWeightsProvenance } from '@app/core/forecast/load-forecast.constants';
import { AlertBannerComponent, HourChartComponent, ScreenToolbarComponent } from '@app/shared/components';
import { RankSlopeComponent } from './components/rank-slope/rank-slope.component';
import { forecastLimitations, forecastMethodSteps, trafficLimitations, trafficMethodSteps } from './traffic.constants';
import { TrafficHelper } from './traffic.helper';
import { TrafficViewStateHelper } from './traffic-view-state.helper';

@Component({
  selector: 'dt-traffic',
  imports: [
    AsyncPipe,
    DatePipe,
    DecimalPipe,
    MatCardModule,
    MatExpansionModule,
    MatIconModule,
    MatProgressSpinnerModule,
    AlertBannerComponent,
    HourChartComponent,
    RankSlopeComponent,
    ScreenToolbarComponent
  ],
  templateUrl: './traffic.component.html',
  styleUrl: './traffic.component.scss'
})
export class TrafficComponent {
  private readonly _snapshotService = inject(SnapshotService);
  private readonly _gridSignalsService = inject(GridSignalsService);
  private readonly _loadForecastService = inject(LoadForecastService);

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
    this.forecastViewModel$
  ]).pipe(
    map(([state, forecastState]) => ({
      state,
      charts: state.report ? TrafficHelper.charts(state.report, forecastState.forecast) : null
    }))
  );
}
