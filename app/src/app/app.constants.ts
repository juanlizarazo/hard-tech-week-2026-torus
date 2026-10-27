import { INavLink } from './app.interfaces';

export const navLinks: INavLink[] = [
  { path: '/start', label: 'Start here', shortLabel: 'Start', step: '', description: 'What DETOUR does' },
  { path: '/traffic', label: "Tomorrow's grid", shortLabel: 'Grid', step: '1', description: 'When the grid is jammed', dayNoun: 'grid' },
  { path: '/plan', label: "Tomorrow's plan", shortLabel: 'Plan', step: '2', description: 'What the station should do', dayNoun: 'plan' },
  { path: '/backtest', label: "July's proof", shortLabel: 'Proof', step: '3', description: 'Would it have paid off' }
];
