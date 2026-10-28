import { IDerivedSignals } from '@app/core/models';
import { ISnapshotStatus } from '@app/core/services/snapshot.interfaces';
import { DayRelationHelper } from '@app/shared/helpers/day-relation.helper';
import { runLogSettings, runStatusLabels } from './run-log.constants';
import { IRunLogRow, IRunLogView } from './run-log.interfaces';

export class RunLogHelper {
  private static readonly _clockFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: runLogSettings.TIMEZONE,
    hour: 'numeric',
    minute: '2-digit'
  });

  private static readonly _hourFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: runLogSettings.TIMEZONE,
    hour: 'numeric',
    hourCycle: 'h23'
  });

  private static readonly _weekdayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: runLogSettings.TIMEZONE,
    weekday: 'short'
  });

  public static view(status: ISnapshotStatus, derived: IDerivedSignals | null, now: Date): IRunLogView {
    const manifest = status.manifest;

    if (!manifest) {
      return RunLogHelper.empty();
    }

    const pulledAt = RunLogHelper.dateOf(manifest.pulledAt);
    const weatherPulledAt = RunLogHelper.dateOf(manifest.weatherPulledAt);
    const derivedAt = derived?.derivedAt ? new Date(derived.derivedAt) : null;
    const isRunForThisSnapshot = !!status.lastRun && (!status.lastRun.snapshotId || status.lastRun.snapshotId === manifest.id);
    const filteredRows = manifest.filteredRows ?? null;
    const rows: (IRunLogRow | null)[] = [
      RunLogHelper.row(pulledAt, now, 'Read PACE load, forecast and fuel mix', 'EIA-930'),
      RunLogHelper.row(pulledAt, now, 'Read EDAM prices', 'CAISO OASIS'),
      RunLogHelper.row(weatherPulledAt, now, 'Read weather', 'Open-Meteo'),
      filteredRows === null
        ? null
        : RunLogHelper.row(
            pulledAt,
            now,
            `Validated, ${filteredRows.toLocaleString('en-US')} ${filteredRows === 1 ? 'row' : 'rows'} filtered`,
            isRunForThisSnapshot && status.lastRun ? runStatusLabels[status.lastRun.status] : runLogSettings.BATCH_SOURCE
          ),
      RunLogHelper.row(derivedAt, now, 'Fitted marginal CO2 and the forecast', runLogSettings.BATCH_SOURCE)
    ];

    return {
      ranAt: pulledAt ? RunLogHelper.clock(pulledAt, now) : null,
      ranLabel: pulledAt && RunLogHelper.isScheduledWindow(pulledAt) ? runLogSettings.SCHEDULED_LABEL : runLogSettings.OTHER_LABEL,
      rows: rows.filter((row): row is IRunLogRow => row !== null)
    };
  }

  public static empty(): IRunLogView {
    return { ranAt: null, ranLabel: runLogSettings.OTHER_LABEL, rows: [] };
  }

  public static isScheduledWindow(instant: Date): boolean {
    const hour = Number(RunLogHelper._hourFormatter.format(instant));

    return hour >= runLogSettings.SCHEDULED_HOUR && hour < runLogSettings.SCHEDULED_HOUR + runLogSettings.SCHEDULED_WINDOW_HOURS;
  }

  public static clock(instant: Date, now: Date): string {
    const time = RunLogHelper._clockFormatter.format(instant).replace(' AM', ' a.m.').replace(' PM', ' p.m.');

    return DayRelationHelper.localDate(instant) === DayRelationHelper.localDate(now)
      ? time
      : `${RunLogHelper._weekdayFormatter.format(instant)} ${time}`;
  }

  private static row(instant: Date | null, now: Date, step: string, source: string): IRunLogRow | null {
    return instant ? { time: RunLogHelper.clock(instant, now), step, source } : null;
  }

  private static dateOf(timestamp: { toDate: () => Date } | null | undefined): Date | null {
    if (!timestamp || typeof timestamp.toDate !== 'function') {
      return null;
    }

    const date = timestamp.toDate();

    return Number.isNaN(date.getTime()) ? null : date;
  }
}
