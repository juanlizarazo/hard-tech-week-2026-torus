import { Component, Input } from '@angular/core';
import { sourceKindLabels } from './source-chip.constants';

@Component({
  selector: 'dt-source-chip',
  templateUrl: './source-chip.component.html',
  styleUrl: './source-chip.component.scss'
})
export class SourceChipComponent {
  @Input({ required: true }) public label = '';
  @Input() public kind = '';
  @Input() public url = '';
  @Input() public note = '';

  public get kindLabel(): string {
    if (!this.kind) {
      return '';
    }

    return sourceKindLabels[this.kind] ?? this.kind.charAt(0).toUpperCase() + this.kind.slice(1).replace(/-/g, ' ');
  }
}
