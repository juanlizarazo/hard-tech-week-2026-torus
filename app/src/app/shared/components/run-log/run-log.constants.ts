export const runLogSettings = {
  TIMEZONE: 'America/Denver',
  BATCH_SOURCE: 'Cloud batch'
};

export const runStatusLabels: Record<Detour.Firestore.Snapshot.RunStatus, string> = {
  flipped: 'Published',
  'pinned-skip': 'Kept the pinned snapshot',
  rejected: 'Rejected, kept last good',
  failed: 'Failed, kept last good'
};
