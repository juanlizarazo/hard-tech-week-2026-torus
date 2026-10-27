import { Component, OnDestroy } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { MatIconModule } from '@angular/material/icon';
import { simulatedBadgePositions, simulatedBadgeSettings } from './simulated-badge.constants';

@Component({
  selector: 'dt-simulated-badge',
  imports: [MatIconModule, OverlayModule],
  templateUrl: './simulated-badge.component.html',
  styleUrl: './simulated-badge.component.scss'
})
export class SimulatedBadgeComponent implements OnDestroy {
  private _hideTimer: ReturnType<typeof setTimeout> | null = null;

  public readonly copy = simulatedBadgeSettings;
  public readonly positions = simulatedBadgePositions;
  public readonly popoverId = 'dt-simulated-badge-popover';
  public isOpen = false;

  public show(): void {
    this.cancelHide();
    this.isOpen = true;
  }

  public toggle(): void {
    this.cancelHide();
    this.isOpen = !this.isOpen;
  }

  public hideSoon(): void {
    this.cancelHide();
    this._hideTimer = setTimeout(() => (this.isOpen = false), simulatedBadgeSettings.HIDE_DELAY_MS);
  }

  public hide(): void {
    this.cancelHide();
    this.isOpen = false;
  }

  public cancelHide(): void {
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
  }

  public ngOnDestroy(): void {
    this.cancelHide();
  }
}
