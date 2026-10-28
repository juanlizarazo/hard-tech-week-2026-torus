import { Component, Input } from '@angular/core';
import { sourceKindLabels, sourcePageUrls } from './source-chip.constants';

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

  public get pageUrl(): string {
    const match = sourcePageUrls.find((entry) => this.url.startsWith(entry.apiPrefix));

    return match?.pageUrl ?? this.url;
  }

  public get tooltip(): string {
    const text = this.note || this.label;

    return this.pageUrl === this.url ? text : `${text}. Pulled from the ${new URL(this.url).host} API; the link opens the public data page.`;
  }
}
