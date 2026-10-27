import { Component, HostListener, inject } from '@angular/core';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { A11yModule } from '@angular/cdk/a11y';
import { MatIconModule } from '@angular/material/icon';
import { SidePanelService } from './side-panel.service';

@Component({
  selector: 'dt-side-panel',
  imports: [AsyncPipe, NgTemplateOutlet, A11yModule, MatIconModule],
  templateUrl: './side-panel.component.html',
  styleUrl: './side-panel.component.scss'
})
export class SidePanelComponent {
  private readonly _sidePanelService = inject(SidePanelService);

  public readonly content$ = this._sidePanelService.content$;

  @HostListener('document:keydown.escape')
  public onEscape(): void {
    this.onClose();
  }

  public onClose(): void {
    this._sidePanelService.close();
  }
}
