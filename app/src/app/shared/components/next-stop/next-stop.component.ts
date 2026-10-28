import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'dt-next-stop',
  imports: [RouterLink, MatIconModule],
  templateUrl: './next-stop.component.html',
  styleUrl: './next-stop.component.scss'
})
export class NextStopComponent {
  @Input({ required: true }) public path = '';
  @Input({ required: true }) public title = '';
  @Input() public sign = '';
  @Input() public fragment: string | undefined;
  @Input() public label = 'Next stop';
}
