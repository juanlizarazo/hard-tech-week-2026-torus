import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import type { Deck, Layer, MapView } from '@deck.gl/core';
import { cityLabels, paceNode, plantMapLayout, sitePin } from '../plant-map/plant-map.constants';
import { PlantMapHelper } from '../plant-map/plant-map.helper';
import { IPlantMapData, IPlantMapHourView } from '../plant-map/plant-map.interfaces';
import { gridSceneSettings } from './grid-scene.constants';
import { GridSceneHelper } from './grid-scene.helper';
import { ISceneColumnGroup, ISceneLabel, ISceneParticle, IScenePalette, ISceneViewState } from './grid-scene.interfaces';

interface IDeckModules {
  core: typeof import('@deck.gl/core');
  layers: typeof import('@deck.gl/layers');
}

@Component({
  selector: 'dt-grid-scene',
  templateUrl: './grid-scene.component.html',
  styleUrl: './grid-scene.component.scss'
})
export class GridSceneComponent implements AfterViewInit, OnChanges, OnDestroy {
  private readonly _zone = inject(NgZone);
  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);

  @ViewChild('canvas', { static: true }) private readonly _canvas!: ElementRef<HTMLCanvasElement>;

  @Input({ required: true }) public data!: IPlantMapData;
  @Input({ required: true }) public hourView!: IPlantMapHourView;
  @Input() public paused = false;
  @Input() public drift = false;
  @Input() public home = false;

  @Output() public readonly failed = new EventEmitter<void>();

  private _modules: IDeckModules | null = null;
  private _deck: Deck<MapView> | null = null;
  private _palette!: IScenePalette;
  private _stateFeatures: object = {};
  private _columnGroups: ISceneColumnGroup[] = [];
  private _labels: ISceneLabel[] = [];
  private _particles: ISceneParticle[] = [];
  private _staticLayers: Layer[] = [];
  private _isStaticDirty = true;
  private _isDataDirty = true;
  private _isDestroyed = false;
  private _isVisible = true;
  private _frameId = 0;
  private _lastTime = 0;
  private _clock = 0;
  private _size = { width: 0, height: 0 };
  private _fitKey = '';
  private _fit: Pick<ISceneViewState, 'longitude' | 'latitude' | 'zoom'> | null = null;
  private readonly _phases = new Map<string, number>();
  private _resizeObserver: ResizeObserver | null = null;
  private _intersectionObserver: IntersectionObserver | null = null;

  public get ariaLabel(): string {
    return this.data && this.hourView ? PlantMapHelper.ariaLabel(this.data, this.hourView) : 'Schematic map of the PACE power plants';
  }

  public ngOnChanges(changes: SimpleChanges): void {
    this._isStaticDirty = true;

    if (changes['data']) {
      this._isDataDirty = true;
    }
  }

  public ngAfterViewInit(): void {
    this._zone.runOutsideAngular(() => {
      void this._start();
    });
  }

  public ngOnDestroy(): void {
    this._isDestroyed = true;
    cancelAnimationFrame(this._frameId);
    this._resizeObserver?.disconnect();
    this._intersectionObserver?.disconnect();
    this._deck?.finalize();
    this._deck = null;
  }

  private async _start(): Promise<void> {
    try {
      const [core, layers] = await Promise.all([import('@deck.gl/core'), import('@deck.gl/layers')]);

      if (this._isDestroyed) {
        return;
      }

      this._modules = { core, layers };
      this._palette = GridSceneHelper.palette(this._host.nativeElement);
      this._deck = new core.Deck({
        canvas: this._canvas.nativeElement,
        width: null,
        height: null,
        controller: false,
        views: new core.MapView({ id: 'scene', controller: false }),
        initialViewState: { longitude: paceNode.lon, latitude: paceNode.lat, zoom: 4, pitch: gridSceneSettings.PITCH, bearing: gridSceneSettings.BEARING },
        layers: [],
        onError: () => this._fail()
      });
      this._observe();
      this._frameId = requestAnimationFrame((time) => this._tick(time));
    } catch (error) {
      console.error('The 3D grid scene could not start', error);
      this._fail();
    }
  }

  private _observe(): void {
    const element = this._host.nativeElement;

    this._resizeObserver = new ResizeObserver((entries) => {
      const box = entries[0].contentRect;
      this._size = { width: box.width, height: box.height };
    });
    this._resizeObserver.observe(element);
    this._intersectionObserver = new IntersectionObserver((entries) => {
      const isVisible = entries[0].isIntersecting;

      if (isVisible && !this._isVisible) {
        this._lastTime = 0;
        this._frameId = requestAnimationFrame((time) => this._tick(time));
      }

      this._isVisible = isVisible;
    });
    this._intersectionObserver.observe(element);
  }

  private _fail(): void {
    if (this._isDestroyed) {
      return;
    }

    this._zone.run(() => this.failed.emit());
  }

  private _tick(time: number): void {
    if (this._isDestroyed || !this._deck || !this._modules) {
      return;
    }

    if (!this._isVisible) {
      return;
    }

    const delta = this._lastTime === 0 ? 0 : Math.min((time - this._lastTime) / 1000, gridSceneSettings.MAX_FRAME_S);
    this._lastTime = time;

    if (!this.paused) {
      this._clock += delta;
      this._advance(delta);
    }

    if (this._isDataDirty) {
      this._stateFeatures = GridSceneHelper.stateFeatures(this.data.geoStates);
      this._columnGroups = GridSceneHelper.columnGroups(this.data);
      this._labels = GridSceneHelper.labels(this._palette);
      this._particles = GridSceneHelper.particles(this.data);
      this._isDataDirty = false;
    }

    if (this._isStaticDirty) {
      this._staticLayers = this._buildStaticLayers(this._modules);
      this._isStaticDirty = false;
    }

    if (this._size.width > 0 && this._size.height > 0) {
      this._deck.setProps({
        viewState: this._viewState(this._modules, time),
        layers: [...this._staticLayers, ...this._buildLiveLayers(this._modules)]
      });
    }

    this._frameId = requestAnimationFrame((next) => this._tick(next));
  }

  private _advance(delta: number): void {
    const view = this.hourView;
    const fuels = new Set(this._particles.map((particle) => particle.fuelKey));

    for (const fuelKey of fuels) {
      const relative = fuelKey === 'SITE' ? GridSceneHelper.siteLevel(view) : GridSceneHelper.relative(view, fuelKey);

      this._phases.set(fuelKey, (this._phases.get(fuelKey) ?? 0) + delta * GridSceneHelper.speed(relative));
    }

    for (const particle of this._particles) {
      const relative = particle.kind === 'site' ? GridSceneHelper.siteLevel(view) : GridSceneHelper.relative(view, particle.fuelKey);
      const t = (((this._phases.get(particle.fuelKey) ?? 0) + particle.offset) % 1 + 1) % 1;
      const fade = Math.sqrt(Math.sin(Math.PI * t));
      const color = particle.kind === 'site' ? (view.isRush ? this._palette.rush : this._palette.ink) : GridSceneHelper.fuelColor(particle.fuelKey);

      particle.position = GridSceneHelper.curvePoint(particle, t);
      particle.size = 1.4 + 2.2 * relative;
      particle.color = [color[0], color[1], color[2], Math.round((90 + 165 * relative) * fade)];
    }
  }

  private _viewState(modules: IDeckModules, time: number): ISceneViewState {
    const { width, height } = this._size;
    const key = `${width}x${height}:${this.home}`;

    if (key !== this._fitKey || !this._fit) {
      const padding = gridSceneSettings.PADDING_PX;
      const viewport = new modules.core.WebMercatorViewport({ width, height });
      const fit = viewport.fitBounds(
        [
          [plantMapLayout.WEST_LON, plantMapLayout.SOUTH_LAT],
          [plantMapLayout.EAST_LON, plantMapLayout.NORTH_LAT]
        ],
        { padding: { top: padding, bottom: padding, right: padding, left: this.home ? Math.round(width * gridSceneSettings.HOME_LEFT_PADDING) : padding } }
      );
      const trim = this.home ? gridSceneSettings.HOME_ZOOM_TRIM : gridSceneSettings.CHART_ZOOM_TRIM;

      this._fit = { longitude: fit.longitude, latitude: fit.latitude, zoom: fit.zoom - trim };
      this._fitKey = key;
    }

    const sway = this.drift ? gridSceneSettings.DRIFT_DEGREES * Math.sin((2 * Math.PI * time) / 1000 / gridSceneSettings.DRIFT_PERIOD_S) : 0;

    return { ...this._fit, pitch: gridSceneSettings.PITCH, bearing: gridSceneSettings.BEARING + sway };
  }

  private _buildStaticLayers(modules: IDeckModules): Layer[] {
    const { GeoJsonLayer, ColumnLayer, ScatterplotLayer, TextLayer } = modules.layers;
    const palette = this._palette;
    const view = this.hourView;
    const hour = view.hour;
    const transition = { duration: gridSceneSettings.TRANSITION_MS };

    const states = new GeoJsonLayer({
      id: 'scene-states',
      data: this._stateFeatures as never,
      stroked: true,
      filled: false,
      getLineColor: [...palette.lineStrong, 255],
      getLineWidth: 1.5,
      lineWidthUnits: 'pixels'
    });

    const columns = this._columnGroups.map(
      (group) =>
        new ColumnLayer<{ lon: number; lat: number; fuelKey: string }>({
          id: `scene-columns-${group.id}`,
          data: group.columns,
          diskResolution: group.diskResolution,
          radius: group.radius,
          extruded: true,
          getPosition: (column) => [column.lon, column.lat],
          getFillColor: (column) => [...GridSceneHelper.fuelColor(column.fuelKey), GridSceneHelper.alpha(view.opacityByFuel[column.fuelKey] ?? 0)],
          getElevation: (column) => GridSceneHelper.elevation(GridSceneHelper.relative(view, column.fuelKey)),
          material: { ambient: 0.65, diffuse: 0.5, shininess: 24, specularColor: [200, 200, 200] },
          updateTriggers: { getFillColor: hour, getElevation: hour },
          transitions: { getFillColor: transition, getElevation: transition }
        })
    );

    const markers = new ScatterplotLayer<{ lon: number; lat: number; radius: number; color: number[]; edge: number[] }>({
      id: 'scene-markers',
      data: [
        { lon: paceNode.lon, lat: paceNode.lat, radius: 6, color: [...palette.ink, 255], edge: [...palette.panel, 255] },
        { lon: sitePin.lon, lat: sitePin.lat, radius: 5, color: [...palette.ink, 255], edge: [...palette.panel, 255] },
        ...cityLabels.map((city) => ({ lon: city.lon, lat: city.lat, radius: 3.5, color: [...palette.clear, 255], edge: [...palette.panel, 255] }))
      ],
      stroked: true,
      radiusUnits: 'pixels',
      lineWidthUnits: 'pixels',
      getPosition: (marker) => [marker.lon, marker.lat],
      getRadius: (marker) => marker.radius,
      getFillColor: (marker) => marker.color as [number, number, number, number],
      getLineColor: (marker) => marker.edge as [number, number, number, number],
      getLineWidth: 1.5
    });

    const labels = new TextLayer<ISceneLabel>({
      id: 'scene-labels',
      data: this._labels,
      getPosition: (label) => [label.lon, label.lat],
      getText: (label) => label.text,
      getSize: (label) => label.size,
      getColor: (label) => label.color,
      getPixelOffset: (label) => label.offset,
      getTextAnchor: (label) => label.anchor,
      getAlignmentBaseline: 'center',
      sizeUnits: 'pixels',
      fontFamily: gridSceneSettings.FONT_FAMILY,
      fontWeight: 700,
      fontSettings: { sdf: true },
      outlineWidth: 3,
      outlineColor: [...palette.paper, 255],
      billboard: true
    });

    return [states, ...columns, markers, labels];
  }

  private _buildLiveLayers(modules: IDeckModules): Layer[] {
    const { ScatterplotLayer } = modules.layers;
    const frame = Math.round(this._clock * 1000);
    const particles = new ScatterplotLayer<ISceneParticle>({
      id: 'scene-particles',
      data: this._particles,
      radiusUnits: 'pixels',
      getPosition: (particle) => particle.position,
      getRadius: (particle) => particle.size,
      getFillColor: (particle) => particle.color,
      updateTriggers: { getPosition: frame, getRadius: frame, getFillColor: frame },
      parameters: { depthWriteEnabled: false }
    });

    if (!this.hourView.isRush) {
      return [particles];
    }

    const rings = [0, 0.5].map((shift) => {
      const progress = ((this._clock / gridSceneSettings.RING_PERIOD_S + shift) % 1 + 1) % 1;

      return new ScatterplotLayer<{ progress: number }>({
        id: `scene-ring-${shift}`,
        data: [{ progress }],
        stroked: true,
        filled: false,
        radiusUnits: 'meters',
        lineWidthUnits: 'pixels',
        getPosition: () => [paceNode.lon, paceNode.lat],
        getRadius: (ring) => gridSceneSettings.RING_MIN_RADIUS_M + gridSceneSettings.RING_RADIUS_RANGE_M * ring.progress,
        getLineColor: (ring) => [...this._palette.rush, Math.round(230 * (1 - ring.progress))],
        getLineWidth: 2.5,
        updateTriggers: { getRadius: frame, getLineColor: frame }
      });
    });

    return [particles, ...rings];
  }
}
