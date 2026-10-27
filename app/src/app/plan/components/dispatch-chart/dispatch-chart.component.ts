import { Component, Input, OnChanges } from '@angular/core';
import { IPlanInterval, IRushHourWindow } from '@app/core/models/plan.interfaces';
import { ChartHelper, chartColors } from '@app/shared/charts';
import {
  IChartTooltip,
  IHourTick,
  ILinearScale,
  IRect,
  IValueTick,
  IWindowRange
} from '@app/shared/charts';
import { ResponsiveChartDirective } from '@app/shared/charts';

@Component({
  selector: 'dt-dispatch-chart',
  templateUrl: './dispatch-chart.component.html',
  styleUrl: './dispatch-chart.component.scss'
})
export class DispatchChartComponent extends ResponsiveChartDirective implements OnChanges {
  @Input({ required: true }) public intervals: IPlanInterval[] = [];
  @Input() public rushHourWindows: IRushHourWindow[] = [];
  @Input() public pulseMinSocKwh = 0;
  @Input() public pulseMaxSocKwh = 0;
  @Input() public reserveFloorKwh = 0;
  @Input() public spinMaxSocKwh = 0;

  public readonly colors = chartColors;
  public viewHeight = 420;
  public margins = { top: 28, right: 12, bottom: 44, left: 48 };
  public plotRight = 0;
  public powerTop = 0;
  public powerBottom = 0;
  public zeroY = 0;
  public socTop = 0;
  public socBottom = 0;
  public powerTicks: IValueTick[] = [];
  public socTicks: IValueTick[] = [];
  public hourTicks: IHourTick[] = [];
  public rushRanges: IWindowRange[] = [];
  public spinBars: IRect[] = [];
  public pulseBars: IRect[] = [];
  public pulseSocPath = '';
  public spinSocPath = '';
  public socBandTop = 0;
  public socBandBottom = 0;
  public showSocBand = false;
  public reserveY = 0;
  public showReserve = false;
  public hoverX = -1;
  public tooltip: IChartTooltip | null = null;
  public ariaLabel = '';

  private _pulseMaxKwh = 1;
  private _spinMaxKwh = 1;

  public ngOnChanges(): void {
    this.render();
  }

