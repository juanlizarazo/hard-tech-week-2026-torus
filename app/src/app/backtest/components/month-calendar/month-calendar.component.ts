import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { IMonthCalendarCell } from '../../backtest.interfaces';
import { MIN_BAR_PERCENT, WEEKDAY_LABELS } from './month-calendar.constants';

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
  @Output() public readonly daySelected = new EventEmitter<string>();

  public readonly weekdays = WEEKDAY_LABELS;
  public blanks: number[] = [];

  public ngOnChanges(): void {
    const lead = this.cells.length > 0 ? this.cells[0].weekdayColumn : 0;
    this.blanks = Array.from({ length: lead }, (_, index) => index);
  }

  public select(cell: IMonthCalendarCell): void {
    this.daySelected.emit(cell.localDate);
  }

  public barHeight(cell: IMonthCalendarCell): number {
    if (cell.peakKw <= 0) {
      return 0;
    }

    return Math.max(MIN_BAR_PERCENT, Math.min(1, Math.max(0, cell.barFraction)) * 100);
  }

  public kwLabel(cell: IMonthCalendarCell): string {
    return `${Math.round(cell.peakKw).toLocaleString('en-US')} kW`;
  }

  public ariaLabel(cell: IMonthCalendarCell): string {
    const date = new Date(`${cell.localDate}T12:00:00`);
    const day = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    const parts = [day];

    if (cell.peakKw > 0) {
      parts.push(`peak ${Math.round(cell.peakKw).toLocaleString('en-US')} kW`);
    }

    if (cell.isPeakDay) {
      parts.push('month peak day');
    }

    if (cell.isOffPeakDay && cell.offPeakReason) {
      parts.push(cell.offPeakReason);
    }

    return parts.join(', ');
  }
}
