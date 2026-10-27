import { Component, Input, OnChanges } from '@angular/core';
import { IPlanInterval, IRushHourWindow, TariffScheduleId } from '@app/core/models';
import { ChartHelper } from '../../charts/chart.helper';
import { chartColors, chartSettings } from '../../charts/chart.constants';
import {
  IChartTooltip,
  IFilledRect,
  IHourTick,
  ILinearScale,
  ITooltipRow,
  IWindowRange
} from '../../charts/chart.interfaces';
import { ResponsiveChartDirective } from '../../charts/responsive-chart.directive';
import { IClockLane, IHeatLaneView, IHeatLegend, ILabeledRect } from './three-clocks.interfaces';

@Component({
  selector: 'dt-three-clocks',
  templateUrl: './three-clocks.component.html',
  styleUrl: './three-clocks.component.scss'
})
export class ThreeClocksComponent extends ResponsiveChartDirective implements OnChanges {
  private static _instanceCount = 0;

  @Input({ required: true }) public intervals: IPlanInterval[] = [];
  @Input() public rushHourWindows: IRushHourWindow[] = [];
  @Input() public scheduleId: TariffScheduleId = 'schedule-8';
  @Input() public billCaption = '';
  @Input() public edamPricePerMwh: (number | null)[] = [];
  @Input() public carbonCaption = 'Marginal CO2 (lb/MWh)';
  @Input() public mefIsPlaceholder = false;

  public readonly colors = chartColors;
  public readonly idPrefix = `dt-three-clocks-${ThreeClocksComponent._instanceCount++}`;
  public readonly stripHeight = 24;
  public viewHeight = 300;
  public plotLeft = 136;
  public plotRight = 0;
  public stripsTop = 0;
  public stripsBottom = 0;
  public axisY = 0;
  public rushLabelY = 18;
  public hourTicks: IHourTick[] = [];
  public rushRanges: IWindowRange[] = [];
  public billLane = this._emptyLane('Bill clock');
  public billSegments: ILabeledRect[] = [];
  public isAllHoursDemand = false;
  public priceView = this._emptyHeatView('Price clock');
  public carbonView = this._emptyHeatView('Carbon clock');
  public heatViews: IHeatLaneView[] = [];
  public hoverX = -1;
  public tooltip: IChartTooltip | null = null;
  public ariaLabel = '';

  public get hatchFill(): string {
    return `url(#${this.idPrefix}-hatch)`;
  }

  public get billHatchFill(): string {
    return `url(#${this.idPrefix}-bill-hatch)`;
  }

  public ngOnChanges(): void {
    this.render();
  }

