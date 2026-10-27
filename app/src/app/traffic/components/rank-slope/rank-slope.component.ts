import { Component, Input, OnChanges } from '@angular/core';
import { rankSlopeLayout } from './rank-slope.constants';
import { IRankSlopeLine, IRankSlopeRow } from './rank-slope.interfaces';

@Component({
  selector: 'dt-rank-slope',
  templateUrl: './rank-slope.component.html',
  styleUrl: './rank-slope.component.scss'
})
export class RankSlopeComponent implements OnChanges {
  @Input() public rows: IRankSlopeRow[] = [];

  public readonly width = rankSlopeLayout.WIDTH;
  public readonly leftX = rankSlopeLayout.LEFT_X;
  public readonly rightX = rankSlopeLayout.RIGHT_X;
  public readonly topY = rankSlopeLayout.TOP_Y;
  public readonly rowHeight = rankSlopeLayout.ROW_HEIGHT;
  public readonly labelOffset = rankSlopeLayout.LABEL_BASELINE_OFFSET;

  public lines: IRankSlopeLine[] = [];
  public height = rankSlopeLayout.DEFAULT_HEIGHT;
  public activeHour: number | null = null;
  public ariaSummary = '';

  public get activeLine(): IRankSlopeLine | null {
    return this.lines.find((line) => line.hour === this.activeHour) ?? null;
  }

  public get tooltipTopPercent(): number {
    const line = this.activeLine;

    if (!line) {
      return 0;
    }

    return (Math.min(line.averageY, line.marginalY) / this.height) * 100;
  }

  public ngOnChanges(): void {
    this.height = this.topY + Math.max(this.rows.length, 1) * this.rowHeight + rankSlopeLayout.BOTTOM_PADDING;

    const biggestChanges = [...this.rows]
      .sort((first, second) =>
        Math.abs(second.marginalRank - second.averageRank) - Math.abs(first.marginalRank - first.averageRank)
      )
      .slice(0, rankSlopeLayout.HIGHLIGHT_COUNT)
      .map((row) => row.hour);

    this.lines = this.rows.map((row) => {
      const change = row.marginalRank - row.averageRank;

      return {
        hour: row.hour,
        hourLabel: row.hourLabel,
        averageRank: row.averageRank,
        marginalRank: row.marginalRank,
        averageY: this._rankY(row.averageRank),
        marginalY: this._rankY(row.marginalRank),
        averageLabelY: this._rankY(row.averageRank),
        marginalLabelY: this._rankY(row.marginalRank),
        change,
        isHighlighted: biggestChanges.includes(row.hour),
        changeText: this._changeText(change),
        description:
          `${row.hourLabel}: average rank ${row.averageRank} (${Math.round(row.averageLbPerMwh)} lb/MWh), ` +
          `marginal rank ${row.marginalRank} (${Math.round(row.marginalLbPerMwh)} lb/MWh)`
      };
    });

    const highlighted = this.lines.filter((line) => line.isHighlighted);
    this._spreadLabels(highlighted, 'averageY', 'averageLabelY');
    this._spreadLabels(highlighted, 'marginalY', 'marginalLabelY');
    this.ariaSummary =
      'Slope chart of hourly CO2 rank, average versus marginal emissions, 1 is cleanest. Biggest changes: ' +
      highlighted.map((line) => `${line.hourLabel} ${line.averageRank} to ${line.marginalRank}`).join(', ');
  }

  public activate(hour: number): void {
    this.activeHour = hour;
  }

  public deactivate(): void {
    this.activeHour = null;
  }

  public formatChange(change: number): string {
    return change > 0 ? `+${change}` : `${change}`;
  }

  private _changeText(change: number): string {
    if (change === 0) {
      return 'no change';
    }

    return change < 0 ? `${Math.abs(change)} places cleaner on marginal` : `${change} places dirtier on marginal`;
  }

  private _spreadLabels(lines: IRankSlopeLine[], anchor: 'averageY' | 'marginalY', target: 'averageLabelY' | 'marginalLabelY'): void {
    const ordered = [...lines].sort((first, second) => first[anchor] - second[anchor]);
    const gap = rankSlopeLayout.LABEL_GAP;
    const top = this.topY + rankSlopeLayout.LABEL_EDGE_PADDING;
    const bottom = this.height - rankSlopeLayout.BOTTOM_PADDING - rankSlopeLayout.LABEL_EDGE_PADDING;
    let previous = -Infinity;

    for (const line of ordered) {
      line[target] = Math.max(line[anchor], previous + gap, top);
      previous = line[target];
    }

    let next = Infinity;

    for (let i = ordered.length - 1; i >= 0; i--) {
      const line = ordered[i];
      line[target] = Math.min(line[target], next - gap, bottom);
      next = line[target];
    }

    let floor = -Infinity;

    for (const line of ordered) {
      line[target] = Math.max(line[target], floor + gap, top);
      floor = line[target];
    }
  }

  private _rankY(rank: number): number {
    return this.topY + (rank - 1) * this.rowHeight + this.rowHeight / 2;
  }
}
