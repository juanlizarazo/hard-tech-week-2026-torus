import { IPlanControls, IPlanDeltaState, IPlanParsedValue, IPlanTile, IPlanTileDelta, IPlanTryChip } from './plan.interfaces';
import { planDeltaSettings, planTryChips } from './plan.constants';

export class PlanDeltaHelper {
  private static readonly _numberPattern = /([−+-]?)\$?([\d,]+(?:\.\d+)?)/;

  public static parse(value: string): IPlanParsedValue | null {
    const match = value.match(PlanDeltaHelper._numberPattern);

    if (!match) {
      return null;
    }

    const sign = match[1] === '−' || match[1] === '-' ? -1 : 1;
    const amount = sign * Number(match[2].replace(/,/g, ''));

    if (!Number.isFinite(amount)) {
      return null;
    }

    return { amount, unit: value.replace(match[0], '').trim(), isMoney: value.includes('$') };
  }

  public static tileDeltas(previous: IPlanTile[], current: IPlanTile[]): Record<string, IPlanTileDelta> {
    const deltas: Record<string, IPlanTileDelta> = {};

    for (const tile of current) {
      const before = previous.find((entry) => entry.id === tile.id);
      const now = PlanDeltaHelper.parse(tile.value);
      const then = before ? PlanDeltaHelper.parse(before.value) : null;

      if (!now || !then || now.unit !== then.unit || now.isMoney !== then.isMoney) {
        continue;
      }

      const change = now.amount - then.amount;

      if (Math.abs(change) < planDeltaSettings.MIN_CHANGE) {
        continue;
      }

      const magnitude = Math.abs(change).toLocaleString('en-US', { maximumFractionDigits: Math.abs(change) < 10 ? 1 : 0 });
      const unit = now.unit ? ` ${now.unit}` : '';

      deltas[tile.id] = {
        text: `${change > 0 ? '+' : '−'}${now.isMoney ? '$' : ''}${magnitude}${unit} vs last solve`,
        direction: change > 0 ? 'up' : 'down'
      };
    }

    return deltas;
  }

  public static deltaState(previous: IPlanTile[], current: IPlanTile[]): IPlanDeltaState {
    const deltas = PlanDeltaHelper.tileDeltas(previous, current);

    return { deltas, isUnchanged: Object.keys(deltas).length === 0 };
  }

  public static emptyState(): IPlanDeltaState {
    return { deltas: {}, isUnchanged: false };
  }

  public static chipChanges(chip: IPlanTryChip, maxReserveKwh: number): Partial<IPlanControls> {
    if (chip.changes.wattsmartReserveKwh === undefined) {
      return chip.changes;
    }

    return { ...chip.changes, wattsmartReserveKwh: Math.min(chip.changes.wattsmartReserveKwh, maxReserveKwh) };
  }

  public static chipIsActive(chip: IPlanTryChip, controls: IPlanControls, maxReserveKwh: number): boolean {
    const changes = PlanDeltaHelper.chipChanges(chip, maxReserveKwh);

    return (Object.keys(changes) as (keyof IPlanControls)[]).every((key) => controls[key] === changes[key]);
  }

  public static chips(): IPlanTryChip[] {
    return planTryChips;
  }
}
