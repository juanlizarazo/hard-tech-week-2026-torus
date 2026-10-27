import { TariffScheduleId } from '@app/core/models';
import { BacktestStrategyRole } from '@app/core/backtest';
import { IBacktestScheduleOption } from './backtest.interfaces';

export const backtestScreenSettings = {
  DEFAULT_SCHEDULE_ID: 'schedule-8' as TariffScheduleId,
  MONTH_LABEL: 'July 2026',
  CALENDAR_SCALE_STEP_KW: 100,
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
  'perfect-load': 'DETOUR with a perfect load forecast',
  oracle: 'Perfect hindsight',
};

export const backtestStrategyColors: Record<BacktestStrategyRole, string> = {
  baseline: 'var(--dt-theme--chart-muted-line)',
  heuristic: 'var(--dt-muted)',
  realistic: 'var(--dt-clear-mark)',
  'perfect-load': 'var(--dt-clear)',
  oracle: 'var(--dt-ink)',
};

export const backtestScheduleOptions: IBacktestScheduleOption[] = [
  { id: 'schedule-8', label: 'Schedule 8' },
  { id: 'schedule-6', label: 'Schedule 6' },
];

export const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const longMonthNames = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
];
