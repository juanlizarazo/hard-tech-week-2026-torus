import { SnapshotBadgeHelper } from './snapshot-badge.helper';

describe('SnapshotBadgeHelper', () => {
  it('flags a same-day snapshot as late only after the 3:30 p.m. refresh window', () => {
    expect(SnapshotBadgeHelper.isLate('2026-10-27', new Date('2026-10-27T20:00:00Z'))).toBe(false);
    expect(SnapshotBadgeHelper.isLate('2026-10-27', new Date('2026-10-27T22:00:00Z'))).toBe(true);
    expect(SnapshotBadgeHelper.isLate('2026-10-26', new Date('2026-10-27T15:00:00Z'))).toBe(true);
    expect(SnapshotBadgeHelper.isLate('2026-10-28', new Date('2026-10-28T03:00:00Z'))).toBe(false);
  });

  it('shows the pull time in Mountain time', () => {
    expect(SnapshotBadgeHelper.pullTime(new Date('2026-10-27T21:04:00Z'))).toBe('Tue 3:04 p.m.');
  });
});
