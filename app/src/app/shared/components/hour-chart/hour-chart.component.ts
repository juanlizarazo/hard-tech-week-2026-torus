import { AfterViewInit, Component, ElementRef, Input, NgZone, OnChanges, OnDestroy, inject } from '@angular/core';
import {
  IHourChartBand,
  IHourChartBandPath,
  IHourChartHighlight,
  IHourChartLegendItem,
  IHourChartPath,
  IHourChartSeries,
  IHourChartTableRow,
  IHourChartTick,
  IHourChartTooltipRow
} from './hour-chart.interfaces';
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
  @Input() public valueFormat: (value: number) => string = (value: number): string => value.toFixed(0);
  @Input() public title = '';
  @Input() public dividerIndices: number[] = [];
  @Input() public estimateFromIndex: number | null = null;

  public width = 640;
  public height = 300;
  public readonly plotLeft = 48;
  public plotRight = 628;
  public readonly plotTop = 26;
  public plotBottom = 268;

  public yTicks: IHourChartTick[] = [];
  public xTicks: IHourChartTick[] = [];
  public dividers: number[] = [];
  public linePaths: IHourChartPath[] = [];
  public bandPaths: IHourChartBandPath[] = [];
  public legendItems: IHourChartLegendItem[] = [];
  public tableHeaders: string[] = [];
  public tableRows: IHourChartTableRow[] = [];
  public highlightRect: { x: number; width: number } | null = null;
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

  public get hoverMarkers(): { y: number; color: string }[] {
    if (this.hoverIndex === null) {
      return [];
    }

    return this.series
      .filter((line: IHourChartSeries): boolean => this._valueAt(line.values, this.hoverIndex as number) !== null)
      .map((line: IHourChartSeries): { y: number; color: string } => ({
        y: this._yAt(this._valueAt(line.values, this.hoverIndex as number) as number),
        color: line.color
      }));
  }

  public ngAfterViewInit(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    this._resizeObserver = new ResizeObserver((): void => {
      this._zone.run((): void => {
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
    this._computeScale();
    this._buildTicks();
    this._buildPaths();
    this._buildLegend();
    this._buildTable();
    this._buildSummary();
    this.dividers = this.dividerIndices.map((index: number): number => this._xAt(index - 0.5));
    this.highlightRect = this._buildHighlight();
    this.hoverIndex = null;
  }

  public onPointerMove(event: PointerEvent): void {
    const svg = this._host.nativeElement.querySelector('svg');
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
    const hostWidth = Math.round(this._host.nativeElement.clientWidth) - 2;

    if (hostWidth < 200) {
      return;
    }
    this.width = Math.max(260, hostWidth - 32);
    this.height = this.width < 420 ? 240 : this.width < 640 ? 270 : 300;
    this.plotRight = this.width - 12;
    this.plotBottom = this.height - 32;
  }

  private _setHover(index: number): void {
    this.hoverIndex = index;
    const isEstimate = this.estimateFromIndex !== null && index >= this.estimateFromIndex;
    this.tooltipTitle = (this.xLabels[index] ?? `#${index + 1}`) + (isEstimate ? ' (estimate)' : '');
    this.tooltipLeftPercent = (this._xAt(index) / this.width) * 100;
    this.tooltipFlip = index > (this._pointCount() - 1) / 2;
    const bandRows = this.bands.map((band: IHourChartBand): IHourChartTooltipRow => {
      const lower = this._valueAt(band.lower, index);
      const upper = this._valueAt(band.upper, index);

      return {
        label: band.label,
        color: band.color,
        dashArray: '',
        isBand: true,
        text: lower === null || upper === null ? 'no data' : `${this.valueFormat(lower)} to ${this.valueFormat(upper)}`
      };
    });
    const lineRows = this.series.map((line: IHourChartSeries): IHourChartTooltipRow => {
      const value = this._valueAt(line.values, index);

      return {
        label: line.label,
        color: line.color,
        dashArray: this._dashArray(line.style),
        isBand: false,
        text: value === null ? 'no data' : this.valueFormat(value)
      };
    });
    this.tooltipRows = [...lineRows, ...bandRows];
  }

  private _pointCount(): number {
    const lengths = [
      this.xLabels.length,
      ...this.series.map((line: IHourChartSeries): number => line.values.length),
      ...this.bands.map((band: IHourChartBand): number => band.upper.length)
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

    return value === undefined || value === null || Number.isNaN(value) ? null : value;
  }

  private _dashArray(style: HourChartLineStyle): string {
    if (style === 'dashed') {
      return '7 4';
    }

    if (style === 'dotted') {
      return '1.5 4';
    }

    return '';
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

    if (low > 0 && low < high * 0.5) {
      low = 0;
    }

    if (low === high) {
      high = low + 1;
    }
    const rawStep = (high - low) / 4;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const residual = rawStep / magnitude;
    const niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 2.5 ? 2.5 : residual <= 5 ? 5 : 10;
    const step = niceResidual * magnitude;
    this._yMin = Math.floor(low / step) * step;
    this._yMax = Math.ceil(high / step) * step;
    const ticks: IHourChartTick[] = [];

    for (let value = this._yMin; value <= this._yMax + step / 2; value += step) {
      ticks.push({ position: this._yAt(value), label: Math.round(value).toLocaleString() });
    }
    this.yTicks = ticks;
  }

  private _buildTicks(): void {
    const count = this._pointCount();
    const candidates = [1, 2, 3, 4, 6, 8, 12, 24];
    const step = candidates.find((candidate: number): boolean => count / candidate <= (this.width < 420 ? 5 : 7)) ?? 24;
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
          opacity: 1,
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
        opacity: 1,
        path: this._segmentPath(line.values, 0, split - 1)
      });
      paths.push({
        key: `${line.label}-estimate`,
        label: line.label,
        color: line.color,
        dashArray: '3 4',
        opacity: 0.6,
        path: this._segmentPath(line.values, Math.max(0, split - 1), count - 1)
      });
    }
    this.linePaths = paths.filter((entry: IHourChartPath): boolean => entry.path !== '');

    this.bandPaths = this.bands.map((band: IHourChartBand): IHourChartBandPath => {
      const runs: string[] = [];
      let run: number[] = [];

      for (let index = 0; index <= count; index++) {
        const inRun = index < count && this._valueAt(band.lower, index) !== null && this._valueAt(band.upper, index) !== null;

        if (inRun) {
          run.push(index);
          continue;
        }

        if (run.length > 0) {
          const top = run.map((point: number, position: number): string =>
            `${position === 0 ? 'M' : 'L'}${this._xAt(point).toFixed(1)} ${this._yAt(this._valueAt(band.upper, point) as number).toFixed(1)}`
          );
          const bottom = [...run].reverse().map((point: number): string =>
            `L${this._xAt(point).toFixed(1)} ${this._yAt(this._valueAt(band.lower, point) as number).toFixed(1)}`
          );
          runs.push(`${top.join('')}${bottom.join('')}Z`);
          run = [];
        }
      }

      return { label: band.label, color: band.color, path: runs.join('') };
    });
  }

  private _buildLegend(): void {
    this.legendItems = [
      ...this.series.map((line: IHourChartSeries): IHourChartLegendItem => ({
        label: line.label,
        color: line.color,
        dashArray: this._dashArray(line.style),
        isBand: false
      })),
      ...this.bands.map((band: IHourChartBand): IHourChartLegendItem => ({
        label: band.label,
        color: band.color,
        dashArray: '',
        isBand: true
      }))
    ];
  }

  private _buildTable(): void {
    const count = this._pointCount();
    this.tableHeaders = [
      ...this.series.map((line: IHourChartSeries): string => line.label),
      ...this.bands.map((band: IHourChartBand): string => band.label)
    ];
    const rows: IHourChartTableRow[] = [];

    for (let index = 0; index < count; index++) {
      const lineCells = this.series.map((line: IHourChartSeries): string => {
        const value = this._valueAt(line.values, index);

        return value === null ? '-' : this.valueFormat(value);
      });
      const bandCells = this.bands.map((band: IHourChartBand): string => {
        const lower = this._valueAt(band.lower, index);
        const upper = this._valueAt(band.upper, index);

        return lower === null || upper === null ? '-' : `${this.valueFormat(lower)} to ${this.valueFormat(upper)}`;
      });
      const isEstimate = this.estimateFromIndex !== null && index >= this.estimateFromIndex;
      rows.push({
        xLabel: (this.xLabels[index] ?? `#${index + 1}`) + (isEstimate ? ' (estimate)' : ''),
        cells: [...lineCells, ...bandCells]
      });
    }
    this.tableRows = rows;
  }

  private _buildSummary(): void {
    const parts = this.series.map((line: IHourChartSeries): string => {
      const values = line.values.filter((value: number | null): value is number => value !== null);

      if (values.length === 0) {
        return `${line.label}: no data`;
      }

      return `${line.label} from ${this.valueFormat(Math.min(...values))} to ${this.valueFormat(Math.max(...values))}`;
    });
    const highlightText = this.highlight ? `. Highlighted: ${this.highlight.label}` : '';
    this.ariaSummary = `${this.title || 'Line chart'}, ${this._pointCount()} points, ${this.yLabel}. ${parts.join('; ')}${highlightText}`;
  }

  private _buildHighlight(): { x: number; width: number } | null {
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
