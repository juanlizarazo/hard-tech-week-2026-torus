import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import highsLoader from 'highs';
import { BacktestMonthsHelper } from '../src/app/core/backtest/backtest-months.helper';
import { BacktestRunnerHelper } from '../src/app/core/backtest/backtest-runner.helper';
import { IBacktestResult, IBacktestStrategy, IBacktestStrategyResult, ILpSolver } from '../src/app/core/backtest/backtest.interfaces';
import { LpStrategyHelper } from '../src/app/core/backtest/lp-strategy.helper';
import { NaiveShaverHelper } from '../src/app/core/backtest/naive-shaver.helper';
import { PlanEngineHelper } from '../src/app/core/plan/plan-engine.helper';
import { ILpInput } from '../src/app/core/plan/plan-engine.interfaces';
import { EmissionsHelper } from '../src/app/core/signals/emissions.helper';
import { SitesHelper } from '../src/app/core/sites/sites.helper';
import { tariffSchedules } from '../src/app/core/tariff/tariff.constants';
import { ITariffSchedule } from '../src/app/core/models';

const firebaseConfig = {
  apiKey: 'AIzaSyBejiEce6IQP0uvWOEJrnGUt5j7Ajsdd-I',
  authDomain: 'hard-tech-week-2026-torus.firebaseapp.com',
  projectId: 'hard-tech-week-2026-torus',
};
const outputPath = 'public/data/backtest-year.json';
const replayDirectory = 'public/data/replays';
const replaySiteIds = ['airport'];

function roundValue(value: unknown): unknown {
  if (typeof value === 'number') {
    const decimals = Math.abs(value) < 1 ? 4 : 2;

    return Number(value.toFixed(decimals));
  }

  if (Array.isArray(value)) {
    return value.map(roundValue);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, roundValue(entry)]));
  }

  return value;
}

function trimResult(result: IBacktestResult): IBacktestResult {
  const emptied = (entry: IBacktestStrategyResult | null): IBacktestStrategyResult | null =>
    entry ? { ...entry, intervals: [] } : entry;

  return roundValue({
    ...result,
    baseline: emptied(result.baseline),
    strategies: result.strategies.map((entry) => emptied(entry)),
    oracle: emptied(result.oracle),
    perfectLoad: emptied(result.perfectLoad),
    shaver: emptied(result.shaver),
  }) as IBacktestResult;
}

function writeReplay(month: string, siteId: string, scheduleId: string, result: IBacktestResult): void {
  mkdirSync(replayDirectory, { recursive: true });
  const path = `${replayDirectory}/${month}-${siteId}-${scheduleId}.json`;
  writeFileSync(path, JSON.stringify(trimResult(result)));
  const gzipKb = gzipSync(readFileSync(path)).length / 1024;
  console.log(`  ${path} ${(statSync(path).size / 1024).toFixed(0)} KB raw, ${gzipKb.toFixed(0)} KB gzip`);
}

async function main(): Promise<void> {
  const app = initializeApp(firebaseConfig);
  await signInAnonymously(getAuth(app));
  const firestore = getFirestore(app);
  const pointer = (await getDoc(doc(firestore, 'config/snapshot'))).data() as Detour.Firestore.Snapshot.IPointer;
  const snapshotId = pointer.pinnedSnapshotId ?? pointer.currentSnapshotId;
  const manifest = (await getDoc(doc(firestore, `snapshots/${snapshotId}`))).data() as Detour.Firestore.Snapshot.IManifest;
  const gridMonths: Detour.Firestore.Snapshot.IGridMonth[] = [];

  for (const entry of manifest.gridMonths) {
    gridMonths.push(
      (await getDoc(doc(firestore, `snapshots/${snapshotId}/gridMonths/${entry.month}`))).data() as Detour.Firestore.Snapshot.IGridMonth,
    );
  }

  const rows = EmissionsHelper.buildRows(gridMonths.flatMap((month) => month.hours));
  const marginalEmissions = EmissionsHelper.marginalSeries(rows, 'fossil-generation');
  const highs = await highsLoader();
  const solver: ILpSolver = { solve: async (input: ILpInput) => PlanEngineHelper.solve(highs, input) };
  const strategies: IBacktestStrategy[] = [
    NaiveShaverHelper.noStorage,
    NaiveShaverHelper.naiveShaver,
    LpStrategyHelper.detour(solver),
    LpStrategyHelper.rollingLp(solver),
    LpStrategyHelper.oracle(solver),
  ];
  const throughDate = BacktestMonthsHelper.throughDate(manifest.pulledAt.toDate());
  const months = BacktestMonthsHelper.availableMonths(manifest.gridMonths, throughDate);
  const schedules = [tariffSchedules.SCHEDULE_8, tariffSchedules.SCHEDULE_6] as ITariffSchedule[];
  const yearRows = [];

  for (const month of months) {
    const gridMonth = gridMonths.find((entry) => entry.month === month)!;

    for (const site of SitesHelper.listArchetypes()) {
      for (const schedule of schedules) {
        const input = BacktestRunnerHelper.buildInput(
          site,
          schedule,
          SitesHelper.getAssets(site.id)!,
          gridMonth,
          null,
          marginalEmissions,
          month,
          BacktestMonthsHelper.partialThrough(month, throughDate),
        );
        const result: IBacktestResult = await BacktestRunnerHelper.run(input, strategies);
        const total = result.lead.savings.total;

        yearRows.push({
          month,
          siteId: site.id,
          scheduleId: schedule.id,
          savedUsd: Math.round(total),
          captureRate: result.lead.captureRate,
          demandShare: total > 0 ? result.lead.savings.demand / total : 0,
          peakKw: Math.round(result.lead.bill.determinants.demandKw),
          wattsmartKwh: Math.round(result.lead.wattsmart.minimumHeldKwh),
        });
        console.log(`${month} ${site.id} ${schedule.id}: $${Math.round(total)} ${result.lead.captureRate}`);

        if (replaySiteIds.includes(site.id)) {
          writeReplay(month, site.id, schedule.id, result);
        }
      }
    }
  }

  writeFileSync(outputPath, `${JSON.stringify({ snapshotId, throughDate, rows: yearRows }, null, 2)}\n`);
  console.log(`Wrote ${yearRows.length} rows to ${outputPath}`);
  process.exit(0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
