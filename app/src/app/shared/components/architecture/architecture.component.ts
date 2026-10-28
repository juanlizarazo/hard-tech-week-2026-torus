import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { Observable, catchError, map, of, startWith } from 'rxjs';
import { SnapshotService } from '@app/core';
import { RunLogHelper } from '../run-log/run-log.helper';
import { architectureStages } from './architecture.constants';
import { ArchitectureHelper } from './architecture.helper';
import { IArchitectureView } from './architecture.interfaces';

@Component({
  selector: 'dt-architecture',
  imports: [AsyncPipe],
  templateUrl: './architecture.component.html',
  styleUrl: './architecture.component.scss'
})
export class ArchitectureComponent {
  private static _instanceCount = 0;
  private readonly _snapshotService = inject(SnapshotService);

  public readonly idPrefix = `dt-architecture-${ArchitectureComponent._instanceCount++}`;
  public readonly stages = architectureStages;
  public readonly views$: Observable<IArchitectureView[]> = this._snapshotService.status$.pipe(
    map((status) => {
      const ranAt = status.lastRun?.at?.toDate() ?? status.manifest?.pulledAt?.toDate() ?? null;

      return ArchitectureHelper.views(ArchitectureHelper.withLastRun(architectureStages, ranAt ? RunLogHelper.clock(ranAt, new Date()) : null));
    }),
    catchError(() => of(ArchitectureHelper.views(architectureStages))),
    startWith(ArchitectureHelper.views(architectureStages))
  );
  public readonly summary =
    'Pipeline: free public data from EIA-930, CAISO OASIS, Open-Meteo, Rocky Mountain Power tariffs and EIA-860 flows into the refreshSnapshot Cloud Function every day at 3 p.m. Mountain, which validates and publishes a Firestore snapshot. Your browser reads that snapshot and runs the tariff engine, marginal CO2 regression, ridge forecast, site generator, LP with HiGHS and the month-by-month replay, which feed the four screens.';
}
