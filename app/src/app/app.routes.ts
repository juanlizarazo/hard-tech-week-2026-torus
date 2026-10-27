import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'traffic' },
  {
    path: 'traffic',
    loadComponent: () => import('./traffic/traffic.component').then((module) => module.TrafficComponent)
  },
  {
    path: 'plan',
    loadComponent: () => import('./plan/plan.component').then((module) => module.PlanComponent)
  },
  {
    path: 'backtest',
    loadComponent: () => import('./backtest/backtest.component').then((module) => module.BacktestComponent)
  },
  { path: '**', redirectTo: 'traffic' }
];
