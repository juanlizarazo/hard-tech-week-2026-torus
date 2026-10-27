export interface ISnapshotBadgeView {
  tone: 'ready' | 'pinned' | 'stale' | 'muted';
  icon: string;
  label: string;
  detail: string;
}
