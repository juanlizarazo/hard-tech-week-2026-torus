export interface ISnapshotViewState {
  status: 'loading' | 'empty' | 'error' | 'ready';
  manifest: Detour.Firestore.Snapshot.IManifest | null;
  errorMessage: string;
}
