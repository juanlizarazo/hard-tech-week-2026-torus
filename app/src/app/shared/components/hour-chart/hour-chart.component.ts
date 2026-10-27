import { AfterViewInit, Component, ElementRef, Input, NgZone, OnChanges, OnDestroy, inject } from '@angular/core';
import {
  IHourChartBand,
  IHourChartBandPath,
  IHourChartBandPoint,
  IHourChartHighlight,
  IHourChartHighlightRect,
  IHourChartLegendItem,
  IHourChartMarker,
  IHourChartPath,
  IHourChartSeries,
  IHourChartTableRow,
  IHourChartTick,
  IHourChartTooltipRow
} from './hour-chart.interfaces';
import { hourChartDashPatterns, hourChartEstimate, hourChartLayout, hourChartTicks } from './hour-chart.constants';
import { HourChartLineStyle } from './hour-chart.types';

@Component({
  selector: 'dt-hour-chart',
  templateUrl: './hour-chart.component.html',
  styleUrl: './hour-chart.component.scss'
})
export class HourChartComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() public series: IHourChartSeries[] = [];
  @Input() public bands: IHourChartBand[] = [];
  @Input() public highlight: IHourChartHighlight | null = null;
  @Input() public xLabels: string[] = [];
  @Input() public yLabel = '';
  @Input() public valueFormat: (value: number) => string = (value) => value.toFixed(0);
  @Input() public title = '';
  @Input() public dividerIndices: number[] = [];
  @Input() public estimateFromIndex: number | null = null;

  public width = hourChartLayout.DEFAULT_WIDTH;
  public height = hourChartLayout.DEFAULT_HEIGHT;
  public readonly plotLeft = hourChartLayout.PLOT_LEFT;
  public plotRight = hourChartLayout.DEFAULT_PLOT_RIGHT;
  public readonly plotTop = hourChartLayout.PLOT_TOP;
  public plotBottom = hourChartLayout.DEFAULT_PLOT_BOTTOM;

  public yTicks: IHourChartTick[] = [];
  public xTicks: IHourChartTick[] = [];
  public dividers: number[] = [];
  public linePaths: IHourChartPath[] = [];
  public bandPaths: IHourChartBandPath[] = [];
  public legendItems: IHourChartLegendItem[] = [];
  public tableHeaders: string[] = [];
  public tableRows: IHourChartTableRow[] = [];
  public highlightRect: IHourChartHighlightRect | null = null;
  public hasData = false;
  public ariaSummary = '';
  public hoverIndex: number | null = null;
  public tooltipRows: IHourChartTooltipRow[] = [];
  public tooltipTitle = '';
  public tooltipLeftPercent = 0;
  public tooltipFlip = false;

  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _zone = inject(NgZone);
  private _resizeObserver: ResizeObserver | null = null;
  private _yMin = 0;
  private _yMax = 1;

  public get hoverX(): number {
    return this._xAt(this.hoverIndex ?? 0);
  }

  public get hoverMarkers(): IHourChartMarker[] {
    const index = this.hoverIndex;
    const markers: IHourChartMarker[] = [];

    if (index === null) {
      return markers;
    }

    for (const line of this.series) {
      const value = this._valueAt(line.values, index);

      if (value !== null) {
        markers.push({ y: this._yAt(value), color: line.color });
      }
    }

    return markers;
  }

  public xTickAnchor(index: number): string {
    if (index === 0) {
      return 'start';
    }

    return index === this.xTicks.length - 1 ? 'end' : 'middle';
  }

  public ngAfterViewInit(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this._resizeObserver = new ResizeObserver(() => {
      this._zone.run(() => {
        this._applySize();
        this.ngOnChanges();
      });
    });
    this._resizeObserver.observe(this._host.nativeElement);
  }

  public ngOnDestroy(): void {
    this._resizeObserver?.disconnect();
  }

  public ngOnChanges(): void {
    this.hasData = this._allValues().length > 0;
    this._computeScale();
    this._buildTicks();
    this._buildPaths();
    this._buildLegend();
    this._buildTable();
    this._buildSummary();
    this.dividers = this.dividerIndices.map((index) => this._xAt(index - 0.5));
    this.highlightRect = this._buildHighlight();
    this.hoverIndex = null;
  }

  public onPointerMove(event: PointerEvent): void {
    const svg = this._host.nativeElement.querySelector('svg.dt-hour-chart__svg');
    const count = this._pointCount();

    if (!svg || count === 0) {
      return;
    }

    const box = svg.getBoundingClientRect();
    const viewX = ((event.clientX - box.left) / box.width) * this.width;
    const ratio = (viewX - this.plotLeft) / (this.plotRight - this.plotLeft);
    const index = Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));

    this._setHover(index);
  }

  public onPointerLeave(): void {
    this.hoverIndex = null;
  }

  private _applySize(): void {
    const hostWidth = Math.round(this._host.nativeElement.clientWidth) - hourChartLayout.HOST_BORDER;

    if (hostWidth < hourChartLayout.MIN_HOST_WIDTH) {
      return;
    }

    this.width = Math.max(hourChartLayout.MIN_WIDTH, hostWidth - hourChartLayout.HOST_PADDING);
    this.height = this._heightFor(this.width);
    this.plotRight = this.width - hourChartLayout.PLOT_RIGHT_INSET;
    this.plotBottom = this.height - hourChartLayout.PLOT_BOTTOM_INSET;
  }

  private _heightFor(width: number): number {
    if (width < hourChartLayout.NARROW_WIDTH) {
      return hourChartLayout.NARROW_HEIGHT;
    }

    if (width < hourChartLayout.MEDIUM_WIDTH) {
      return hourChartLayout.MEDIUM_HEIGHT;
    }

    return hourChartLayout.DEFAULT_HEIGHT;
  }

  private _setHover(index: number): void {
    this.hoverIndex = index;
    this.tooltipTitle = this._rowLabel(index);
    this.tooltipLeftPercent = (this._xAt(index) / this.width) * 100;
    this.tooltipFlip = index > (this._pointCount() - 1) / 2;
    const bandRows = this.bands.map((band) => {
      const lower = this._valueAt(band.lower, index);
      const upper = this._valueAt(band.upper, index);

      return {
        label: band.label,
        color: band.color,
        dashArray: hourChartDashPatterns.NONE,
        isBand: true,
        text: this._bandText(lower, upper, 'no data')
      };
    });
    const lineRows = this.series.map((line) => {
      const value = this._valueAt(line.values, index);

      return {
        label: line.label,
        color: line.color,
        dashArray: this._dashArray(line.style),
        isBand: false,
        text: this._lineText(value, 'no data')
      };
    });
    this.tooltipRows = [...lineRows, ...bandRows];
  }

  private _rowLabel(index: number): string {
    const isEstimate = this.estimateFromIndex !== null && index >= this.estimateFromIndex;

    return (this.xLabels[index] ?? `#${index + 1}`) + (isEstimate ? ' (estimate)' : '');
  }

  private _bandText(lower: number | null, upper: number | null, emptyText: string): string {
    if (lower === null || upper === null) {
      return emptyText;
    }

    return `${this.valueFormat(lower)} to ${this.valueFormat(upper)}`;
  }

  private _lineText(value: number | null, emptyText: string): string {
    return value === null ? emptyText : this.valueFormat(value);
  }

  private _pointCount(): number {
    const lengths = [
      this.xLabels.length,
      ...this.series.map((line) => line.values.length),
      ...this.bands.map((band) => band.upper.length)
    ];

    return Math.max(0, ...lengths);
  }

  private _xAt(index: number): number {
    const count = this._pointCount();

    if (count <= 1) {
      return this.plotLeft;
    }

    return this.plotLeft + (index / (count - 1)) * (this.plotRight - this.plotLeft);
  }

  private _yAt(value: number): number {
    const ratio = (value - this._yMin) / (this._yMax - this._yMin);

    return this.plotBottom - ratio * (this.plotBottom - this.plotTop);
  }

  private _valueAt(values: (number | null)[], index: number): number | null {
    const value = values[index];

    if (value === undefined || value === null || Number.isNaN(value)) {
      return null;
    }

    return value;
  }

  private _dashArray(style: HourChartLineStyle): string {
    if (style === 'dashed') {
      return hourChartDashPatterns.DASHED;
    }

    if (style === 'dotted') {
      return hourChartDashPatterns.DOTTED;
    }

    return hourChartDashPatterns.NONE;
  }

  private _allValues(): number[] {
    const values: number[] = [];

    for (const line of this.series) {
      for (const value of line.values) {
        if (value !== null && value !== undefined && !Number.isNaN(value)) {
          values.push(value);
        }
      }
    }

    for (const band of this.bands) {
      for (const value of [...band.lower, ...band.upper]) {
        if (value !== null && value !== undefined && !Number.isNaN(value)) {
          values.push(value);
        }
      }
    }

    return values;
  }

  private _computeScale(): void {
    const values = this._allValues();

    if (values.length === 0) {
      this._yMin = 0;
      this._yMax = 1;
      this.yTicks = [];

      return;
    }

    let low = Math.min(...values);
    let high = Math.max(...values);

    if (low > 0 && low < high * hourChartTicks.Y_ZERO_BASE_RATIO) {
      low = 0;
    }

    if (low === high) {
      high = low + 1;
    }

    const step = this._niceStep((high - low) / hourChartTicks.Y_TARGET_INTERVALS);

    this._yMin = Math.floor(low / step) * step;
    this._yMax = Math.ceil(high / step) * step;
    const ticks: IHourChartTick[] = [];

    for (let value = this._yMin; value <= this._yMax + step / 2; value += step) {
      ticks.push({ position: this._yAt(value), label: Math.round(value).toLocaleString() });
    }
    this.yTicks = ticks;
  }

  private _niceStep(rawStep: number): number {
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / magnitude;
    const niceResidual = hourChartTicks.Y_NICE_RESIDUALS.find((candidate) => residual <= candidate);

    return (niceResidual ?? hourChartTicks.Y_NICE_FALLBACK) * magnitude;
  }

  private _buildTicks(): void {
    const count = this._pointCount();
    const maxCount = this.width < hourChartLayout.NARROW_WIDTH ? hourChartTicks.X_MAX_COUNT_NARROW : hourChartTicks.X_MAX_COUNT_WIDE;
    const step =
      hourChartTicks.X_STEP_CANDIDATES.find((candidate) => count / candidate <= maxCount) ?? hourChartTicks.X_FALLBACK_STEP;
    const ticks: IHourChartTick[] = [];

    for (let index = 0; index < count; index += step) {
      ticks.push({ position: this._xAt(index), label: this.xLabels[index] ?? '' });
    }
    this.xTicks = ticks;
  }

  private _segmentPath(values: (number | null)[], from: number, to: number): string {
    let path = '';
    let drawing = false;

    for (let index = from; index <= to; index++) {
      const value = this._valueAt(values, index);

      if (value === null) {
        drawing = false;
        continue;
      }

      path += `${drawing ? 'L' : 'M'}${this._xAt(index).toFixed(1)} ${this._yAt(value).toFixed(1)}`;
      drawing = true;
    }

    return path;
  }

  private _buildPaths(): void {
    const count = this._pointCount();
    const paths: IHourChartPath[] = [];

    for (const line of this.series) {
      const dashArray = this._dashArray(line.style);

      if (this.estimateFromIndex === null || this.estimateFromIndex >= count) {
        paths.push({
          key: line.label,
          label: line.label,
          color: line.color,
          dashArray,
          opacity: hourChartEstimate.SOLID_OPACITY,
          path: this._segmentPath(line.values, 0, count - 1)
        });
        continue;
      }

      const split = Math.max(0, this.estimateFromIndex);
      paths.push({
        key: `${line.label}-actual`,
        label: line.label,
        color: line.color,
        dashArray,
        opacity: hourChartEstimate.SOLID_OPACITY,
        path: this._segmentPath(line.values, 0, split - 1)
      });
      paths.push({
        key: `${line.label}-estimate`,
        label: line.label,
        color: line.color,
        dashArray: hourChartDashPatterns.ESTIMATE,
        opacity: hourChartEstimate.OPACITY,
        path: this._segmentPath(line.values, Math.max(0, split - 1), count - 1)
      });
    }
    this.linePaths = paths.filter((entry) => entry.path !== '');
    this.bandPaths = this.bands.map(
      (band) => ({ label: band.label, color: band.color, path: this._bandPath(band, count) })
    );
  }

  private _bandPath(band: IHourChartBand, count: number): string {
    const runs: string[] = [];
    let run: IHourChartBandPoint[] = [];

    for (let index = 0; index <= count; index++) {
      const lower = index < count ? this._valueAt(band.lower, index) : null;
      const upper = index < count ? this._valueAt(band.upper, index) : null;

      if (lower !== null && upper !== null) {
        run.push({ index, lower, upper });
        continue;
      }

      if (run.length > 0) {
        runs.push(this._bandRunPath(run));
        run = [];
      }
    }

    return runs.join('');
  }

  private _bandRunPath(run: IHourChartBandPoint[]): string {
    const top = run.map(
      (point, position) =>
        `${position === 0 ? 'M' : 'L'}${this._xAt(point.index).toFixed(1)} ${this._yAt(point.upper).toFixed(1)}`
    );
    const bottom = [...run]
      .reverse()
      .map((point) => `L${this._xAt(point.index).toFixed(1)} ${this._yAt(point.lower).toFixed(1)}`);

    return `${top.join('')}${bottom.join('')}Z`;
  }

  private _buildLegend(): void {
    this.legendItems = [
      ...this.series.map((line) => ({
        label: line.label,
        color: line.color,
        dashArray: this._dashArray(line.style),
        isBand: false
      })),
      ...this.bands.map((band) => ({
        label: band.label,
        color: band.color,
        dashArray: hourChartDashPatterns.NONE,
        isBand: true
      }))
    ];
  }

  private _buildTable(): void {
    const count = this._pointCount();

    this.tableHeaders = [
      ...this.series.map((line) => line.label),
      ...this.bands.map((band) => band.label)
    ];
    const rows: IHourChartTableRow[] = [];

    for (let index = 0; index < count; index++) {
      const lineCells = this.series.map((line) => {
        const value = this._valueAt(line.values, index);

        return this._lineText(value, '-');
      });
      const bandCells = this.bands.map((band) => {
        const lower = this._valueAt(band.lower, index);
        const upper = this._valueAt(band.upper, index);

        return this._bandText(lower, upper, '-');
      });

      rows.push({
        xLabel: this._rowLabel(index),
        cells: [...lineCells, ...bandCells]
      });
    }
    this.tableRows = rows;
  }

  private _buildSummary(): void {
    const parts = this.series.map((line) => {
      const values = line.values.filter((value) => value !== null);

      if (values.length === 0) {
        return `${line.label}: no data`;
      }

      return `${line.label} from ${this.valueFormat(Math.min(...values))} to ${this.valueFormat(Math.max(...values))}`;
    });
    const highlightText = this.highlight ? `. Highlighted: ${this.highlight.label}` : '';

    this.ariaSummary = `${this.title || 'Line chart'}, ${this._pointCount()} points, ${this.yLabel}. ${parts.join('; ')}${highlightText}`;
  }

  private _buildHighlight(): IHourChartHighlightRect | null {
    if (!this.highlight) {
      return null;
    }
    const count = this._pointCount();
    const slot = count > 1 ? (this.plotRight - this.plotLeft) / (count - 1) : 0;
    const start = this._xAt(this.highlight.startIndex) - slot / 2;
    const end = this._xAt(this.highlight.endIndex) + slot / 2;
    const clampedStart = Math.max(this.plotLeft, start);

    return { x: clampedStart, width: Math.max(0, Math.min(this.plotRight, end) - clampedStart) };
  }
}
