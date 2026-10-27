import { ISnapshotStatus } from '@app/core/services/snapshot.interfaces';
import { snapshotBadgeSettings } from './snapshot-badge.constants';
import { ISnapshotBadgeView } from './snapshot-badge.interfaces';

export class SnapshotBadgeHelper {
  private static readonly _localDateFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: snapshotBadgeSettings.TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  private static readonly _timestampFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: snapshotBadgeSettings.TIMEZONE,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  public static view(status: ISnapshotStatus, now: Date): ISnapshotBadgeView {
    const manifest = status.manifest;

    if (!manifest) {
      return SnapshotBadgeHelper.unavailable();
    }

    const targetLabel = SnapshotBadgeHelper.dayLabel(manifest.targetDate);
    const isLate = manifest.targetDate < SnapshotBadgeHelper.localDate(now);
    const detail = [
      `Planning day ${manifest.targetDate} (snapshot ${manifest.id}, pulled ${SnapshotBadgeHelper._timestampFormatter.format(manifest.pulledAt.toDate())} Mountain).`,
      status.isPinned ? 'This snapshot is held fixed for the demo.' : '',
      status.lastRun ? `Last refresh: ${status.lastRun.status}. ${status.lastRun.message}` : ''
    ]
      .filter(Boolean)
      .join('\n');

    if (isLate) {
      return { tone: 'late', icon: 'schedule', label: `Grid data for ${targetLabel}`, note: snapshotBadgeSettings.LATE_LABEL, detail };
    }

    return { tone: 'ready', icon: 'event', label: `Grid data for ${targetLabel}`, note: snapshotBadgeSettings.REFRESH_LABEL, detail };
  }

  public static unavailable(): ISnapshotBadgeView {
    return { tone: 'muted', icon: 'cloud_off', label: snapshotBadgeSettings.UNAVAILABLE_LABEL, note: '', detail: '' };
  }

  public static loading(): ISnapshotBadgeView {
    return { tone: 'muted', icon: 'cloud_sync', label: snapshotBadgeSettings.LOADING_LABEL, note: '', detail: '' };
  }

  public static localDate(date: Date): string {
    return SnapshotBadgeHelper._localDateFormatter.format(date);
  }

  public static dayLabel(localDate: string): string {
    const [year, month, day] = localDate.split('-').map(Number);
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric' }).formatToParts(
      new Date(Date.UTC(year, month - 1, day))
    );
    const part = (type: Intl.DateTimeFormatPartTypes): string => parts.find((entry) => entry.type === type)?.value ?? '';

    return `${part('weekday')} ${part('month')} ${part('day')}`;
  }
}
