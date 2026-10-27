import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Observable } from 'rxjs';
import { SnapshotService } from '@app/core';
import { AlertBannerComponent, ScreenToolbarComponent } from '@app/shared/components';
import { ISnapshotViewState } from '@app/shared/interfaces/snapshot-view-state.interfaces';
import { SnapshotViewStateHelper } from '@app/shared/helpers/snapshot-view-state.helper';

@Component({
  selector: 'dt-traffic',
  imports: [
    AsyncPipe,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    AlertBannerComponent,
    ScreenToolbarComponent
  ],
  templateUrl: './traffic.component.html',
  styleUrl: './traffic.component.scss'
})
export class TrafficComponent {
  private readonly _snapshotService = inject(SnapshotService);

  public readonly state$: Observable<ISnapshotViewState> = SnapshotViewStateHelper.fromManifest(
    this._snapshotService.manifest$
  );
}
