import { TariffScheduleId } from '@app/core/models';

export const backtestScreenSettings = {
  DEFAULT_SCHEDULE_ID: 'schedule-8' as TariffScheduleId,
  PENDING_CAPTURE_TEXT: 'pending LP (phase 02)',
  MONTH_LABEL: 'July 2026',
  STRATEGY_COLOR_INDEX: { heuristic: 1, realistic: 2, oracle: 3, baseline: 4 },
  LOAD_COLOR: 'var(--dt-viz-1)',
  GRID_COLOR: 'var(--dt-viz-2)',
  SPIN_COLOR: 'var(--dt-viz-3)',
  PULSE_COLOR: 'var(--dt-viz-4)',
  RUSH_BAND_COLOR: 'var(--dt-viz-band)',
  EMPTY_MESSAGE: 'No grid snapshot is available for July 2026 yet. Please check back shortly.',
  ERROR_MESSAGE: 'We could not run the July 2026 backtest from the snapshot. Check your connection and refresh the page.',
  LOADING_MESSAGE: 'Running the July 2026 backtest…',
};

export const backtestScheduleOptions: { id: TariffScheduleId; label: string }[] = [
  { id: 'schedule-8', label: 'Schedule 8' },
  { id: 'schedule-6', label: 'Schedule 6' },
];
