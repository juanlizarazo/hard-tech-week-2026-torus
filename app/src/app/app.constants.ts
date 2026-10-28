import { INavLink } from './app.interfaces';

export const navLinks: INavLink[] = [
  { path: '/start', label: 'Start here', shortLabel: 'Start', step: '', description: 'What DETOUR does' },
  { path: '/traffic', label: 'Forecast', shortLabel: 'Forecast', step: '1', description: "Tomorrow's grid", dayNoun: 'grid' },
  { path: '/plan', label: 'Decide', shortLabel: 'Decide', step: '2', description: "Tomorrow's plan", dayNoun: 'plan' },
  { path: '/backtest', label: 'Prove', shortLabel: 'Prove', step: '3', description: 'Month by month' }
];
