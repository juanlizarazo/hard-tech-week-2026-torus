import { ISnapshotStatus } from '@app/core/services/snapshot.interfaces';
import { DayRelationHelper } from '@app/shared/helpers/day-relation.helper';
import { snapshotBadgeSettings } from './snapshot-badge.constants';
import { ISnapshotBadgeView } from './snapshot-badge.interfaces';

export class SnapshotBadgeHelper {
  private static readonly _timestampFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: snapshotBadgeSettings.TIMEZONE,
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  private static readonly _pullTimeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: snapshotBadgeSettings.TIMEZONE,
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit'
  });

  public static view(status: ISnapshotStatus, now: Date): ISnapshotBadgeView {
    const manifest = status.manifest;

    if (!manifest) {
      return SnapshotBadgeHelper.unavailable();
    }

    const pulledAt = manifest.pulledAt.toDate();
    const label = `Grid data for ${DayRelationHelper.dayLabel(manifest.targetDate)} · pulled ${SnapshotBadgeHelper.pullTime(pulledAt)}`;
    const isLate = SnapshotBadgeHelper.isLate(manifest.targetDate, now);
    const detail = [
      `Planning day ${manifest.targetDate} (snapshot ${manifest.id}, pulled ${SnapshotBadgeHelper._timestampFormatter.format(pulledAt)} Mountain).`,
      status.isPinned ? 'This snapshot is held fixed for the demo.' : '',
      status.lastRun ? `Last refresh: ${status.lastRun.status}. ${status.lastRun.message}` : ''
    ]
      .filter(Boolean)
      .join('\n');

    if (status.isPinned) {
      return { tone: 'ready', icon: 'push_pin', label, note: snapshotBadgeSettings.PINNED_LABEL, detail };
    }

    if (isLate) {
      return { tone: 'late', icon: 'schedule', label, note: snapshotBadgeSettings.LATE_LABEL, detail };
    }

    return { tone: 'ready', icon: 'event', label, note: snapshotBadgeSettings.REFRESH_LABEL, detail };
  }

  public static isLate(targetDate: string, now: Date): boolean {
    const today = DayRelationHelper.localDate(now);

    if (targetDate < today) {
      return true;
    }

    return targetDate === today && DayRelationHelper.localMinutes(now) >= snapshotBadgeSettings.REFRESH_MINUTES_LOCAL;
  }

  public static pullTime(pulledAt: Date): string {
    return SnapshotBadgeHelper._pullTimeFormatter.format(pulledAt).replace(' AM', ' a.m.').replace(' PM', ' p.m.');
  }

  public static unavailable(): ISnapshotBadgeView {
    return { tone: 'muted', icon: 'cloud_off', label: snapshotBadgeSettings.UNAVAILABLE_LABEL, note: '', detail: '' };
  }

  public static loading(): ISnapshotBadgeView {
    return { tone: 'muted', icon: 'cloud_sync', label: snapshotBadgeSettings.LOADING_LABEL, note: '', detail: '' };
  }
}
