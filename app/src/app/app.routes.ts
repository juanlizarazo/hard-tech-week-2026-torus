import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'start' },
  {
    path: 'start',
    title: 'DETOUR · Start here',
    loadComponent: () => import('./start/start.component').then((module) => module.StartComponent)
  },
  {
    path: 'traffic',
    title: "DETOUR · Tomorrow's grid",
    loadComponent: () => import('./traffic/traffic.component').then((module) => module.TrafficComponent)
  },
  {
    path: 'plan',
    title: "DETOUR · Tomorrow's plan",
    loadComponent: () => import('./plan/plan.component').then((module) => module.PlanComponent)
  },
  {
    path: 'backtest',
    title: 'DETOUR · The record',
    loadComponent: () => import('./backtest/backtest.component').then((module) => module.BacktestComponent)
  },
  { path: '**', redirectTo: 'start' }
];
