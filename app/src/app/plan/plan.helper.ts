import { IStationAssets, ISiteArchetype } from '@app/core/models';
import { SiteGeneratorHelper, SitesHelper } from '@app/core/sites';
import { TariffHelper, tariffSchedules } from '@app/core/tariff';
import { TimeHelper } from '@app/core/helpers';
import { IAssetRow, IPlanSiteCard } from './plan.interfaces';
import { planBaseline } from './plan.constants';

export class PlanHelper {
  public static buildSiteCards(): IPlanSiteCard[] {
    return SitesHelper.listArchetypes().map((archetype: ISiteArchetype) =>
      PlanHelper.buildSiteCard(archetype)
    );
  }

  private static buildSiteCard(archetype: ISiteArchetype): IPlanSiteCard {
    const schedule =
      archetype.scheduleId === 'schedule-8' ? tariffSchedules.SCHEDULE_8 : tariffSchedules.SCHEDULE_6;
    const julyLoad = SiteGeneratorHelper.generateMonth(archetype, planBaseline.MONTH);
    const julyIntervals = TimeHelper.localMonthIntervals(planBaseline.MONTH);
    const assets = SitesHelper.getAssets(archetype.id) as IStationAssets;

    return {
      archetype,
      scheduleName: schedule.name,
      julyStats: SiteGeneratorHelper.loadStats(julyLoad),
      julyBill: TariffHelper.monthlyBill(
        schedule,
        julyIntervals,
        julyLoad.map((interval) => interval.kw)
      ),
      spinRows: PlanHelper.spinRows(assets),
      pulseRows: PlanHelper.pulseRows(assets)
    };
  }

  private static row(assets: IStationAssets, field: string, label: string, value: string): IAssetRow {
    const source = assets.sources[field];

    return {
      label,
      value,
      kind: source ? source.kind : 'assumption',
      note: source ? (source.note ?? source.label) : ''
    };
  }

  private static spinRows(assets: IStationAssets): IAssetRow[] {
    const spin = assets.spin;

    return [
      PlanHelper.row(assets, 'spin.powerKw', 'Power', `${spin.powerKw.toLocaleString()} kW`),
      PlanHelper.row(assets, 'spin.energyKwh', 'Energy', `${spin.energyKwh.toLocaleString()} kWh`),
      PlanHelper.row(
        assets,
        'spin.roundTripEfficiency',
        'Round trip',
        `${Math.round(spin.roundTripEfficiency * 100)}%`
      ),
      PlanHelper.row(assets, 'spin.cycleLife', 'Cycle life', spin.cycleLife.toLocaleString())
    ];
  }

  private static pulseRows(assets: IStationAssets): IAssetRow[] {
    const pulse = assets.pulse;

    return [
      PlanHelper.row(assets, 'pulse.powerKw', 'Power', `${pulse.powerKw.toLocaleString()} kW`),
      PlanHelper.row(assets, 'pulse.energyKwh', 'Energy', `${pulse.energyKwh.toLocaleString()} kWh`),
      PlanHelper.row(
        assets,
        'pulse.dischargeEfficiency',
        'Discharge eff.',
        `${Math.round(pulse.dischargeEfficiency * 100)}%`
      ),
      PlanHelper.row(assets, 'pulse.cycleLife', 'Cycle life', pulse.cycleLife.toLocaleString())
    ];
  }
}
