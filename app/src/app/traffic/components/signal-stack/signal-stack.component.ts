import { Component, Input, OnChanges } from '@angular/core';
import { signalStackLayout } from './signal-stack.constants';
import { ISignalPoint, ISignalRow, ISignalRowView } from './signal-stack.interfaces';

@Component({
  selector: 'dt-signal-stack',
  templateUrl: './signal-stack.component.html',
  styleUrl: './signal-stack.component.scss'
})
export class SignalStackComponent implements OnChanges {
  @Input({ required: true }) public rows: ISignalRow[] = [];
  @Input() public hour = 0;
  @Input() public rushStart: number | null = null;
  @Input() public rushEnd: number | null = null;
  @Input() public hourLabel = '';

  public readonly width = signalStackLayout.WIDTH;
  public readonly height = signalStackLayout.HEIGHT;
  public views: ISignalRowView[] = [];

  public get cursorPercent(): number {
    return (Math.min(Math.max(this.hour, 0), signalStackLayout.LAST_HOUR) / signalStackLayout.LAST_HOUR) * 100;
  }

  public get rushLeftPercent(): number {
    return (((this.rushStart ?? 0) - 0.5) / signalStackLayout.LAST_HOUR) * 100;
  }

  public get rushWidthPercent(): number {
    return (((this.rushEnd ?? 0) - (this.rushStart ?? 0)) / signalStackLayout.LAST_HOUR) * 100;
  }

  public ngOnChanges(): void {
    this.views = this.rows.map((row) => this._view(row));
  }

  private _view(row: ISignalRow): ISignalRowView {
    const known = row.values.filter((value): value is number => value !== null && !Number.isNaN(value));
    const low = known.length > 0 ? Math.min(...known) : 0;
    const high = known.length > 0 ? Math.max(...known) : 1;
    const span = high - low || 1;
    const points: (ISignalPoint | null)[] = row.values.map((value, index) =>
      value === null || Number.isNaN(value)
        ? null
        : {
            x: Math.round((index / signalStackLayout.LAST_HOUR) * this.width * 10) / 10,
            y:
              Math.round(
                (this.height - signalStackLayout.PAD_Y - ((value - low) / span) * (this.height - signalStackLayout.PAD_Y * 2)) * 10
              ) / 10
          }
    );
    const runs: ISignalPoint[][] = [];

    points.forEach((point, index) => {
      if (point && (index === 0 || !points[index - 1])) {
        runs.push([]);
      }

      if (point) {
        runs[runs.length - 1].push(point);
      }
    });

    const linePath = runs.map((run) => run.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join('')).join('');
    const areaPath = runs
      .filter((run) => run.length > 1)
      .map((run) => `M${run[0].x} ${this.height}${run.map((point) => `L${point.x} ${point.y}`).join('')}L${run[run.length - 1].x} ${this.height}Z`)
      .join('');
    const current = row.values[this.hour];

    return {
      key: row.key,
      label: row.label,
      color: row.color,
      linePath,
      areaPath,
      valueText: current === null || current === undefined || Number.isNaN(current) ? 'not posted' : row.format(current)
    };
  }
}
