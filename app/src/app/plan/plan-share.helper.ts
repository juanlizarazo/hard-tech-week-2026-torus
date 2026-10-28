import { ParamMap, Params } from '@angular/router';
import { IStationAssets, TariffScheduleId } from '@app/core/models';
import { SitesHelper } from '@app/core/sites';
import { IPlanControls } from './plan.interfaces';
import { PeakSoFarMode, PlanDateMode } from './plan.types';
import { PlanHelper } from './plan.helper';
import { planDefaults } from './plan.constants';
import { planShareParams, planShareSettings } from './plan-share.constants';

const scheduleIds: TariffScheduleId[] = ['schedule-8', 'schedule-6'];
const peakSoFarModes: PeakSoFarMode[] = ['fresh', 'month-to-date'];
const dateModes: PlanDateMode[] = ['target'];

export class PlanShareHelper {
  public static controlsFromParams(params: ParamMap): IPlanControls {
    const defaults = PlanHelper.defaultControls();
    const site = SitesHelper.getArchetype(params.get(planShareParams.SITE) ?? '');
    const siteId = site?.id ?? defaults.siteId;
    const assets = SitesHelper.getAssets(siteId) as IStationAssets;
    const scheduleId = PlanShareHelper.oneOf(params.get(planShareParams.RATE), scheduleIds) ?? site?.scheduleId ?? defaults.scheduleId;
    const co2WeightPerKg = PlanShareHelper.steppedNumber(
      params.get(planShareParams.CO2),
      planDefaults.CO2_WEIGHT_MAX_PER_KG,
      planDefaults.CO2_WEIGHT_STEP_PER_KG
    );
    const wattsmartReserveKwh = PlanShareHelper.steppedNumber(
      params.get(planShareParams.RESERVE),
      PlanHelper.maxReserveKwh(assets),
      planDefaults.RESERVE_STEP_KWH
    );

    const gridReliefPerKw = PlanShareHelper.steppedNumber(
      params.get(planShareParams.RELIEF),
      planDefaults.GRID_RELIEF_MAX_PER_KW,
      planDefaults.GRID_RELIEF_STEP_PER_KW
    );

    return {
      siteId,
      dateMode: PlanShareHelper.oneOf(params.get(planShareParams.DAY), dateModes) ?? defaults.dateMode,
      scheduleId,
      peakSoFarMode: PlanShareHelper.oneOf(params.get(planShareParams.PEAK), peakSoFarModes) ?? defaults.peakSoFarMode,
      co2WeightPerKg: co2WeightPerKg ?? defaults.co2WeightPerKg,
      wattsmartReserveKwh: wattsmartReserveKwh ?? PlanHelper.defaultReserveKwh(assets),
      gridReliefPerKw: gridReliefPerKw ?? defaults.gridReliefPerKw
    };
  }

  public static isShared(params: ParamMap): boolean {
    return params.get(planShareParams.SHARED) === planShareSettings.SHARED_FLAG;
  }

  public static toQueryParams(controls: IPlanControls, snapshotId: string | null, isShared: boolean): Params {
    return {
      [planShareParams.SITE]: controls.siteId,
      [planShareParams.RATE]: controls.scheduleId,
      [planShareParams.CO2]: Number(controls.co2WeightPerKg.toFixed(2)),
      [planShareParams.RESERVE]: Math.round(controls.wattsmartReserveKwh),
      [planShareParams.RELIEF]: Number(controls.gridReliefPerKw.toFixed(1)),
      [planShareParams.PEAK]: controls.peakSoFarMode,
      [planShareParams.DAY]: controls.dateMode,
      [planShareParams.SNAPSHOT]: snapshotId ?? undefined,
      [planShareParams.SHARED]: isShared ? planShareSettings.SHARED_FLAG : undefined
    };
  }

  private static oneOf<T extends string>(value: string | null, allowed: T[]): T | null {
    return allowed.find((candidate: T) => candidate === value) ?? null;
  }

  private static steppedNumber(value: string | null, max: number, step: number): number | null {
    if (value === null || value.trim() === '') {
      return null;
    }

    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      return null;
    }

    const clamped = Math.min(Math.max(amount, 0), max);

    return Number((Math.round(clamped / step) * step).toFixed(4));
  }
}
