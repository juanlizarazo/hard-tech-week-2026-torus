import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'dt-screen-toolbar',
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './screen-toolbar.component.html',
  styleUrl: './screen-toolbar.component.scss'
})
export class ScreenToolbarComponent {
  @Input({ required: true }) public title = '';
  @Input() public subtitle = '';
  @Input() public showBack = false;
  @Output() public readonly back = new EventEmitter<void>();

  public onBack(): void {
    this.back.emit();
  }
}
