import { Component, ElementRef, EventEmitter, Input, Output, inject } from '@angular/core';
import { IYearLedgerMonth } from '../../backtest.interfaces';

@Component({
  selector: 'dt-year-ledger',
  templateUrl: './year-ledger.component.html',
  styleUrl: './year-ledger.component.scss'
})
export class YearLedgerComponent {
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

  @Input({ required: true }) public months: IYearLedgerMonth[] = [];
  @Input({ required: true }) public selected = '';
  @Input() public summerRange: [number, number] | null = null;
  @Input() public partialLabel = '';
  @Output() public readonly monthSelected = new EventEmitter<string>();

  public get selectedIndex(): number {
    return Math.max(0, this.months.findIndex((entry: IYearLedgerMonth) => entry.month === this.selected));
  }

  public select(month: string): void {
    if (month !== this.selected) {
      this.monthSelected.emit(month);
    }
  }

  public onKeydown(event: KeyboardEvent): void {
    const last = this.months.length - 1;
    const current = this.selectedIndex;
    const targets: Record<string, number> = {
      ArrowRight: Math.min(last, current + 1),
      ArrowDown: Math.min(last, current + 1),
      ArrowLeft: Math.max(0, current - 1),
      ArrowUp: Math.max(0, current - 1),
      Home: 0,
      End: last
    };
    const target = targets[event.key];

    if (target === undefined) {
      return;
    }

    event.preventDefault();
    this.select(this.months[target].month);
    this._host.nativeElement.querySelectorAll<HTMLElement>('[role="radio"]')[target]?.focus();
  }
}
