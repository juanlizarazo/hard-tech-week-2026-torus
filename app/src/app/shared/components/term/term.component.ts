import { Component, Input, OnDestroy, inject } from '@angular/core';
import { OverlayModule } from '@angular/cdk/overlay';
import { GlossaryKey } from '../../glossary/glossary.types';
import { GlossaryHelper } from '../../glossary/glossary.helper';
import { IGlossaryEntry } from '../../glossary/glossary.interfaces';
import { SidePanelService } from '../side-panel/side-panel.service';
import { termPositions, termSettings } from './term.constants';

@Component({
  selector: 'dt-term',
  imports: [OverlayModule],
  templateUrl: './term.component.html',
  styleUrl: './term.component.scss'
})
export class TermComponent implements OnDestroy {
  private static _instanceCount = 0;

  private readonly _sidePanelService = inject(SidePanelService);
  private _hideTimer: ReturnType<typeof setTimeout> | null = null;

  @Input({ required: true }) public key!: GlossaryKey;

  public readonly positions = termPositions;
  public readonly popoverId = `dt-term-${TermComponent._instanceCount++}`;
  public isOpen = false;

  public get entry(): IGlossaryEntry {
    return GlossaryHelper.entry(this.key);
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

  public openMore(): void {
    this.hide();
    this._sidePanelService.openEntry(this.entry);
  }

  public ngOnDestroy(): void {
    this.cancelHide();
  }
}
