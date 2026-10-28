import { Component, HostListener, Input, OnInit } from '@angular/core';
import { GridSceneComponent } from '../grid-scene/grid-scene.component';
import { GridSceneHelper } from '../grid-scene/grid-scene.helper';
import { plantMapLayout } from '../plant-map/plant-map.constants';
import { IPlantMapData, IPlantMapHourView } from '../plant-map/plant-map.interfaces';
import { PlantMapSvgComponent } from '../plant-map-svg/plant-map-svg.component';

@Component({
  selector: 'dt-plant-map-surface',
  imports: [GridSceneComponent, PlantMapSvgComponent],
  templateUrl: './plant-map-surface.component.html',
  styleUrl: './plant-map-surface.component.scss'
})
export class PlantMapSurfaceComponent implements OnInit {
  @Input({ required: true }) public data!: IPlantMapData;
  @Input({ required: true }) public hourView!: IPlantMapHourView;
  @Input() public paused = false;
  @Input() public fill = false;

  public readonly width = plantMapLayout.WIDTH;
  public useDeck = false;
  private _hasFailed = false;

  public ngOnInit(): void {
    this.useDeck = GridSceneHelper.canUseDeck();
  }

  @HostListener('window:resize')
  public onResize(): void {
    this.useDeck = !this._hasFailed && GridSceneHelper.canUseDeck();
  }

  public onFailed(): void {
    this._hasFailed = true;
    this.useDeck = false;
  }
}
