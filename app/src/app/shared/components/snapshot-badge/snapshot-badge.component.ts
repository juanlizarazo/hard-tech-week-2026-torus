import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { SnapshotService } from '@app/core';
import { SnapshotBadgeHelper } from './snapshot-badge.helper';
import { ISnapshotBadgeView } from './snapshot-badge.interfaces';

@Component({
  selector: 'dt-snapshot-badge',
  imports: [AsyncPipe, MatIconModule],
  templateUrl: './snapshot-badge.component.html',
  styleUrl: './snapshot-badge.component.scss'
})
export class SnapshotBadgeComponent {
  private readonly _snapshotService = inject(SnapshotService);

  public readonly view$: Observable<ISnapshotBadgeView> = this._snapshotService.status$.pipe(
    map((status) => SnapshotBadgeHelper.view(status, new Date())),
    catchError(() => of(SnapshotBadgeHelper.unavailable())),
    startWith(SnapshotBadgeHelper.loading())
  );
}
