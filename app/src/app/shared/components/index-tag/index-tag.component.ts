import { AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewChild, inject } from '@angular/core';
import { FocusMonitor, FocusOrigin } from '@angular/cdk/a11y';
import { OverlayModule } from '@angular/cdk/overlay';
import { termPositions, termSettings } from '../term/term.constants';
import { indexKey, indexStages } from './index-tag.constants';

@Component({
  selector: 'dt-index-tag',
  imports: [OverlayModule],
  templateUrl: './index-tag.component.html',
  styleUrl: './index-tag.component.scss'
})
export class IndexTagComponent implements AfterViewInit, OnDestroy {
  private static _instanceCount = 0;

  private readonly _focusMonitor = inject(FocusMonitor);
  private _hideTimer: ReturnType<typeof setTimeout> | null = null;

  @Input({ required: true }) public index = '';
  @Input() public variant: 'plate' | 'tag' = 'plate';

  @ViewChild('trigger', { static: true }) private readonly _trigger!: ElementRef<HTMLButtonElement>;

  public readonly positions = termPositions;
  public readonly popoverId = `dt-index-tag-${IndexTagComponent._instanceCount++}`;
  public readonly descriptionId = `${this.popoverId}-description`;
  public isOpen = false;

  public get description(): string {
    const stage = indexStages[this.index.charAt(0)];
    const number = Number(this.index.slice(1));
    const place = number === 0 ? 'lead instrument' : `instrument ${number}`;

    return stage ? `${this.index} · ${stage.name}, ${place}. ${indexKey}` : this.index;
  }

  public ngAfterViewInit(): void {
    this._focusMonitor.monitor(this._trigger).subscribe((origin: FocusOrigin) => this._onFocusChange(origin));
  }

  public show(): void {
    this.cancelHide();
    this.isOpen = true;
  }

  public hideSoon(): void {
    this.cancelHide();
    this._hideTimer = setTimeout(() => (this.isOpen = false), termSettings.HIDE_DELAY_MS);
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
    this._focusMonitor.stopMonitoring(this._trigger);
    this.cancelHide();
  }

  private _onFocusChange(origin: FocusOrigin): void {
    if (origin === 'keyboard') {
      this.show();

      return;
    }

    if (!origin) {
      this.hide();
    }
  }
}
