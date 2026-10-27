export interface ISnapshotResolution {
  manifest: Detour.Firestore.Snapshot.IManifest | null;
  requestedSnapshotId: string | null;
  isFallback: boolean;
}

export interface ISnapshotStatus extends ISnapshotResolution {
  lastRun: Detour.Firestore.Snapshot.ILastRun | null;
  pinnedSnapshotId: string | null;
  isPinned: boolean;
  isShowingLastGood: boolean;
}
