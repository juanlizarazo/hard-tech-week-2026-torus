import { Component, Input } from '@angular/core';
import { IPlantMapData, IPlantMapHourView } from '../plant-map/plant-map.interfaces';
import { PlantMapHelper } from '../plant-map/plant-map.helper';
import { plantMapLayout } from '../plant-map/plant-map.constants';

@Component({
  selector: 'dt-plant-map-svg',
  templateUrl: './plant-map-svg.component.html',
  styleUrl: './plant-map-svg.component.scss'
})
export class PlantMapSvgComponent {
  @Input({ required: true }) public data!: IPlantMapData;
  @Input({ required: true }) public hourView!: IPlantMapHourView;
  @Input() public paused = false;
  @Input() public fill = false;

  public readonly width = plantMapLayout.WIDTH;

  public get ariaLabel(): string {
    return PlantMapHelper.ariaLabel(this.data, this.hourView);
  }
}
