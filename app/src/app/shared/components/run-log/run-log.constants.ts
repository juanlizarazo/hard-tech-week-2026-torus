export const runLogSettings = {
  TIMEZONE: 'America/Denver',
  BATCH_SOURCE: 'Cloud batch',
  SCHEDULED_HOUR: 15,
  SCHEDULED_WINDOW_HOURS: 3,
  SCHEDULED_LABEL: 'Ran itself at',
  OTHER_LABEL: 'Data pulled at'
};

export const runStatusLabels: Record<Detour.Firestore.Snapshot.RunStatus, string> = {
  flipped: 'Published',
  'pinned-skip': 'Kept the pinned snapshot',
  rejected: 'Rejected, kept last good',
  failed: 'Failed, kept last good'
};
