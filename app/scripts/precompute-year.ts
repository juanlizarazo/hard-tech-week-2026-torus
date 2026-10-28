import { writeFileSync } from 'node:fs';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import highsLoader from 'highs';
import { BacktestMonthsHelper } from '../src/app/core/backtest/backtest-months.helper';
import { BacktestRunnerHelper } from '../src/app/core/backtest/backtest-runner.helper';
import { IBacktestResult, IBacktestStrategy, ILpSolver } from '../src/app/core/backtest/backtest.interfaces';
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
