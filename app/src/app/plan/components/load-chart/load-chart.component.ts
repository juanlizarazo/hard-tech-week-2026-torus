import { Component, Input, OnChanges } from '@angular/core';
import { IPlanInterval, IRushHourWindow } from '@app/core/models/plan.interfaces';
import { ChartHelper, chartColors } from '@app/shared/charts';
import { IChartTooltip, IHourTick, ILinearScale, IValueTick, IWindowRange } from '@app/shared/charts';
import { ResponsiveChartDirective } from '@app/shared/charts';
import { loadChartSettings } from './load-chart.constants';
import { ILoadChartNote } from './load-chart.interfaces';

@Component({
  selector: 'dt-load-chart',
  templateUrl: './load-chart.component.html',
  styleUrl: './load-chart.component.scss'
})
export class LoadChartComponent extends ResponsiveChartDirective implements OnChanges {
  @Input({ required: true }) public intervals: IPlanInterval[] = [];
  @Input() public rushHourWindows: IRushHourWindow[] = [];
  @Input() public demandKw = 0;
  @Input() public demandLabel = '';
  @Input() public compareKw: number[] = [];
  @Input() public compareName = 'Fixed-threshold battery';

  public readonly colors = chartColors;
  public viewHeight = 300;
  public margins = { top: 28, right: 12, bottom: 44, left: 48 };
  public plotRight = 0;
  public plotBottom = 0;
  public yTicks: IValueTick[] = [];
  public hourTicks: IHourTick[] = [];
  public rushRanges: IWindowRange[] = [];
  public gridAreaPath = '';
  public gridLinePath = '';
  public loadLinePath = '';
  public compareLinePath = '';
  public compareNote: ILoadChartNote | null = null;
  public demandY = 0;
  public showDemand = false;
  public hoverX = -1;
  public tooltip: IChartTooltip | null = null;
  public ariaLabel = '';

  public cssPath(path: string): string | null {
    return path ? `path('${path}')` : null;
  }

  public ngOnChanges(): void {
    this.render();
  }

  public onPointerMove(event: PointerEvent): void {
    const count = this.intervals.length;
    const plotWidth = this.plotRight - this.margins.left;
    const index = ChartHelper.pointerIndex(
      event,
      event.currentTarget as Element,
      this.viewWidth,
      this.margins.left,
      plotWidth,
      count
    );

    if (index < 0) {
      this.onPointerLeave();

      return;
    }

    const interval = this.intervals[index];
    const xScale = ChartHelper.linearScale(0, count, this.margins.left, this.plotRight);
    this.hoverX = ChartHelper.round(ChartHelper.scale(xScale, index + 0.5));
    this.tooltip = ChartHelper.tooltip(
      ChartHelper.formatLocalTime(interval.startUtc),
      [
        { label: 'Site load forecast', value: ChartHelper.formatKw(interval.loadKw), swatch: chartColors.LOAD },
        { label: 'Grid draw', value: ChartHelper.formatKw(interval.gridKw), swatch: chartColors.GRID_DRAW },
        {
          label: 'Shaved by station',
          value: ChartHelper.formatKw(Math.max(0, interval.loadKw - interval.gridKw)),
          swatch: ''
        },
        ...(this.hasCompare()
          ? [{ label: this.compareName, value: ChartHelper.formatKw(this.compareKw[index]), swatch: '' }]
          : [])
      ],
      this.hoverX,
      this.viewWidth
    );
  }

  public onPointerLeave(): void {
    this.hoverX = -1;
    this.tooltip = null;
  }

