import { TariffScheduleId } from '@app/core/models';
import { BacktestStrategyRole } from '@app/core/backtest';

export const backtestScreenSettings = {
  DEFAULT_SCHEDULE_ID: 'schedule-8' as TariffScheduleId,
  MONTH_LABEL: 'July 2026',
  LOAD_COLOR: 'var(--dt-ink)',
  GRID_COLOR: 'var(--dt-clear-mark)',
  SPIN_COLOR: 'var(--dt-spin)',
  PULSE_COLOR: 'var(--dt-pulse)',
  ON_PEAK_BAND_COLOR: 'var(--dt-muted)',
  EMPTY_MESSAGE: "Grid data isn't loaded yet. Refresh in a minute.",
  ERROR_MESSAGE: 'We could not replay July 2026 from the grid data. Check your connection and refresh the page.',
  LOADING_MESSAGE: 'Replaying July 2026 day by day. This takes about ten seconds…',
};

export const backtestStrategyNames: Record<BacktestStrategyRole, string> = {
  baseline: 'No storage',
  heuristic: 'Simple shaver',
  realistic: 'DETOUR',
  oracle: 'Perfect hindsight',
};

export const backtestStrategyColors: Record<BacktestStrategyRole, string> = {
  baseline: '#a3adb5',
  heuristic: 'var(--dt-muted)',
  realistic: 'var(--dt-clear-mark)',
  oracle: 'var(--dt-ink)',
};

export const backtestScheduleOptions: { id: TariffScheduleId; label: string }[] = [
  { id: 'schedule-8', label: 'Schedule 8' },
  { id: 'schedule-6', label: 'Schedule 6' },
];
