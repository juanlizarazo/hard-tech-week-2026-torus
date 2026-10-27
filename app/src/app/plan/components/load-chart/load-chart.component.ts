import { Component, Input, OnChanges } from '@angular/core';
import { IPlanInterval, IRushHourWindow } from '@app/core/models/plan.interfaces';
import { SimulatedBadgeComponent } from '@app/shared/components';
import { ChartHelper } from '../chart.helper';
import { chartColors } from '../chart.constants';
import { IChartMargins, IChartTooltip, IHourTick, IValueTick, IWindowRange } from '../chart.interfaces';
import { ResponsiveChartDirective } from '../responsive-chart.directive';

@Component({
  selector: 'dt-load-chart',
  imports: [SimulatedBadgeComponent],
  templateUrl: './load-chart.component.html',
  styleUrl: './load-chart.component.scss'
})
export class LoadChartComponent extends ResponsiveChartDirective implements OnChanges {
  @Input({ required: true }) public intervals: IPlanInterval[] = [];
  @Input() public rushHourWindows: IRushHourWindow[] = [];
  @Input() public demandKw = 0;
  @Input() public demandLabel = '';

  public readonly colors = chartColors;
  public viewHeight = 300;
  public margins: IChartMargins = { top: 28, right: 12, bottom: 44, left: 48 };
  public plotRight = 0;
  public plotBottom = 0;
  public yTicks: IValueTick[] = [];
  public hourTicks: IHourTick[] = [];
  public rushRanges: IWindowRange[] = [];
  public gridAreaPath = '';
  public gridLinePath = '';
  public loadLinePath = '';
  public demandY = 0;
  public showDemand = false;
  public hoverX = -1;
  public tooltip: IChartTooltip | null = null;
  public ariaLabel = '';

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
        { label: 'Site load', value: ChartHelper.formatKw(interval.loadKw), swatch: chartColors.LOAD },
        { label: 'Grid draw', value: ChartHelper.formatKw(interval.gridKw), swatch: chartColors.GRID_DRAW },
        {
          label: 'Shaved by station',
          value: ChartHelper.formatKw(Math.max(0, interval.loadKw - interval.gridKw)),
          swatch: ''
        }
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
    const peak = Math.max(...loads, ...grids, this.demandKw || 0);
    const yScale = ChartHelper.linearScale(0, ChartHelper.niceMax(peak * 1.05), this.plotBottom, this.margins.top);
    const xScale = ChartHelper.linearScale(0, intervals.length, this.margins.left, this.plotRight);

    this.yTicks = ChartHelper.valueTicks(yScale, this.isNarrow ? 3 : 5, ChartHelper.formatCompact);
    this.hourTicks = ChartHelper.hourTicks(startUtcs, xScale, ChartHelper.tickHoursForWidth(this.viewWidth));
    this.rushRanges = ChartHelper.windowRanges(
      startUtcs,
      this.rushHourWindows ?? [],
      xScale,
      this.isNarrow ? 'Rush hour' : 'PACE rush hour'
    );
    this.gridAreaPath = ChartHelper.stepAreaPath(xScale, yScale, grids, 0);
    this.gridLinePath = ChartHelper.stepLinePath(xScale, yScale, grids);
    this.loadLinePath = ChartHelper.stepLinePath(xScale, yScale, loads);
    this.showDemand = this.demandKw > 0;
    this.demandY = ChartHelper.round(ChartHelper.scale(yScale, this.demandKw));
    this.ariaLabel = `Site load before and grid draw after DETOUR over ${intervals.length} fifteen-minute intervals, peak site load ${ChartHelper.formatKw(Math.max(...loads))}, peak grid draw ${ChartHelper.formatKw(Math.max(...grids))}`;
  }

  private _resetPaths(): void {
    this.yTicks = [];
    this.hourTicks = [];
    this.rushRanges = [];
    this.gridAreaPath = '';
    this.gridLinePath = '';
    this.loadLinePath = '';
    this.showDemand = false;
    this.ariaLabel = 'No plan intervals';
  }
}
