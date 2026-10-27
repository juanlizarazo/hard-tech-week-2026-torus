import { Injectable } from '@angular/core';
import type { Highs } from 'highs';
import { IPlanResult } from '../models';
import { PlanEngineHelper } from './plan-engine.helper';
import { ILpInput } from './plan-engine.interfaces';

@Injectable({ providedIn: 'root' })
export class PlanSolverService {
  private _highs: Promise<Highs> | null = null;

  public async solve(input: ILpInput): Promise<IPlanResult> {
    try {
      return await this._solveOnce(input);
    } catch (error: unknown) {
      console.error('HiGHS failed, reloading the solver once', error);
      this._highs = null;
    }

    try {
      return await this._solveOnce(input);
    } catch (error: unknown) {
      console.error('HiGHS failed after a reload', error);
      this._highs = null;
      const message = error instanceof Error ? error.message : String(error);

      return PlanEngineHelper.failedResult(input, 'error', `The solver could not be loaded: ${message}`, '', 0);
    }
  }

  private async _solveOnce(input: ILpInput): Promise<IPlanResult> {
    const highs = await this._loadHighs();
    const startMs = performance.now();
    const result = PlanEngineHelper.solve(highs, input);
    const solveMs = performance.now() - startMs;

    if (result.status === 'error') {
      throw new Error(result.errorMessage ?? 'Unknown solver error');
    }

    return { ...result, solveMs, lpStats: { ...result.lpStats, solveMs } };
  }

  private _loadHighs(): Promise<Highs> {
    if (!this._highs) {
      this._highs = import('highs').then((module) =>
        module.default({ locateFile: (file: string): string => `/highs/${file}` }),
      );
    }

    return this._highs;
  }
}
