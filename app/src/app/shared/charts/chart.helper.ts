import { IRushHourWindow } from '@app/core/models/plan.interfaces';
import {
  IChartTooltip,
  IHourTick,
  IIndexRun,
  ILabelPlacement,
  ILinearScale,
  ILocalTimeParts,
  IRect,
  ITooltipRow,
  IValueTick,
  IWindowRange
} from './chart.interfaces';
import { chartLayout, chartSettings } from './chart.constants';

export class ChartHelper {
  private static readonly _partsFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: chartSettings.TIME_ZONE,
    hourCycle: 'h23',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    day: 'numeric'
  });

  public static linearScale(
    domainMin: number,
    domainMax: number,
    rangeMin: number,
    rangeMax: number
  ): ILinearScale {
    return { domainMin, domainMax, rangeMin, rangeMax };
  }

  public static scale(linear: ILinearScale, value: number): number {
    const span = linear.domainMax - linear.domainMin;

    if (span === 0) {
      return linear.rangeMin;
    }

    return linear.rangeMin + ((value - linear.domainMin) / span) * (linear.rangeMax - linear.rangeMin);
  }

  public static niceMax(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
      return 1;
    }

    const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
    const steps = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];

    for (const step of steps) {
      if (value <= step * magnitude) {
        return step * magnitude;
      }
    }

    return 10 * magnitude;
  }

  public static niceStep(span: number, targetCount: number): number {
    const raw = span / Math.max(1, targetCount);
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
    const steps = [1, 2, 2.5, 5, 10];

    for (const step of steps) {
      if (raw <= step * magnitude) {
        return step * magnitude;
      }
    }

    return 10 * magnitude;
  }

  public static valueTicks(
    linear: ILinearScale,
    targetCount: number,
    formatter: (value: number) => string
  ): IValueTick[] {
    const span = linear.domainMax - linear.domainMin;

    if (span <= 0) {
      return [];
    }

    const step = ChartHelper.niceStep(span, targetCount);
    const ticks: IValueTick[] = [];
    const first = Math.ceil(linear.domainMin / step) * step;

    for (let value = first; value <= linear.domainMax + step * 1e-6; value += step) {
      const rounded = Math.round(value / step) * step;
      ticks.push({ y: ChartHelper.scale(linear, rounded), label: formatter(rounded) });
    }

    return ticks;
  }

  public static stepLinePath(xScale: ILinearScale, yScale: ILinearScale, values: number[]): string {
    if (values.length === 0) {
      return '';
    }

    const commands: string[] = [];

    for (let i = 0; i < values.length; i++) {
      const xStart = ChartHelper.round(ChartHelper.scale(xScale, i));
      const xEnd = ChartHelper.round(ChartHelper.scale(xScale, i + 1));
      const y = ChartHelper.round(ChartHelper.scale(yScale, values[i]));

      if (i === 0) {
        commands.push(`M${xStart},${y}`);
      } else {
        commands.push(`V${y}`);
      }

      commands.push(`H${xEnd}`);
    }

    return commands.join('');
  }

  public static linePath(
    xScale: ILinearScale,
    yScale: ILinearScale,
    values: number[],
    indexOffset: number
  ): string {
    const commands: string[] = [];

    for (let i = 0; i < values.length; i++) {
      const x = ChartHelper.round(ChartHelper.scale(xScale, i + indexOffset));
      const y = ChartHelper.round(ChartHelper.scale(yScale, values[i]));
      commands.push(`${i === 0 ? 'M' : 'L'}${x},${y}`);
    }

    return commands.join('');
  }

  public static stepAreaPath(
    xScale: ILinearScale,
    yScale: ILinearScale,
    tops: number[],
    bottoms: number[] | number
  ): string {
    if (tops.length === 0) {
      return '';
    }

    const upper = ChartHelper.stepLinePath(xScale, yScale, tops);
    const lowerValues = Array.isArray(bottoms) ? bottoms : tops.map(() => bottoms);
    const commands: string[] = [];

    for (let i = lowerValues.length - 1; i >= 0; i--) {
      const xStart = ChartHelper.round(ChartHelper.scale(xScale, i));
      const y = ChartHelper.round(ChartHelper.scale(yScale, lowerValues[i]));
      commands.push(`V${y}`, `H${xStart}`);
    }

    return `${upper}${commands.join('')}Z`;
  }

  public static barRect(
    xScale: ILinearScale,
    yScale: ILinearScale,
    index: number,
    fromValue: number,
    toValue: number,
    gap: number
  ): IRect {
    const xStart = ChartHelper.scale(xScale, index);
    const xEnd = ChartHelper.scale(xScale, index + 1);
    const slot = xEnd - xStart;
    const horizontalGap = slot > gap * 2 ? gap : 0;
    const yFrom = ChartHelper.scale(yScale, fromValue);
    const yTo = ChartHelper.scale(yScale, toValue);

    return {
      x: ChartHelper.round(xStart + horizontalGap / 2),
      y: ChartHelper.round(Math.min(yFrom, yTo)),
      width: ChartHelper.round(Math.max(0.5, slot - horizontalGap)),
      height: ChartHelper.round(Math.abs(yTo - yFrom))
    };
  }

  public static localParts(startUtc: string): ILocalTimeParts {
    const parts = ChartHelper._partsFormatter.formatToParts(new Date(startUtc));
    const read = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((part) => part.type === type)?.value ?? '';

    return {
      hour: Number(read('hour')) % 24,
      minute: Number(read('minute')),
      weekday: read('weekday'),
      day: Number(read('day'))
    };
  }

  public static hourLabel(hour: number): string {
    const suffix = hour < 12 ? 'a' : 'p';
    const twelve = hour % 12 === 0 ? 12 : hour % 12;

    return `${twelve}${suffix}`;
  }

  public static formatLocalTime(startUtc: string): string {
    const parts = ChartHelper.localParts(startUtc);
    const suffix = parts.hour < 12 ? 'a' : 'p';
    const twelve = parts.hour % 12 === 0 ? 12 : parts.hour % 12;
    const minute = parts.minute.toString().padStart(2, '0');

    return `${parts.weekday} ${parts.day}, ${twelve}:${minute}${suffix}`;
  }

  public static tickHoursForWidth(width: number): number {
    if (width >= chartLayout.TICK_WIDTH_THRESHOLD) {
      return chartLayout.WIDE_TICK_HOURS;
    }

    return chartLayout.NARROW_TICK_HOURS;
  }

  public static hourTicks(startUtcs: string[], xScale: ILinearScale, stepHours: number): IHourTick[] {
    const ticks: IHourTick[] = [];

    for (let i = 0; i < startUtcs.length; i++) {
      const parts = ChartHelper.localParts(startUtcs[i]);

      if (parts.minute !== 0 || parts.hour % stepHours !== 0) {
        continue;
      }

      const isMidnight = parts.hour === 0;
      ticks.push({
        x: ChartHelper.round(ChartHelper.scale(xScale, i)),
        label: ChartHelper.hourLabel(parts.hour),
        dayLabel: isMidnight ? `${parts.weekday} ${parts.day}` : '',
        isMidnight
      });
    }

    return ticks;
  }

  public static windowIndexRun(startUtcs: string[], window: IRushHourWindow): IIndexRun | null {
    const windowStart = Date.parse(window.startUtc);
    const windowEnd = Date.parse(window.endUtc);
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < startUtcs.length; i++) {
      const time = Date.parse(startUtcs[i]);

      if (time >= windowStart && time < windowEnd) {
        if (startIndex < 0) {
          startIndex = i;
        }

        endIndex = i;
      }
    }

    if (startIndex < 0) {
      return null;
    }

    return { startIndex, endIndex };
  }

  public static windowRanges(
    startUtcs: string[],
    windows: IRushHourWindow[],
    xScale: ILinearScale,
    baseLabel: string
  ): IWindowRange[] {
    const ranges: IWindowRange[] = [];
    let previousLabelEnd = -Infinity;

    for (const window of windows) {
      const run = ChartHelper.windowIndexRun(startUtcs, window);

      if (!run) {
        continue;
      }

      const x0 = ChartHelper.round(ChartHelper.scale(xScale, run.startIndex));
      const x1 = ChartHelper.round(ChartHelper.scale(xScale, run.endIndex + 1));
      const fullLabel = window.isAssumption ? `${baseLabel} (assumed)` : baseLabel;
      const fullPlacement = ChartHelper._labelPlacement(fullLabel, x0, x1, xScale.rangeMax, previousLabelEnd);
      const label = fullPlacement.fits || !window.isAssumption ? fullLabel : 'Assumed';
      const placement = label === fullLabel ? fullPlacement : ChartHelper._labelPlacement(label, x0, x1, xScale.rangeMax, previousLabelEnd);
      const anchorEnd = placement.anchorEnd;
      const labelX = placement.labelX;
      previousLabelEnd = placement.end;

      ranges.push({ x0, x1, label, labelX, labelAnchor: anchorEnd ? 'end' : 'start' });
    }

    return ranges;
  }

  private static _labelPlacement(
    label: string,
    x0: number,
    x1: number,
    rangeMax: number,
    previousLabelEnd: number
  ): ILabelPlacement {
    const width = label.length * chartLayout.LABEL_CHAR_WIDTH;
    const anchorEnd = x0 + width > rangeMax;
    const start = anchorEnd ? x1 - width : x0;

    return {
      labelX: anchorEnd ? x1 : x0,
      anchorEnd,
      end: anchorEnd ? x1 : x0 + width,
      fits: start >= previousLabelEnd + 8
    };
  }

  public static runs(flags: boolean[]): IIndexRun[] {
    const result: IIndexRun[] = [];
    let startIndex = -1;

    for (let i = 0; i <= flags.length; i++) {
      const isOn = i < flags.length && flags[i];

      if (isOn && startIndex < 0) {
        startIndex = i;
      }

      if (!isOn && startIndex >= 0) {
        result.push({ startIndex, endIndex: i - 1 });
        startIndex = -1;
      }
    }

    return result;
  }

  public static interpolateColor(lowHex: string, highHex: string, ratio: number): string {
    const clamped = Math.min(1, Math.max(0, Number.isFinite(ratio) ? ratio : 0));
    const low = ChartHelper.hexToRgb(lowHex);
    const high = ChartHelper.hexToRgb(highHex);
    const channels = low.map((channel, i) => Math.round(channel + (high[i] - channel) * clamped));

    return `#${channels.map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
  }

  public static formatCompact(value: number): string {
    const absolute = Math.abs(value);

    if (absolute >= 1000) {
      const thousands = value / 1000;
      const digits = Number.isInteger(thousands) ? 0 : 1;

      return `${thousands.toFixed(digits)}K`;
    }

    return `${Math.round(value)}`;
  }

  public static formatKw(value: number): string {
    return `${Math.round(value).toLocaleString('en-US')} kW`;
  }

  public static formatKwh(value: number): string {
    return `${Math.round(value).toLocaleString('en-US')} kWh`;
  }

  public static formatNumber(value: number, fractionDigits: number): string {
    return value.toLocaleString('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits
    });
  }

  public static pointerIndex(
    event: PointerEvent,
    element: Element,
    viewWidth: number,
    plotLeft: number,
    plotWidth: number,
    count: number
  ): number {
    const bounds = element.getBoundingClientRect();

    if (bounds.width === 0 || count === 0) {
      return -1;
    }

    const viewX = ((event.clientX - bounds.left) / bounds.width) * viewWidth;
    const index = Math.floor(((viewX - plotLeft) / plotWidth) * count);

    if (index < 0 || index >= count) {
      return -1;
    }

    return index;
  }

  public static tooltip(title: string, rows: ITooltipRow[], centerX: number, viewWidth: number): IChartTooltip {
    const leftPercent = (centerX / viewWidth) * 100;

    return { title, rows, leftPercent, alignRight: leftPercent > 60 };
  }

  public static round(value: number): number {
    return Math.round(value * 10) / 10;
  }

  private static hexToRgb(hex: string): number[] {
    const clean = hex.replace('#', '');

    return [0, 2, 4].map((offset) => parseInt(clean.slice(offset, offset + 2), 16));
  }
}
