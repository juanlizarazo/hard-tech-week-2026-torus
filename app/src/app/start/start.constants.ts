import { IStartStep } from './start.interfaces';

export const startSettings = {
  SITE_ID: 'airport',
  INTERVALS_PER_DAY: 96,
  ERROR_MESSAGE: "We could not read tomorrow's grid data. Check your connection and refresh the page.",
  EMPTY_MESSAGE: "Grid data isn't loaded yet. Refresh in a minute."
};

export const startSteps: IStartStep[] = [
  {
    path: '/traffic',
    step: '1',
    title: "Tomorrow's grid",
    question: 'When is the grid jammed tomorrow?',
    description: "Load, price and carbon for PACE tomorrow, and how good PACE's own forecast is.",
    linkLabel: "See tomorrow's grid",
    isPrimary: true
  },
  {
    path: '/plan',
    step: '2',
    title: "Tomorrow's plan",
    question: 'What should the Torus Station do?',
    description: 'A plan solved live in your browser. Move the dials and watch it change.',
    linkLabel: "See tomorrow's plan",
    isPrimary: false
  },
  {
    path: '/backtest',
    step: '3',
    title: "July's proof",
    question: 'Would it have paid off last July?',
    description: 'A month replayed day by day against a simple shaver and perfect hindsight.',
    linkLabel: "See July's proof",
    isPrimary: false
  }
];
