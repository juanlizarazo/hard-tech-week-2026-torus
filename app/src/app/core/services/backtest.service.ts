import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, defer, from, map, shareReplay } from 'rxjs';
import { backtestSettings } from '../backtest/backtest.constants';
import { IBacktestResult, IBacktestSnapshotSources, IBacktestStrategy } from '../backtest/backtest.interfaces';
import { BacktestRunnerHelper } from '../backtest/backtest-runner.helper';
import { NaiveShaverHelper } from '../backtest/naive-shaver.helper';
import { IMarginalEmissionsSeries, ITariffSchedule, TariffScheduleId } from '../models';
import { SitesHelper } from '../sites/sites.helper';
import { tariffSchedules } from '../tariff/tariff.constants';
import { GridSignalsService } from './grid-signals.service';
import { SnapshotService } from './snapshot.service';

@Injectable({ providedIn: 'root' })
export class BacktestService {
  private readonly _snapshotService = inject(SnapshotService);
  private readonly _gridSignalsService = inject(GridSignalsService);

  public readonly strategies: IBacktestStrategy[] = [NaiveShaverHelper.noStorage, NaiveShaverHelper.naiveShaver];

  public readonly sources$: Observable<IBacktestSnapshotSources> = combineLatest([
    this._snapshotService.manifest$,
    this._snapshotService.getGridMonth(backtestSettings.MONTH),
    this._snapshotService.getPriceMonth(backtestSettings.MONTH),
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

      const input = BacktestRunnerHelper.buildInput(
        site,
        schedule,
        assets,
        sources.gridMonth,
        sources.priceMonth,
        sources.marginalEmissions,
      );

      return from(BacktestRunnerHelper.run(input, this.strategies));
    });
  }
}
