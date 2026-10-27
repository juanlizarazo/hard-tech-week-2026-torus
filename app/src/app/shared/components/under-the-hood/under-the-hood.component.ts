import { Component, Input } from '@angular/core';

@Component({
  selector: 'dt-under-the-hood',
  templateUrl: './under-the-hood.component.html',
  styleUrl: './under-the-hood.component.scss'
})
export class UnderTheHoodComponent {
  @Input() public summary = 'Under the hood';
  @Input() public description = '';
  @Input() public open = false;
}
