import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'dt-alert-banner',
  imports: [MatIconModule],
  templateUrl: './alert-banner.component.html',
  styleUrl: './alert-banner.component.scss'
})
export class AlertBannerComponent {
  @Input({ required: true }) public message = '';
  @Input() public variant: 'error' | 'info' = 'error';
  @Output() public readonly dismissed = new EventEmitter<void>();

  public onDismiss(): void {
    this.dismissed.emit();
  }
}