  public onPointerMove(event: PointerEvent): void {
    const count = this.intervals.length;
    const index = ChartHelper.pointerIndex(
      event,
      event.currentTarget as Element,
      this.viewWidth,
      this.plotLeft,
      this.plotRight - this.plotLeft,
      count
    );

    if (index < 0) {
      this.onPointerLeave();

      return;
    }

    const interval = this.intervals[index];
    const xScale = ChartHelper.linearScale(0, count, this.plotLeft, this.plotRight);
    const edam = this.edamPricePerMwh?.[index];
    const rows: ITooltipRow[] = [
      {
        label: interval.isOnPeak ? 'On-peak energy' : 'Off-peak energy',
        value: `$${interval.energyPricePerKwh.toFixed(4)}/kWh`,
        swatch: interval.isOnPeak ? chartColors.BILL : ''
      },
      {
        label: 'EDAM day-ahead',
        value: edam === null || edam === undefined ? 'not yet posted' : `$${edam.toFixed(2)}/MWh`,
        swatch: ''
      },
      {
        label: this.mefIsPlaceholder ? 'Marginal CO2 (placeholder)' : 'Marginal CO2',
        value: `${Math.round(interval.marginalKgCo2PerKwh * chartSettings.KG_PER_KWH_TO_LB_PER_MWH).toLocaleString('en-US')} lb/MWh`,
        swatch: ''
      }
    ];
    this.hoverX = ChartHelper.round(ChartHelper.scale(xScale, index + 0.5));
    this.tooltip = ChartHelper.tooltip(
      ChartHelper.formatLocalTime(interval.startUtc),
      rows,
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
    const narrow = this.isNarrow;
    this.plotLeft = narrow ? 8 : 112;
    this.plotRight = this.viewWidth - 12;
    this.stripsTop = 28 + (narrow ? 16 : 0);
    this.isAllHoursDemand = this.scheduleId === 'schedule-6';
    this.rushLabelY = this.stripsTop - 10;
    this.onPointerLeave();

    const laneHeight = narrow ? 50 : 38;
    const lanes = [0, 1, 2].map((laneIndex) => this._layoutLane(laneIndex, laneHeight));
    this.stripsBottom = lanes[2].stripY + this.stripHeight;
    this.axisY = this.stripsBottom + 22;
    this.viewHeight = this.axisY + 22;

    lanes[0].title = 'Bill';
    lanes[0].caption = this.isAllHoursDemand
      ? `Hatched: demand counts every hour (Schedule 6). ${this.billCaption}`.trim()
      : `Dark blocks: on-peak hours, when demand is billed. ${this.billCaption}`.trim();
    lanes[1].title = 'Grid price';
    lanes[1].caption = 'Day-ahead wholesale price in PACE (EDAM). Hatched: not yet posted.';
    lanes[2].title = 'Carbon';
    lanes[2].caption = this.carbonCaption;
    this.billLane = lanes[0];

    if (intervals.length === 0) {
      this.hourTicks = [];
      this.rushRanges = [];
      this.billSegments = [];
      this.priceView = { ...this._emptyHeatView('Price clock'), lane: lanes[1] };
      this.carbonView = { ...this._emptyHeatView('Carbon clock'), lane: lanes[2] };
      this.heatViews = [];
      this.ariaLabel = 'No plan intervals';

      return;
    }

    const startUtcs = intervals.map((interval) => interval.startUtc);
    const xScale = ChartHelper.linearScale(0, intervals.length, this.plotLeft, this.plotRight);
    this.hourTicks = ChartHelper.hourTicks(startUtcs, xScale, ChartHelper.tickHoursForWidth(this.viewWidth));
    this.rushRanges = ChartHelper.windowRanges(
      startUtcs,
      this.rushHourWindows ?? [],
      xScale,
      'Rush hour'
    );
    this.billSegments = this._buildBillSegments(intervals, xScale, lanes[0]);

    const prices = intervals.map((_, i) => {
      const value = this.edamPricePerMwh?.[i];

      return value === undefined ? null : value;
    });
    this.priceView = this._buildHeatLane(
      lanes[1],
      xScale,
      prices,
      chartColors.PRICE_LOW,
      chartColors.PRICE_HIGH,
      (value) => `$${Math.round(value)}`,
      '/MWh'
    );
    this.carbonView = this._buildHeatLane(
      lanes[2],
      xScale,
      intervals.map((interval) => interval.marginalKgCo2PerKwh * chartSettings.KG_PER_KWH_TO_LB_PER_MWH),
      chartColors.CARBON_LOW,
      chartColors.CARBON_HIGH,
      (value) => Math.round(value).toLocaleString('en-US'),
      ' lb/MWh'
    );
    this.heatViews = [this.priceView, this.carbonView];
    this.ariaLabel = `Three clocks over ${intervals.length} fifteen-minute intervals: bill on-peak windows, EDAM day-ahead price and marginal carbon, with the PACE rush hour marked`;
  }

  private _layoutLane(laneIndex: number, laneHeight: number): IClockLane {
    const stripY = this.stripsTop + laneIndex * laneHeight;
    const narrow = this.isNarrow;

    return {
      title: '',
      caption: '',
      titleX: narrow ? this.plotLeft : 0,
      titleY: narrow ? stripY - 7 : stripY + 17,
      stripY
    };
  }

  private _buildBillSegments(intervals: IPlanInterval[], xScale: ILinearScale, lane: IClockLane): ILabeledRect[] {
    const runs = ChartHelper.runs(intervals.map((interval) => interval.isOnPeak));

    return runs.map((run) => {
      const x0 = ChartHelper.scale(xScale, run.startIndex);
      const x1 = ChartHelper.scale(xScale, run.endIndex + 1);
      const slice = intervals.slice(run.startIndex, run.endIndex + 1);
      const averagePrice = slice.reduce((sum, interval) => sum + interval.energyPricePerKwh, 0) / slice.length;
      const width = x1 - x0;

      return {
        x: ChartHelper.round(x0),
        y: lane.stripY,
        width: ChartHelper.round(width),
        height: this.stripHeight,
        label: width >= 72 ? `$${averagePrice.toFixed(4)}/kWh` : ''
      };
    });
  }

  private _buildHeatLane(
    lane: IClockLane,
    xScale: ILinearScale,
    values: (number | null)[],
    lowColor: string,
    highColor: string,
    formatter: (value: number) => string,
    unit: string
  ): IHeatLaneView {
    const known = values.filter((value): value is number => value !== null && Number.isFinite(value));
    const minimum = known.length ? Math.min(...known) : 0;
    const maximum = known.length ? Math.max(...known) : 0;
    const span = maximum - minimum;
    const cells: IFilledRect[] = [];

    for (let i = 0; i < values.length; i++) {
      const value = values[i];

      if (value === null || !Number.isFinite(value)) {
        continue;
      }

      const x0 = ChartHelper.scale(xScale, i);
      const x1 = ChartHelper.scale(xScale, i + 1);
      cells.push({
        x: ChartHelper.round(x0),
        y: lane.stripY,
        width: ChartHelper.round(x1 - x0 + 0.4),
        height: this.stripHeight,
        fill: ChartHelper.interpolateColor(lowColor, highColor, span > 0 ? (value - minimum) / span : 0.5)
      });
    }

    const gaps = ChartHelper.runs(values.map((value) => value === null)).map((run) => {
      const x0 = ChartHelper.scale(xScale, run.startIndex);
      const width = ChartHelper.scale(xScale, run.endIndex + 1) - x0;

      return {
        x: ChartHelper.round(x0),
        y: lane.stripY,
        width: ChartHelper.round(width),
        height: this.stripHeight,
        label: width >= 96 ? 'Not yet posted' : ''
      };
    });

    return { lane, cells, gaps, legend: this._buildLegend(known.length > 0, formatter(minimum), `${formatter(maximum)}${unit}`) };
  }

  private _buildLegend(visible: boolean, minLabel: string, maxLabel: string): IHeatLegend {
    return { visible, minLabel, maxLabel };
  }

  private _emptyLane(title: string): IClockLane {
    return { title, caption: '', titleX: 0, titleY: 0, stripY: 0 };
  }

  private _emptyHeatView(title: string): IHeatLaneView {
    return {
      lane: this._emptyLane(title),
      cells: [],
      gaps: [],
      legend: { visible: false, minLabel: '', maxLabel: '' }
    };
  }
}
