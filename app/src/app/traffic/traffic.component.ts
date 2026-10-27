import { Component, inject } from '@angular/core';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable, map } from 'rxjs';
import { GridSignalsService, SnapshotService, emissionFactors } from '@app/core';
import { IEmissionFactor } from '@app/core/models';
import { AlertBannerComponent, HourChartComponent, ScreenToolbarComponent } from '@app/shared/components';
import { RankSlopeComponent } from './components/rank-slope/rank-slope.component';
import { trafficLimitations, trafficMethodSteps } from './traffic.constants';
import { ITrafficViewModel } from './traffic.interfaces';
import { TrafficHelper } from './traffic.helper';
import { TrafficViewStateHelper } from './traffic-view-state.helper';

@Component({
  selector: 'dt-traffic',
  imports: [
    AsyncPipe,
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

  public readonly factors: IEmissionFactor[] = [emissionFactors.COAL, emissionFactors.GAS];
  public readonly limitations = trafficLimitations;
  public readonly methodSteps = trafficMethodSteps;
  public readonly megawattFormat = (value: number): string => `${Math.round(value).toLocaleString()} MW`;
  public readonly priceFormat = (value: number): string => `$${value.toFixed(0)}/MWh`;
  public readonly carbonFormat = (value: number): string => `${Math.round(value).toLocaleString()} lb/MWh`;

  public readonly viewModel$: Observable<ITrafficViewModel> = TrafficViewStateHelper.fromSources({
    manifest$: this._snapshotService.manifest$,
    history$: this._gridSignalsService.history$,
    priceHours$: this._gridSignalsService.targetPriceHours$,
    marginalSeries$: this._gridSignalsService.marginalEmissions$,
    averagePoints$: this._gridSignalsService.averageEmissions$,
    score$: this._gridSignalsService.forecastScore$
  }).pipe(
    map((state): ITrafficViewModel => ({
      state,
      charts: state.report ? TrafficHelper.charts(state.report) : null
    }))
  );

  public absoluteValue(value: number): number {
    return Math.abs(value);
  }

  public hourWindowLabel(startHour: number, endHourExclusive: number): string {
    return `${TrafficHelper.hourLabel(startHour)}–${TrafficHelper.hourLabel(endHourExclusive % 24)}`;
  }
}
