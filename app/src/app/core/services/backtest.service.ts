import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, defer, from, map, of, shareReplay, tap } from 'rxjs';
import { IBacktestCalendar, IBacktestResult, IBacktestSnapshotSources, IBacktestStrategy } from '../backtest/backtest.interfaces';
import { BacktestMonthsHelper } from '../backtest/backtest-months.helper';
import { BacktestRunnerHelper } from '../backtest/backtest-runner.helper';
import { LpStrategyHelper } from '../backtest/lp-strategy.helper';
import { NaiveShaverHelper } from '../backtest/naive-shaver.helper';
import { IMarginalEmissionsSeries, ITariffSchedule, TariffScheduleId } from '../models';
import { PlanSolverService } from '../plan/plan-solver.service';
import { SitesHelper } from '../sites/sites.helper';
import { tariffSchedules } from '../tariff/tariff.constants';
import { GridSignalsService } from './grid-signals.service';
import { SnapshotService } from './snapshot.service';

@Injectable({ providedIn: 'root' })
export class BacktestService {
  private readonly _snapshotService = inject(SnapshotService);
  private readonly _gridSignalsService = inject(GridSignalsService);
  private readonly _planSolverService = inject(PlanSolverService);

  public readonly strategies: IBacktestStrategy[] = [
    NaiveShaverHelper.noStorage,
    NaiveShaverHelper.naiveShaver,
    LpStrategyHelper.detour(this._planSolverService),
    LpStrategyHelper.rollingLp(this._planSolverService),
    LpStrategyHelper.oracle(this._planSolverService),
  ];

  private readonly _sourcesCache = new Map<string, Observable<IBacktestSnapshotSources>>();

  private readonly _resultCache = new Map<string, IBacktestResult>();

  public readonly calendar$: Observable<IBacktestCalendar | null> = this._snapshotService.manifest$.pipe(
    map((manifest) => {
      if (!manifest) {
        return null;
      }

      const throughDate = BacktestMonthsHelper.throughDate(manifest.pulledAt.toDate());

      return { snapshotId: manifest.id, months: BacktestMonthsHelper.availableMonths(manifest.gridMonths, throughDate), throughDate };
    }),
    shareReplay(1),
  );

  public sourcesFor(month: string): Observable<IBacktestSnapshotSources> {
    const cached = this._sourcesCache.get(month);

    if (cached) {
      return cached;
    }

    const sources$ = combineLatest([
      this._snapshotService.manifest$,
      this._snapshotService.getGridMonth(month),
      this._snapshotService.getPriceMonth(month),
      this._gridSignalsService.marginalEmissions$,
    ]).pipe(
      map(
        ([manifest, gridMonth, priceMonth, seriesList]): IBacktestSnapshotSources => ({
          manifest,
          gridMonth,
          priceMonth,
          marginalEmissions:
            seriesList.find((series: IMarginalEmissionsSeries) => series.method === 'fossil-generation') ?? null,
        }),
      ),
      shareReplay(1),
    );
    this._sourcesCache.set(month, sources$);

    return sources$;
  }

  public run(
    sources: IBacktestSnapshotSources,
    siteId: string,
    scheduleId: TariffScheduleId,
  ): Observable<IBacktestResult> {
    return defer(() => {
      const site = SitesHelper.getArchetype(siteId);
      const assets = SitesHelper.getAssets(siteId);
      const schedule = (Object.values(tariffSchedules) as ITariffSchedule[]).find(
        (candidate: ITariffSchedule) => candidate.id === scheduleId,
      );

      if (!site || !assets || !schedule || !sources.gridMonth || !sources.marginalEmissions) {
        throw new Error('The backtest is missing a site, tariff, grid month or marginal emissions series.');
      }

      const month = sources.gridMonth.month;
      const throughDate = sources.manifest
        ? BacktestMonthsHelper.partialThrough(
            month,
            BacktestMonthsHelper.throughDate(sources.manifest.pulledAt.toDate()),
          )
        : null;
      const input = BacktestRunnerHelper.buildInput(
        site,
        schedule,
        assets,
        sources.gridMonth,
        sources.priceMonth,
        sources.marginalEmissions,
        month,
        throughDate,
      );

      const key = `${month}|${siteId}|${scheduleId}`;
      const cached = this._resultCache.get(key);

      if (cached) {
        return of(cached);
      }

      return from(BacktestRunnerHelper.run(input, this.strategies)).pipe(
        tap((result: IBacktestResult) => this._resultCache.set(key, result)),
      );
    });
  }
}
