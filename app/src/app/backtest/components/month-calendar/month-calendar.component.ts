import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { IMonthCalendarCell, IMonthCalendarScale } from '../../backtest.interfaces';
import { weekdayLabels } from './month-calendar.constants';

@Component({
  selector: 'dt-month-calendar',
  imports: [NgClass],
  templateUrl: './month-calendar.component.html',
  styleUrl: './month-calendar.component.scss'
})
export class MonthCalendarComponent implements OnChanges {
  @Input() public cells: IMonthCalendarCell[] = [];
  @Input() public monthLabel = '';
  @Input() public peakLabel = '';
  @Input({ required: true }) public scale!: IMonthCalendarScale;
  @Output() public readonly daySelected = new EventEmitter<string>();

  public readonly weekdays = weekdayLabels;
  public blanks: number[] = [];

  public ngOnChanges(): void {
    const lead = this.cells.length > 0 ? this.cells[0].weekdayColumn : 0;
    this.blanks = Array.from({ length: lead }, (_, index) => index);
  }

  public select(cell: IMonthCalendarCell): void {
    this.daySelected.emit(cell.localDate);
  }

  public cutShare(cell: IMonthCalendarCell): number {
    if (cell.peakFraction <= 0) {
      return 0;
    }

    return Math.max(0, cell.peakFraction - cell.leadFraction) / cell.peakFraction;
  }

  public shavedLabel(cell: IMonthCalendarCell): string {
    const shaved = Math.round(cell.peakKw - cell.leadPeakKw);

    return shaved > 0 ? `−${shaved.toLocaleString('en-US')}` : '0';
  }

  public cellTitle(cell: IMonthCalendarCell): string | null {
    if (cell.isOffPeakDay && cell.offPeakReason) {
      return cell.offPeakReason;
    }

    if (cell.peakKw > 0) {
      return `No storage ${this.formatKw(cell.peakKw)} · ${this.scale.leadName} ${this.formatKw(cell.leadPeakKw)}`;
    }

    return null;
  }

  public formatNumber(kw: number): string {
    return Math.round(kw).toLocaleString('en-US');
  }

  public formatKw(kw: number): string {
    return `${this.formatNumber(kw)} kW`;
  }

  public ariaLabel(cell: IMonthCalendarCell): string {
    const date = new Date(`${cell.localDate}T12:00:00`);
    const day = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const parts = [day];

    if (cell.peakKw > 0) {
      parts.push(`peak ${this.formatKw(cell.peakKw)} with no storage, ${this.formatKw(cell.leadPeakKw)} with ${this.scale.leadName}`);
    }

    if (cell.isPeakDay) {
      parts.push('set the month peak');
    }

    if (cell.isOffPeakDay && cell.offPeakReason) {
      parts.push(cell.offPeakReason);
    }

    return parts.join(', ');
  }
}
