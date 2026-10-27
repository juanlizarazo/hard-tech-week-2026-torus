import { Component, inject } from '@angular/core';
import { AsyncPipe, DatePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Observable } from 'rxjs';
import { SnapshotService } from '@app/core';
import { ISnapshotViewState } from '../../interfaces/snapshot-view-state.interfaces';
import { SnapshotViewStateHelper } from '../../helpers/snapshot-view-state.helper';

@Component({
  selector: 'dt-snapshot-badge',
  imports: [AsyncPipe, DatePipe, MatIconModule],
  templateUrl: './snapshot-badge.component.html',
  styleUrl: './snapshot-badge.component.scss'
})
export class SnapshotBadgeComponent {
  private readonly _snapshotService = inject(SnapshotService);

  public readonly state$: Observable<ISnapshotViewState> = SnapshotViewStateHelper.fromManifest(
    this._snapshotService.manifest$
  );
}
