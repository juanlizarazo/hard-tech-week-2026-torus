import { IBacktestCalendar, IBacktestYear, IBacktestYearRow } from '@app/core/backtest';
import { tariffSchedules } from '@app/core/tariff/tariff.constants';
import { ITariffSchedule } from '@app/core/models';
import { monthNames } from './backtest.constants';
import { BacktestHelper } from './backtest.helper';
import { IYearLedger, IYearLedgerMonth } from './backtest.interfaces';

export class YearLedgerHelper {
  public static build(
    calendar: IBacktestCalendar,
    year: IBacktestYear | null,
    siteId: string,
    scheduleId: string,
  ): IYearLedger {
    const schedule = (Object.values(tariffSchedules) as ITariffSchedule[]).find(
      (candidate: ITariffSchedule) => candidate.id === scheduleId,
    );
    const summerMonths = schedule?.summerMonths ?? [];
    const rows = new Map<string, IBacktestYearRow>(
      (year?.rows ?? [])
        .filter((row: IBacktestYearRow) => row.siteId === siteId && row.scheduleId === scheduleId)
        .map((row: IBacktestYearRow): [string, IBacktestYearRow] => [row.month, row]),
    );
    const ceilingOf = (row: IBacktestYearRow): number =>
      row.captureRate !== null && row.captureRate > 0 ? row.savedUsd / row.captureRate : row.savedUsd;
    const scaleMax = Math.max(1, ...Array.from(rows.values()).map(ceilingOf));
    const months = calendar.months.map((month: string): IYearLedgerMonth => {
      const row = rows.get(month);
      const monthNumber = Number(month.slice(5, 7));
      const isPartial = month === calendar.throughDate.slice(0, 7) && !YearLedgerHelper.isFullMonth(month, calendar.throughDate);
      const name = BacktestHelper.monthName(month);
      const status = isPartial ? ', month to date' : '';

      return {
        month,
        shortLabel: monthNames[monthNumber - 1],
        initialLabel: monthNames[monthNumber - 1].charAt(0),
        valueLabel: row ? BacktestHelper.formatMoney(row.savedUsd) : '—',
        savedFraction: row ? Math.max(0, row.savedUsd) / scaleMax : 0,
        ceilingFraction: row ? Math.max(0, ceilingOf(row)) / scaleMax : 0,
        hasData: row !== undefined,
        isSummer: summerMonths.includes(monthNumber),
        isPartial,
        ariaLabel: row
          ? `${name} ${month.slice(0, 4)}${status}, ${BacktestHelper.formatMoney(row.savedUsd)} saved, ${row.captureRate === null ? 'capture not available' : `${BacktestHelper.formatNumber(row.captureRate * 100)}% capture`}`
          : `${name} ${month.slice(0, 4)}${status}, no summary yet`,
      };
    });
    const summerIndexes = months.map((entry, index) => (entry.isSummer ? index : -1)).filter((index) => index >= 0);
    const totals = Array.from(rows.values());
    const savedTotal = totals.reduce((sum: number, row: IBacktestYearRow) => sum + row.savedUsd, 0);
    const ceilingTotal = totals.reduce((sum: number, row: IBacktestYearRow) => sum + ceilingOf(row), 0);
    const first = months[0]?.shortLabel ?? '';
    const last = months[months.length - 1]?.shortLabel ?? '';
    const partial = months.find((entry) => entry.isPartial);
    const ranked = [...rows.values()].sort((first: IBacktestYearRow, second: IBacktestYearRow) => second.savedUsd - first.savedUsd);
    const labelOf = (row: IBacktestYearRow): string =>
      `${months.find((entry: IYearLedgerMonth) => entry.month === row.month)?.shortLabel} ${BacktestHelper.formatMoney(row.savedUsd)}`;

    return {
      months,
      title: `Year to date, ${first}–${last} ${calendar.throughDate.slice(0, 4)}`,
      summary:
        totals.length === 0
          ? 'The year summary is not available yet; pick a month to replay it.'
          : `${BacktestHelper.formatMoney(savedTotal)} saved across ${months.length} months, ${BacktestHelper.formatNumber((savedTotal / ceilingTotal) * 100)}% of perfect hindsight. Best month ${labelOf(ranked[0])}, weakest ${labelOf(ranked[ranked.length - 1])}.`,
      summerRange: summerIndexes.length > 0 ? [summerIndexes[0], summerIndexes[summerIndexes.length - 1]] : null,
      partialLabel: partial ? `${partial.shortLabel} 1–${Number(calendar.throughDate.slice(8, 10))}, to date` : '',
      note: year && year.snapshotId !== calendar.snapshotId ? `Year summary from snapshot ${year.snapshotId}.` : '',
    };
  }

  private static isFullMonth(month: string, throughDate: string): boolean {
    const [year, monthNumber] = month.split('-').map(Number);

    return Number(throughDate.slice(8, 10)) >= new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  }
}