  public onPointerMove(event: PointerEvent): void {
    const count = this.intervals.length;
    const index = ChartHelper.pointerIndex(
      event,
      event.currentTarget as Element,
      this.viewWidth,
      this.margins.left,
      this.plotRight - this.margins.left,
      count
    );

    if (index < 0) {
      this.onPointerLeave();

      return;
    }

    const interval = this.intervals[index];
    const xScale = ChartHelper.linearScale(0, count, this.margins.left, this.plotRight);
    const spinNet = interval.spinDischargeKw - interval.spinChargeKw;
    const pulseNet = interval.pulseDischargeKw - interval.pulseChargeKw;
    this.hoverX = ChartHelper.round(ChartHelper.scale(xScale, index + 0.5));
    this.tooltip = ChartHelper.tooltip(
      ChartHelper.formatLocalTime(interval.startUtc),
      [
        { label: 'Spin', value: this._netLabel(spinNet), swatch: chartColors.SPIN },
        { label: 'Pulse', value: this._netLabel(pulseNet), swatch: chartColors.PULSE },
        {
          label: 'Pulse SOC',
          value: `${ChartHelper.formatKwh(interval.pulseSocKwh)} (${Math.round(this._percent(interval.pulseSocKwh, this._pulseMaxKwh))}%)`,
          swatch: ''
        },
        {
          label: 'Spin SOC',
          value: `${ChartHelper.formatKwh(interval.spinSocKwh)} (${Math.round(this._percent(interval.spinSocKwh, this._spinMaxKwh))}%)`,
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
    const powerHeight = this.isNarrow ? 160 : 200;
    const socHeight = this.isNarrow ? 110 : 130;
    const panelGap = 40;
    this.margins = { top: 28, right: 12, bottom: 44, left: this.isNarrow ? 40 : 48 };
    this.plotRight = this.viewWidth - this.margins.right;
    this.powerTop = this.margins.top;
    this.powerBottom = this.powerTop + powerHeight;
    this.socTop = this.powerBottom + panelGap;
    this.socBottom = this.socTop + socHeight;
    this.viewHeight = this.socBottom + this.margins.bottom;
    this.onPointerLeave();

    if (intervals.length === 0) {
      this._resetView();

      return;
    }

    const startUtcs = intervals.map((interval) => interval.startUtc);
    const xScale = ChartHelper.linearScale(0, intervals.length, this.margins.left, this.plotRight);
    const maxDischarge = Math.max(...intervals.map((interval) => interval.spinDischargeKw + interval.pulseDischargeKw));
    const maxCharge = Math.max(...intervals.map((interval) => interval.spinChargeKw + interval.pulseChargeKw));
    const powerScale = ChartHelper.linearScale(
      -ChartHelper.niceMax(maxCharge),
      ChartHelper.niceMax(maxDischarge),
      this.powerBottom,
      this.powerTop
    );
    const socScale = ChartHelper.linearScale(0, 100, this.socBottom, this.socTop);

    this._pulseMaxKwh =
      this.pulseMaxSocKwh > 0 ? this.pulseMaxSocKwh : Math.max(1, ...intervals.map((interval) => interval.pulseSocKwh));
    this._spinMaxKwh =
      this.spinMaxSocKwh > 0 ? this.spinMaxSocKwh : Math.max(1, ...intervals.map((interval) => interval.spinSocKwh));

    this.zeroY = ChartHelper.round(ChartHelper.scale(powerScale, 0));
    this.powerTicks = ChartHelper.valueTicks(powerScale, this.isNarrow ? 3 : 4, ChartHelper.formatCompact);
    this.socTicks = ChartHelper.valueTicks(socScale, 2, (value: number) => `${value}%`);
    this.hourTicks = ChartHelper.hourTicks(startUtcs, xScale, ChartHelper.tickHoursForWidth(this.viewWidth));
    this.rushRanges = ChartHelper.windowRanges(
      startUtcs,
      this.rushHourWindows ?? [],
      xScale,
      'Rush hour'
    );
    this._buildBars(intervals, xScale, powerScale);
    this.pulseSocPath = ChartHelper.linePath(
      xScale,
      socScale,
      intervals.map((interval) => this._percent(interval.pulseSocKwh, this._pulseMaxKwh)),
      1
    );
    this.spinSocPath = ChartHelper.linePath(
      xScale,
      socScale,
      intervals.map((interval) => this._percent(interval.spinSocKwh, this._spinMaxKwh)),
      1
    );
    this.showSocBand = this.pulseMaxSocKwh > 0;
    this.socBandTop = ChartHelper.round(ChartHelper.scale(socScale, 100));
    this.socBandBottom = ChartHelper.round(
      ChartHelper.scale(socScale, this._percent(this.pulseMinSocKwh, this._pulseMaxKwh))
    );
    this.showReserve = this.reserveFloorKwh > this.pulseMinSocKwh && this.reserveFloorKwh > 0;
    this.reserveY = ChartHelper.round(
      ChartHelper.scale(socScale, this._percent(this.reserveFloorKwh, this._pulseMaxKwh))
    );
    this.ariaLabel = `Station dispatch over ${intervals.length} fifteen-minute intervals: peak discharge ${ChartHelper.formatKw(maxDischarge)}, peak charge ${ChartHelper.formatKw(maxCharge)}`;
  }

  private _buildBars(intervals: IPlanInterval[], xScale: ILinearScale, powerScale: ILinearScale): void {
    const spinBars: IRect[] = [];
    const pulseBars: IRect[] = [];
    const minimumKw = 0.5;

    for (let i = 0; i < intervals.length; i++) {
      const interval = intervals[i];

      if (interval.spinDischargeKw > minimumKw) {
        spinBars.push(ChartHelper.barRect(xScale, powerScale, i, 0, interval.spinDischargeKw, 1));
      }

      if (interval.pulseDischargeKw > minimumKw) {
        const base = interval.spinDischargeKw > minimumKw ? interval.spinDischargeKw : 0;
        const rect = ChartHelper.barRect(xScale, powerScale, i, base, base + interval.pulseDischargeKw, 1);
        pulseBars.push(base > 0 ? this._trimEdge(rect, 'bottom') : rect);
      }

      if (interval.spinChargeKw > minimumKw) {
        spinBars.push(ChartHelper.barRect(xScale, powerScale, i, 0, -interval.spinChargeKw, 1));
      }

      if (interval.pulseChargeKw > minimumKw) {
        const base = interval.spinChargeKw > minimumKw ? -interval.spinChargeKw : 0;
        const rect = ChartHelper.barRect(xScale, powerScale, i, base, base - interval.pulseChargeKw, 1);
        pulseBars.push(base < 0 ? this._trimEdge(rect, 'top') : rect);
      }
    }

    this.spinBars = spinBars;
    this.pulseBars = pulseBars;
  }

  private _trimEdge(rect: IRect, edge: 'top' | 'bottom'): IRect {
    const trim = Math.min(1, rect.height / 2);

    if (edge === 'top') {
      return { ...rect, y: rect.y + trim, height: rect.height - trim };
    }

    return { ...rect, height: rect.height - trim };
  }

  private _percent(valueKwh: number, maxKwh: number): number {
    if (maxKwh <= 0) {
      return 0;
    }

    return Math.min(100, Math.max(0, (valueKwh / maxKwh) * 100));
  }

  private _netLabel(netKw: number): string {
    if (Math.abs(netKw) < 0.5) {
      return 'idle';
    }

    if (netKw > 0) {
      return `${ChartHelper.formatKw(netKw)} out`;
    }

    return `${ChartHelper.formatKw(-netKw)} in`;
  }

  private _resetView(): void {
    this.powerTicks = [];
    this.socTicks = [];
    this.hourTicks = [];
    this.rushRanges = [];
    this.spinBars = [];
    this.pulseBars = [];
    this.pulseSocPath = '';
    this.spinSocPath = '';
    this.showSocBand = false;
    this.showReserve = false;
    this.ariaLabel = 'No plan intervals';
  }
}
