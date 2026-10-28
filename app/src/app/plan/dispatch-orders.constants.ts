export const dispatchOrderActions = {
  CHARGE: 'charge',
  HOLD: 'hold',
  CAP: 'cap',
  DISCHARGE: 'discharge',
  CATCH: 'catch'
} as const;

export const dispatchOrderAssets = {
  SPIN: 'spin',
  PULSE: 'pulse',
  BOTH: 'both'
} as const;

export const dispatchOrderSettings = {
  MIN_KW: 1,
  MERGE_GAP_STEPS: 2,
  MAX_CHARGE_BLOCKS: 2,
  MAX_DISCHARGE_BLOCKS: 2,
  STEP_HOURS: 0.25,
  MIXED_SHARE_MIN: 0.15,
  LB_PER_KG: 2.20462,
  PRICE_TIE_PER_KWH: 0.0005
};

export const dispatchOrderLabels = {
  ACTION_CHARGE: 'Charge',
  ACTION_HOLD: 'Hold',
  ACTION_CAP: 'Cap grid',
  ACTION_DISCHARGE: 'Discharge',
  ACTION_CATCH: 'Catch spikes',
  ASSET_SPIN: 'Spin',
  ASSET_PULSE: 'Pulse',
  ASSET_BOTH: 'Spin + Pulse'
};

export const dispatchCsvSettings = {
  FILE_PREFIX: 'detour-plan',
  HEADER: [
    'local_time',
    'utc_time',
    'grid_kw',
    'spin_charge_kw',
    'spin_discharge_kw',
    'pulse_charge_kw',
    'pulse_discharge_kw',
    'pulse_soc_kwh',
    'pulse_soc_pct',
    'reserve_floor_kwh',
    'on_peak',
    'rush_hour'
  ]
};
