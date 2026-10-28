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
    items: [{ title: 'refreshSnapshot', detail: 'Cloud Function|Validate, then publish' }]
  },
  {
    id: 'store',
    title: 'Stored',
    tone: 'store',
    items: [{ title: 'Firestore snapshot', detail: 'Frozen for judging|Pull time on every screen' }]
  },
  {
    id: 'browser',
    title: 'In your browser',
    tone: 'browser',
    items: [
      { title: 'Tariff engine', detail: 'Bills every 15 minutes' },
      { title: 'MEF regression', detail: 'Marginal CO2 by hour' },
      { title: 'Ridge forecast', detail: 'PACE load with P10–P90' },
      { title: 'Site generator', detail: 'Simulated loads, seed 42' },
      { title: 'LP text + HiGHS WASM', detail: 'The plan, solved live' },
      { title: 'Month replay', detail: 'Day by day, real-time cap' }
    ]
  },
  {
    id: 'screens',
    title: 'Start and three steps',
    tone: 'screen',
    items: [
      { title: 'Start here', detail: 'Three clocks' },
      { title: '1 Forecast', detail: 'When is it jammed?' },
      { title: '2 Decide', detail: 'What should it do?' },
      { title: '3 Prove', detail: 'Would it have paid off?' }
    ]
  }
];

export const architectureWideLayout = {
  WIDTH: 1000,
  TOP: 40,
  TITLE_Y: 20,
  STAGE_GAP: 44,
  COLUMN_WIDTHS: [176, 160, 160, 196, 176],
  ITEM_HEIGHTS: [50, 96, 96, 44, 56],
  ITEM_GAPS: [12, 0, 0, 8, 14]
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
