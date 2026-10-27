import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { SnapshotService } from '@app/core';
import { ISnapshotBadgeView } from './snapshot-badge.interfaces';

@Component({
  selector: 'dt-snapshot-badge',
  imports: [AsyncPipe, MatIconModule],
  templateUrl: './snapshot-badge.component.html',
  styleUrl: './snapshot-badge.component.scss'
})
export class SnapshotBadgeComponent {
  private readonly _snapshotService = inject(SnapshotService);
  private readonly _dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    month: 'short',
    day: 'numeric'
  });

  public readonly view$: Observable<ISnapshotBadgeView> = this._snapshotService.status$.pipe(
    map((status): ISnapshotBadgeView => {
      if (!status.manifest) {
        return { tone: 'muted', icon: 'cloud_off', label: 'Grid data unavailable', detail: '' };
      }

      const dataDate = this._dateFormatter.format(status.manifest.pulledAt.toDate());
      const detail = [
        `Snapshot ${status.manifest.id}, planning ${status.manifest.targetDate}`,
        status.lastRun ? `Last refresh: ${status.lastRun.status}. ${status.lastRun.message}` : ''
      ]
        .filter(Boolean)
        .join('\n');

      if (status.isShowingLastGood) {
        return { tone: 'stale', icon: 'history', label: `Showing last good data (${dataDate})`, detail };
      }

      if (status.isPinned) {
        return { tone: 'pinned', icon: 'push_pin', label: `Grid data from ${dataDate} · Pinned for demo`, detail };
      }

      return { tone: 'ready', icon: 'cloud_done', label: `Grid data from ${dataDate} · refreshes daily 3 p.m.`, detail };
    }),
    catchError(() => of<ISnapshotBadgeView>({ tone: 'muted', icon: 'cloud_off', label: 'Grid data unavailable', detail: '' })),
    startWith<ISnapshotBadgeView>({ tone: 'muted', icon: 'cloud_sync', label: 'Loading grid data…', detail: '' })
  );
}