  protected render(): void {
    const intervals = this.intervals ?? [];
    this.viewHeight = this.isNarrow ? 240 : 300;
    this.margins = { top: 28, right: 12, bottom: 44, left: this.isNarrow ? 40 : 48 };
    this.plotRight = this.viewWidth - this.margins.right;
    this.plotBottom = this.viewHeight - this.margins.bottom;
    this.onPointerLeave();

    if (intervals.length === 0) {
      this._resetPaths();

      return;
    }

    const startUtcs = intervals.map((interval) => interval.startUtc);
    const loads = intervals.map((interval) => interval.loadKw);
    const grids = intervals.map((interval) => interval.gridKw);
    const compare = this.hasCompare() ? this.compareKw : [];
    const peak = Math.max(...loads, ...grids, ...compare, this.demandKw || 0);
    const yScale = ChartHelper.linearScale(0, ChartHelper.niceMax(peak * 1.05), this.plotBottom, this.margins.top);
    const xScale = ChartHelper.linearScale(0, intervals.length, this.margins.left, this.plotRight);

    this.yTicks = ChartHelper.valueTicks(yScale, this.isNarrow ? 3 : 5, ChartHelper.formatCompact);
    this.hourTicks = ChartHelper.hourTicks(startUtcs, xScale, ChartHelper.tickHoursForWidth(this.viewWidth));
    this.rushRanges = ChartHelper.windowRanges(
      startUtcs,
      this.rushHourWindows ?? [],
      xScale,
      'Rush hour'
    );
    this.gridAreaPath = ChartHelper.stepAreaPath(xScale, yScale, grids, 0);
    this.gridLinePath = ChartHelper.stepLinePath(xScale, yScale, grids);
    this.loadLinePath = ChartHelper.stepLinePath(xScale, yScale, loads);
    this.compareLinePath = compare.length > 0 ? ChartHelper.stepLinePath(xScale, yScale, compare) : '';
    this.compareNote = this._compareNote(startUtcs, loads, grids, compare, peak, xScale, yScale);
    this.showDemand = this.demandKw > 0;
    this.demandY = ChartHelper.round(ChartHelper.scale(yScale, this.demandKw));
    this.ariaLabel = `Site load before and grid draw after DETOUR over ${intervals.length} fifteen-minute intervals, peak site load ${ChartHelper.formatKw(Math.max(...loads))}, peak grid draw ${ChartHelper.formatKw(Math.max(...grids))}`;
  }

  public hasCompare(): boolean {
    return (this.compareKw?.length ?? 0) === (this.intervals?.length ?? 0) && this.compareKw.length > 0;
  }

  private _compareNote(
    startUtcs: string[],
    loads: number[],
    grids: number[],
    compare: number[],
    peak: number,
    xScale: ILinearScale,
    yScale: ILinearScale
  ): ILoadChartNote | null {
    const window = this.rushHourWindows?.[0];

    if (compare.length === 0 || !window) {
      return null;
    }

    const endMs = Date.parse(window.endUtc);
    const reboundEndMs = endMs + loadChartSettings.REBOUND_HOURS * loadChartSettings.MS_PER_HOUR;
    const minimumKw = peak * loadChartSettings.MIN_NOTE_FRACTION;
    let bumpIndex = -1;
    let plannedPeakKw = 0;

    for (let index = 0; index < startUtcs.length; index++) {
      const startMs = Date.parse(startUtcs[index]);

      if (startMs < endMs || startMs >= reboundEndMs) {
        continue;
      }

      plannedPeakKw = Math.max(plannedPeakKw, grids[index]);

      if (bumpIndex < 0 || compare[index] > compare[bumpIndex]) {
        bumpIndex = index;
      }
    }

    const rechargeKw = bumpIndex < 0 ? 0 : compare[bumpIndex] - loads[bumpIndex];

    if (rechargeKw < minimumKw || compare[bumpIndex] - plannedPeakKw < minimumKw) {
      return null;
    }

    const x = ChartHelper.round(ChartHelper.scale(xScale, bumpIndex + 0.5));

    return {
      x,
      y: ChartHelper.round(ChartHelper.scale(yScale, compare[bumpIndex]) - 8),
      anchor: x > (this.margins.left + this.plotRight) / 2 ? 'end' : 'start',
      text: `Shaver recharges here: +${ChartHelper.formatKw(rechargeKw)}`
    };
  }

  private _resetPaths(): void {
    this.yTicks = [];
    this.hourTicks = [];
    this.rushRanges = [];
    this.gridAreaPath = '';
    this.gridLinePath = '';
    this.loadLinePath = '';
    this.compareLinePath = '';
    this.compareNote = null;
    this.showDemand = false;
    this.ariaLabel = 'No plan intervals';
  }
}
