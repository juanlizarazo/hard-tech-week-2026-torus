import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Observable } from 'rxjs';
import { SnapshotService } from '@app/core';
import {
  AlertBannerComponent,
  ScreenToolbarComponent,
  SimulatedBadgeComponent
} from '@app/shared/components';
import { ISnapshotViewState } from '@app/shared/interfaces/snapshot-view-state.interfaces';
import { IPlanSiteCard } from './plan.interfaces';
import { PlanHelper } from './plan.helper';
import { SnapshotViewStateHelper } from '@app/shared/helpers/snapshot-view-state.helper';

@Component({
  selector: 'dt-plan',
  imports: [
    AsyncPipe,
    CurrencyPipe,
    DecimalPipe,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    AlertBannerComponent,
    ScreenToolbarComponent,
    SimulatedBadgeComponent
  ],
  templateUrl: './plan.component.html',
  styleUrl: './plan.component.scss'
})
export class PlanComponent {
  private readonly _snapshotService = inject(SnapshotService);

  public readonly siteCards: IPlanSiteCard[] = PlanHelper.buildSiteCards();

  public readonly state$: Observable<ISnapshotViewState> = SnapshotViewStateHelper.fromManifest(
    this._snapshotService.manifest$
  );
}
