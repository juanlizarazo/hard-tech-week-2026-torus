import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, startWith } from 'rxjs';
import { DayRelationHelper } from '@app/shared/helpers/day-relation.helper';
import { IPlanningDay } from '@app/shared/helpers/day-relation.interfaces';
import { SnapshotService } from './snapshot.service';

@Injectable({ providedIn: 'root' })
export class PlanningDayService {
  private readonly _snapshotService = inject(SnapshotService);

  public readonly day$: Observable<IPlanningDay> = this._snapshotService.manifest$.pipe(
    map((manifest) => DayRelationHelper.planningDay(manifest?.targetDate ?? null, new Date())),
    catchError(() => of(DayRelationHelper.unknownDay())),
    startWith(DayRelationHelper.unknownDay()),
    shareReplay(1)
  );
}
