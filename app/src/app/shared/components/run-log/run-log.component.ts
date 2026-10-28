import { Component, inject, input } from '@angular/core';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { Observable, catchError, combineLatest, map, of, startWith } from 'rxjs';
import { PlanningDayService, SnapshotService } from '@app/core';
import { RunLogHelper } from './run-log.helper';
import { IRunLogView } from './run-log.interfaces';

@Component({
  selector: 'dt-run-log',
  imports: [AsyncPipe, DecimalPipe],
  templateUrl: './run-log.component.html',
  styleUrl: './run-log.component.scss'
})
export class RunLogComponent {
  private readonly _snapshotService = inject(SnapshotService);
  private readonly _planningDayService = inject(PlanningDayService);

  public readonly solveMs = input<number | null>(null);
  public readonly day$ = this._planningDayService.day$;
  public readonly view$: Observable<IRunLogView> = combineLatest([
    this._snapshotService.status$,
    this._snapshotService.derived$.pipe(startWith(null))
  ]).pipe(
    map(([status, derived]) => RunLogHelper.view(status, derived, new Date())),
    catchError((error: unknown) => {
      console.error('Failed to build the run log', error);

      return of(RunLogHelper.empty());
    }),
    startWith(RunLogHelper.empty())
  );
}
