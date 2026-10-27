import { Component, Input } from '@angular/core';
import { FigureSize, FigureTone } from './figure.types';

@Component({
  selector: 'dt-figure',
  templateUrl: './figure.component.html',
  styleUrl: './figure.component.scss'
})
export class FigureComponent {
  @Input({ required: true }) public value = '';
  @Input({ required: true }) public label = '';
  @Input() public detail = '';
  @Input() public tone: FigureTone = 'neutral';
  @Input() public size: FigureSize = 'lead';
}
