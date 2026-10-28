import { AfterViewInit, Component, ElementRef, EventEmitter, Input, NgZone, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, inject } from '@angular/core';
import type { Deck, Layer, MapView } from '@deck.gl/core';
import { cityLabels, paceNode, plantMapLayout, sitePin } from '../plant-map/plant-map.constants';
import { PlantMapHelper } from '../plant-map/plant-map.helper';
import { IPlantMapData, IPlantMapHourView } from '../plant-map/plant-map.interfaces';
import { gridSceneSettings } from './grid-scene.constants';
import { GridSceneHelper } from './grid-scene.helper';
import { ISceneColumnGroup, ISceneDot, ISceneEdge, ISceneWire, ISceneLabel, ISceneParticle, IScenePalette, ISceneViewState } from './grid-scene.interfaces';

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

  private readonly _pointerTarget = { x: 0, y: 0 };
  private readonly _pointerTilt = { x: 0, y: 0 };
  private readonly _onPointerMove = (event: PointerEvent): void => {
    this._pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
    this._pointerTarget.y = (event.clientY / window.innerHeight) * 2 - 1;
  };
  private readonly _onPointerLeave = (): void => {
    this._pointerTarget.x = 0;
    this._pointerTarget.y = 0;
  };
  private _modules: IDeckModules | null = null;
  private _deck: Deck<MapView> | null = null;
  private _palette!: IScenePalette;
  private _stateFeatures: object = {};
  private _columnGroups: ISceneColumnGroup[] = [];
  private _labels: ISceneLabel[] = [];
  private _particles: ISceneParticle[] = [];
  private _dots: ISceneDot[] = [];
  private _cores: ISceneDot[] = [];
  private _wires: ISceneWire[] = [];
  private _edges: ISceneEdge[] = [];
  private _edgeSegments: ISceneWire[] = [];
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
    window.removeEventListener('pointermove', this._onPointerMove);
    document.documentElement.removeEventListener('pointerleave', this._onPointerLeave);
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

      if (this.home && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.addEventListener('pointermove', this._onPointerMove, { passive: true });
        document.documentElement.addEventListener('pointerleave', this._onPointerLeave);
      }

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
      this._wires = GridSceneHelper.wires(this._particles);
      this._edges = GridSceneHelper.edges(this.data.geoStates);
      this._isDataDirty = false;
    }

    if (this._isStaticDirty) {
      this._staticLayers = this._buildStaticLayers(this._modules);
      this._isStaticDirty = false;
    }

    if (this._size.width > 0 && this._size.height > 0) {
      this._deck.setProps({
        viewState: this._viewState(this._modules, time),
        layers: [...this._buildLiveLayers(this._modules), ...this._staticLayers]
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

    const dots: ISceneDot[] = [];
    const cores: ISceneDot[] = [];

    for (const particle of this._particles) {
      const relative = particle.kind === 'site' ? GridSceneHelper.siteLevel(view) : GridSceneHelper.relative(view, particle.fuelKey);
      const t = (((this._phases.get(particle.fuelKey) ?? 0) + particle.offset) % 1 + 1) % 1;
      const color = particle.kind === 'site' ? (view.isRush ? this._palette.rush : this._palette.ink) : GridSceneHelper.fuelColor(particle.fuelKey);

      GridSceneHelper.beam(particle, t, this._clock, relative, color, dots, cores);
    }

    const edgeSegments: ISceneWire[] = [];

    for (const edge of this._edges) {
      GridSceneHelper.edgeComet(edge, this._clock, gridSceneSettings.EDGE_COLOR, edgeSegments);
    }

    this._edgeSegments = edgeSegments;

    this._dots = dots;
    this._cores = cores;
  }

  private _viewState(modules: IDeckModules, time: number): ISceneViewState {
    const { width, height } = this._size;
    const key = `${width}x${height}:${this.home}`;

    if (key !== this._fitKey || !this._fit) {
      const padding = gridSceneSettings.PADDING_PX;
      const isWideHome = this.home && width >= gridSceneSettings.MOBILE_MIN_WIDTH_PX;
      const viewport = new modules.core.WebMercatorViewport({ width, height });
      const fit = viewport.fitBounds(
        [
          [plantMapLayout.WEST_LON, plantMapLayout.SOUTH_LAT],
          [plantMapLayout.EAST_LON, plantMapLayout.NORTH_LAT]
        ],
        { padding: { top: padding, bottom: padding, right: padding, left: isWideHome ? Math.round(width * gridSceneSettings.HOME_LEFT_PADDING) : padding } }
      );
      const trim = isWideHome ? gridSceneSettings.HOME_ZOOM_TRIM : this.home ? gridSceneSettings.HOME_NARROW_ZOOM_TRIM : gridSceneSettings.CHART_ZOOM_TRIM;

      this._fit = { longitude: fit.longitude, latitude: fit.latitude, zoom: fit.zoom - trim };
      this._fitKey = key;
    }

    const sway = this.drift ? gridSceneSettings.DRIFT_DEGREES * Math.sin((2 * Math.PI * time) / 1000 / gridSceneSettings.DRIFT_PERIOD_S) : 0;

    const { PARALLAX_EASE, PARALLAX_BEARING, PARALLAX_PITCH } = gridSceneSettings;

    this._pointerTilt.x += (this._pointerTarget.x - this._pointerTilt.x) * PARALLAX_EASE;
    this._pointerTilt.y += (this._pointerTarget.y - this._pointerTilt.y) * PARALLAX_EASE;

    return {
      ...this._fit,
      pitch: gridSceneSettings.PITCH - this._pointerTilt.y * PARALLAX_PITCH,
      bearing: gridSceneSettings.BEARING + sway + this._pointerTilt.x * PARALLAX_BEARING
    };
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
      filled: true,
      getFillColor: [...palette.lineStrong, 16],
      getLineColor: [...palette.lineStrong, 105],
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
          getFillColor: (column) => [...GridSceneHelper.softColor(column.fuelKey), GridSceneHelper.glassAlpha(GridSceneHelper.relative(view, column.fuelKey))],
          getElevation: (column) => GridSceneHelper.elevation(GridSceneHelper.relative(view, column.fuelKey)),
          material: { ambient: 0.65, diffuse: 0.5, shininess: 24, specularColor: [200, 200, 200] },
          wireframe: true,
          getLineColor: (column) => [...GridSceneHelper.softColor(column.fuelKey), 170],
          lineWidthMinPixels: 1,
          updateTriggers: { getFillColor: hour, getElevation: hour },
          transitions: { getFillColor: transition, getElevation: transition }
        })
    );

    const footprints = this._columnGroups.map(
      (group) =>
        new ScatterplotLayer<{ lon: number; lat: number }>({
          id: `scene-footprints-${group.id}`,
          data: group.columns,
          stroked: true,
          filled: true,
          radiusUnits: 'meters',
          lineWidthUnits: 'pixels',
          getPosition: (column) => [column.lon, column.lat],
          getRadius: group.radius * gridSceneSettings.FOOTPRINT_SCALE,
          getFillColor: [...palette.lineStrong, 26],
          getLineColor: [...palette.lineStrong, 150],
          getLineWidth: 1.2,
          parameters: { depthWriteEnabled: false }
        })
    );

    const caps = this._columnGroups.map(
      (group) =>
        new ColumnLayer<{ lon: number; lat: number; fuelKey: string }>({
          id: `scene-caps-${group.id}`,
          data: group.columns,
          diskResolution: group.diskResolution,
          radius: group.radius,
          extruded: true,
          getPosition: (column) => [
            column.lon,
            column.lat,
            GridSceneHelper.elevation(GridSceneHelper.relative(view, column.fuelKey))
          ],
          getElevation: gridSceneSettings.CAP_HEIGHT_M,
          getFillColor: (column) => [...GridSceneHelper.softColor(column.fuelKey), 120],
          getLineColor: [255, 255, 255, 200],
          wireframe: true,
          lineWidthMinPixels: 1,
          material: { ambient: 0.9, diffuse: 0.2, shininess: 8 },
          updateTriggers: { getPosition: hour },
          transitions: { getPosition: transition }
        })
    );

    const markers = new ScatterplotLayer<{ lon: number; lat: number; radius: number; color: number[]; edge: number[] }>({
      id: 'scene-markers',
      data: [
        { lon: paceNode.lon, lat: paceNode.lat, radius: gridSceneSettings.NODE_RADIUS_PX, color: [...palette.ink, 255], edge: [...palette.rush, 200] },
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

    const nodeGlow = new ScatterplotLayer<{ radius: number; alpha: number }>({
      id: 'scene-node-glow',
      data: [
        { radius: gridSceneSettings.NODE_HALO_PX, alpha: 26 },
        { radius: gridSceneSettings.NODE_RING_PX, alpha: 0 }
      ],
      stroked: true,
      filled: true,
      radiusUnits: 'pixels',
      lineWidthUnits: 'pixels',
      getPosition: () => [paceNode.lon, paceNode.lat],
      getRadius: (ring) => ring.radius,
      getFillColor: (ring) => [...palette.rush, ring.alpha],
      getLineColor: (ring) => [...palette.rush, ring.alpha === 0 ? 190 : 0],
      getLineWidth: 1.5,
      parameters: gridSceneSettings.ADDITIVE
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
      background: true,
      getBackgroundColor: [...palette.paper, 150],
      backgroundPadding: [4, 2],
      billboard: true,
      parameters: { depthCompare: 'always' }
    });

    return [states, ...footprints, ...columns, ...caps, nodeGlow, markers, labels];
  }

  private _buildLiveLayers(modules: IDeckModules): Layer[] {
    const { ScatterplotLayer, PathLayer } = modules.layers;
    const frame = Math.round(this._clock * 1000);
    const wires = new PathLayer<ISceneWire>({
      id: 'scene-wires',
      data: this._wires,
      getPath: (wire) => wire.path,
      getColor: (wire) => wire.color,
      widthUnits: 'pixels',
      getWidth: 1,
      capRounded: true,
      parameters: gridSceneSettings.ADDITIVE
    });
    const edgeComet = new PathLayer<ISceneWire>({
      id: 'scene-edge-comet',
      data: this._edgeSegments,
      getPath: (segment) => segment.path,
      getColor: (segment) => segment.color,
      widthUnits: 'pixels',
      getWidth: gridSceneSettings.EDGE_WIDTH_PX,
      updateTriggers: { getPath: frame, getColor: frame },
      parameters: gridSceneSettings.ADDITIVE
    });
    const cores = new ScatterplotLayer<ISceneDot>({
      id: 'scene-cores',
      data: this._cores,
      radiusUnits: 'pixels',
      getPosition: (dot) => dot.position,
      getRadius: (dot) => dot.size,
      getFillColor: (dot) => dot.color,
      updateTriggers: { getPosition: frame, getRadius: frame, getFillColor: frame },
      parameters: gridSceneSettings.ADDITIVE
    });
    const halos = new ScatterplotLayer<ISceneDot>({
      id: 'scene-halos',
      data: this._dots,
      radiusUnits: 'pixels',
      getPosition: (dot) => dot.position,
      getRadius: (dot) => dot.size * gridSceneSettings.HALO_SCALE,
      getFillColor: (dot) => [dot.color[0], dot.color[1], dot.color[2], Math.round(dot.color[3] * 0.1)],
      updateTriggers: { getPosition: frame, getRadius: frame, getFillColor: frame },
      parameters: gridSceneSettings.ADDITIVE
    });
    const particles = new ScatterplotLayer<ISceneDot>({
      id: 'scene-particles',
      data: this._dots,
      radiusUnits: 'pixels',
      getPosition: (dot) => dot.position,
      getRadius: (dot) => dot.size,
      getFillColor: (dot) => dot.color,
      updateTriggers: { getPosition: frame, getRadius: frame, getFillColor: frame },
      parameters: gridSceneSettings.ADDITIVE
    });

    if (!this.hourView.isRush) {
      return [wires, edgeComet, halos, particles, cores];
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
        getLineColor: (ring) => [...this._palette.rush, Math.round(110 * (1 - ring.progress))],
        getLineWidth: 1.5,
        updateTriggers: { getRadius: frame, getLineColor: frame }
      });
    });

    return [wires, edgeComet, halos, particles, cores, ...rings];
  }
}
