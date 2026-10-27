import { Component, Input, TemplateRef, ViewChild, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { SidePanelService } from '../side-panel/side-panel.service';

@Component({
  selector: 'dt-chart-frame',
  imports: [MatIconModule],
  templateUrl: './chart-frame.component.html',
  styleUrl: './chart-frame.component.scss'
})
export class ChartFrameComponent {
  private readonly _sidePanelService = inject(SidePanelService);

  @Input({ required: true }) public title = '';
  @Input() public notice = '';
  @Input() public simulated = false;
  @Input() public hasHowToRead = true;

  @ViewChild('howToRead', { static: true }) private readonly _howToRead!: TemplateRef<unknown>;

  public onOpenHowToRead(): void {
    this._sidePanelService.openTemplate(`How to read: ${this.title}`, this._howToRead);
  }
}
