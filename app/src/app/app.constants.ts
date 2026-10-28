import { INavLink } from './app.interfaces';

export const navLinks: INavLink[] = [
  { path: '/start', label: 'Start here', shortLabel: 'Start', step: '', kind: 'start', description: 'What DETOUR does' },
  { path: '/traffic', label: 'Forecast', shortLabel: 'Forecast', step: '1', kind: 'step', description: "Tomorrow's grid", dayNoun: 'grid' },
  { path: '/plan', label: 'Decide', shortLabel: 'Decide', step: '2', kind: 'step', description: "Tomorrow's plan", dayNoun: 'plan' },
  { path: '/backtest', label: 'Record', shortLabel: 'Record', step: '', kind: 'record', description: '2026, month by month' }
];
