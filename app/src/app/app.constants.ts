import { INavLink } from './app.interfaces';

export const navLinks: INavLink[] = [
  { path: '/start', label: 'Start here', step: '', description: 'What DETOUR does' },
  { path: '/traffic', label: "Tomorrow's grid", step: '1', description: 'When the grid is jammed' },
  { path: '/plan', label: "Tomorrow's plan", step: '2', description: 'What the station should do' },
  { path: '/backtest', label: "July's proof", step: '3', description: 'Would it have paid off' }
];
