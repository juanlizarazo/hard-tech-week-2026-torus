import { IBillBreakdown, ISiteArchetype, ProvenanceKind } from '@app/core/models';
import { ISiteLoadStats } from '@app/core/sites';

export interface IAssetRow {
  label: string;
  value: string;
  kind: ProvenanceKind;
  note: string;
}

export interface IPlanSiteCard {
  archetype: ISiteArchetype;
  scheduleName: string;
  julyStats: ISiteLoadStats;
  julyBill: IBillBreakdown;
  spinRows: IAssetRow[];
  pulseRows: IAssetRow[];
}
