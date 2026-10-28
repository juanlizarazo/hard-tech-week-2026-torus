import { IArchitectureStage } from './architecture.interfaces';

export const architectureStages: IArchitectureStage[] = [
  {
    id: 'sources',
    title: 'Free public data',
    tone: 'source',
    items: [
      { title: 'EIA-930', detail: 'PACE load, forecast, fuel mix' },
      { title: 'CAISO OASIS', detail: 'EDAM day-ahead prices' },
      { title: 'Open-Meteo', detail: 'Wasatch Front weather' },
      { title: 'RMP tariffs', detail: 'Schedules 6 and 8' },
      { title: 'EIA-860', detail: 'PACE power plants' }
    ]
  },
  {
    id: 'cloud',
    title: 'Every day at 3 p.m. MT',
    tone: 'cloud',
    items: [
      { title: 'refreshSnapshot', detail: 'Fetch, validate, publish' },
      { title: 'deriveSignals', detail: 'Marginal CO2, forecast, score' }
    ]
  },
  {
    id: 'store',
    title: 'Stored',
    tone: 'store',
    items: [
      { title: 'Firestore snapshot', detail: 'Rows and derived signals' },
      { title: 'Hosting', detail: 'Month replays, pinned' }
    ]
  },
  {
    id: 'browser',
    title: 'Live on your screen',
    tone: 'browser',
    items: [
      { title: 'Tariff engine', detail: 'Bills every 15 minutes' },
      { title: 'Site generator', detail: 'Simulated loads, seed 42' },
      { title: 'LP text + HiGHS WASM', detail: 'The plan, solved live' }
    ]
  },
  {
    id: 'screens',
    title: 'Start, two steps, the record',
    tone: 'screen',
    items: [
      { title: 'Start here', detail: 'Three clocks' },
      { title: '1 Forecast', detail: 'When is it jammed?' },
      { title: '2 Decide', detail: 'What should it do?' },
      { title: 'Record', detail: 'Did it pay off?' }
    ]
  }
];

export const architectureWideLayout = {
  WIDTH: 1000,
  TOP: 40,
  TITLE_Y: 20,
  STAGE_GAP: 44,
  COLUMN_WIDTHS: [176, 160, 160, 196, 176],
  ITEM_HEIGHTS: [50, 56, 56, 56, 56],
  ITEM_GAPS: [12, 14, 14, 14, 14]
};

export const architectureNarrowLayout = {
  WIDTH: 340,
  COLUMNS: 2,
  COLUMN_GAP: 8,
  ITEM_HEIGHT: 50,
  SINGLE_HEIGHT: 64,
  ROW_GAP: 8,
  TITLE_HEIGHT: 22,
  STAGE_GAP: 34
};

export const architectureLastRun = {
  STAGE_ID: 'cloud',
  ITEM_TITLE: 'refreshSnapshot'
};
