import { Component, Input } from '@angular/core';

@Component({
  selector: 'dt-print-masthead',
  templateUrl: './print-masthead.component.html',
  styleUrl: './print-masthead.component.scss'
})
export class PrintMastheadComponent {
  private static readonly _pulledFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Denver',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  @Input({ required: true }) public siteName = '';
  @Input({ required: true }) public rateLabel = '';
  @Input({ required: true }) public dayLabel = '';
  @Input() public seed = 42;
  @Input() public pulledAt: Date | null = null;

  public get pulledLabel(): string {
    return this.pulledAt ? `${PrintMastheadComponent._pulledFormatter.format(this.pulledAt)} MT` : 'recently';
  }
}
