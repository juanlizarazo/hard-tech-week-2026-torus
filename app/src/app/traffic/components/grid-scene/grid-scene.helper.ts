import { cityLabels, mapFuels, paceNode, plantMapLayout, sitePin, stateLabels } from '../plant-map/plant-map.constants';
import { IPlantMapData, IPlantMapHourView, IStateOutline } from '../plant-map/plant-map.interfaces';
import { fallbackScenePalette, gridSceneSettings } from './grid-scene.constants';
import { ISceneColumnGroup, ISceneDot, ISceneLabel, ISceneWire, ISceneParticle, IScenePoint, IScenePalette, SceneColor } from './grid-scene.interfaces';

export class GridSceneHelper {
  private static _webgl2: boolean | null = null;

  public static canUseDeck(): boolean {
    if (typeof window === 'undefined' || window.innerWidth < gridSceneSettings.MOBILE_MIN_WIDTH_PX) {
      return false;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }

    if (GridSceneHelper._webgl2 === null) {
      try {
        GridSceneHelper._webgl2 = !!document.createElement('canvas').getContext('webgl2');
      } catch {
        GridSceneHelper._webgl2 = false;
      }
    }

    return GridSceneHelper._webgl2;
  }

  public static hexColor(hex: string, fallback: SceneColor): SceneColor {
    const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());

    if (!match) {
      return fallback;
    }

    const value = parseInt(match[1], 16);

    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }

  public static palette(host: HTMLElement): IScenePalette {
    const style = getComputedStyle(host);
    const read = (name: string, fallback: SceneColor): SceneColor => GridSceneHelper.hexColor(style.getPropertyValue(name), fallback);
    const base = fallbackScenePalette;

    return {
      ink: read('--dt-ink', base.ink),
      paper: read('--dt-paper', base.paper),
      panel: read('--dt-panel', base.panel),
      line: read('--dt-line', base.line),
      lineStrong: read('--dt-line-strong', base.lineStrong),
      muted: read('--dt-muted', base.muted),
      rush: read('--dt-rush', base.rush),
      clear: read('--dt-clear', base.clear)
    };
  }

  public static fuelColor(fuelKey: string): SceneColor {
    const fuel = mapFuels.find((candidate) => candidate.key === fuelKey) ?? mapFuels[mapFuels.length - 1];

    return GridSceneHelper.hexColor(fuel.color, fallbackScenePalette.muted);
  }

  public static relative(hourView: IPlantMapHourView, fuelKey: string): number {
    const opacity = hourView.opacityByFuel[fuelKey] ?? plantMapLayout.MIN_OPACITY;

    return Math.min(Math.max((opacity - plantMapLayout.MIN_OPACITY) / (1 - plantMapLayout.MIN_OPACITY), 0), 1);
  }

  public static siteLevel(hourView: IPlantMapHourView): number {
    const level = (hourView.siteStream.width - plantMapLayout.SITE_MIN_WIDTH) / plantMapLayout.SITE_WIDTH_RANGE;

    return Math.min(Math.max(level, 0), 1);
  }

  public static speed(relative: number): number {
    return gridSceneSettings.PARTICLE_CYCLES_PER_S * (gridSceneSettings.PARTICLE_MIN_SPEED + (1 - gridSceneSettings.PARTICLE_MIN_SPEED) * relative);
  }

  public static elevation(relative: number): number {
    return gridSceneSettings.MIN_ELEVATION_M + gridSceneSettings.ELEVATION_RANGE_M * relative;
  }

  public static alpha(opacity: number): number {
    return Math.round(Math.max(gridSceneSettings.MIN_ALPHA, opacity * 255));
  }

  public static stateFeatures(states: IStateOutline[]): object {
    return {
      type: 'FeatureCollection',
      features: states.map((state) => ({
        type: 'Feature',
        properties: { code: state.code },
        geometry: { type: 'Polygon', coordinates: state.rings }
      }))
    };
  }

  public static columnGroups(data: IPlantMapData): ISceneColumnGroup[] {
    const groups = new Map<string, ISceneColumnGroup>();
    const { RADIUS_CLASSES_M, RADIUS_CLASS_LIMITS_M, MIN_RADIUS_M, RADIUS_PER_ROOT_MW_M } = gridSceneSettings;

    for (const plant of data.geoPlants) {
      const raw = Math.max(MIN_RADIUS_M, Math.sqrt(plant.capacityMw) * RADIUS_PER_ROOT_MW_M);
      const bucket = RADIUS_CLASS_LIMITS_M.findIndex((limit) => raw < limit);
      const radiusClass = bucket === -1 ? RADIUS_CLASSES_M.length - 1 : bucket;
      const diskResolution = GridSceneHelper.resolution(plant.fuelKey);
      const id = `${diskResolution}-${radiusClass}`;
      const group = groups.get(id) ?? { id, diskResolution, radius: RADIUS_CLASSES_M[radiusClass], columns: [] };

      group.columns.push({ lon: plant.lon, lat: plant.lat, fuelKey: plant.fuelKey });
      groups.set(id, group);
    }

    return [...groups.values()];
  }

  public static resolution(fuelKey: string): number {
    if (fuelKey === 'COL') {
      return gridSceneSettings.COAL_RESOLUTION;
    }

    return fuelKey === 'NG' ? gridSceneSettings.GAS_RESOLUTION : gridSceneSettings.ROUND_RESOLUTION;
  }

  public static particles(data: IPlantMapData): ISceneParticle[] {
    const result: ISceneParticle[] = [];
    const node: IScenePoint = { lon: paceNode.lon, lat: paceNode.lat };
    const xScale = Math.cos((paceNode.lat * Math.PI) / 180);
    let index = 0;

    for (const plant of data.geoPlants) {
      const fuelIndex = Math.max(
        mapFuels.findIndex((fuel) => fuel.key === plant.fuelKey),
        0
      );
      const tap: IScenePoint = { lon: node.lon + (fuelIndex - (mapFuels.length - 1) / 2) * gridSceneSettings.TAP_SPACING_DEG, lat: node.lat };
      const count = plant.capacityMw > 200 ? 4 : plant.capacityMw > 50 ? 3 : plant.capacityMw > 8 ? 2 : 1;
      const color = GridSceneHelper.fuelColor(plant.fuelKey);

      for (let copy = 0; copy < count; copy += 1) {
        const from: IScenePoint = { lon: plant.lon, lat: plant.lat };

        result.push(
          GridSceneHelper.particle('plant', plant.fuelKey, from, tap, 1, xScale, GridSceneHelper.fraction(index), color)
        );
        index += 1;
      }
    }

    const site: IScenePoint = { lon: sitePin.lon, lat: sitePin.lat };

    for (let copy = 0; copy < 6; copy += 1) {
      result.push(GridSceneHelper.particle('site', 'SITE', node, site, -1, xScale, copy / 6, fallbackScenePalette.ink));
    }

    return result;
  }

  public static curvePoint(particle: ISceneParticle, t: number): [number, number, number] {
    const inverse = 1 - t;
    const lon = inverse * inverse * particle.from.lon + 2 * inverse * t * particle.control.lon + t * t * particle.to.lon;
    const lat = inverse * inverse * particle.from.lat + 2 * inverse * t * particle.control.lat + t * t * particle.to.lat;

    return [lon, lat, Math.sin(Math.PI * t) * particle.lift];
  }

  public static beam(particle: ISceneParticle, t: number, clock: number, relative: number, color: SceneColor, dots: ISceneDot[], cores: ISceneDot[]): void {
    const { TRAIL_SAMPLES, TRAIL_STEP, CORE_SAMPLES, PULSE_HZ, FLICKER_HZ } = gridSceneSettings;
    const pulse = 0.7 + 0.3 * Math.sin(2 * Math.PI * (PULSE_HZ * clock + particle.offset));
    const flicker = 0.85 + 0.15 * Math.sin(2 * Math.PI * (FLICKER_HZ * clock + particle.offset * 7));
    const energy = (0.35 + 0.65 * relative) * pulse * flicker;

    for (let index = 0; index < TRAIL_SAMPLES; index += 1) {
      const along = t - index * TRAIL_STEP;

      if (along <= 0) {
        break;
      }

      const taper = 1 - index / TRAIL_SAMPLES;
      const fade = Math.sqrt(Math.sin(Math.PI * along));
      const position = GridSceneHelper.curvePoint(particle, along);
      const alpha = 255 * energy * fade * Math.pow(taper, 2.2);

      dots.push({ position, color: [color[0], color[1], color[2], Math.round(alpha)], size: (1.3 + 2.4 * relative) * (0.4 + 0.6 * taper) });

      if (index < CORE_SAMPLES) {
        cores.push({ position, color: [255, 255, 255, Math.round(alpha * (1 - index / CORE_SAMPLES))], size: 0.9 + 1.1 * relative });
      }
    }
  }

  public static wires(particles: ISceneParticle[]): ISceneWire[] {
    const seen = new Set<string>();
    const wires: ISceneWire[] = [];

    for (const particle of particles) {
      const key = `${particle.from.lon},${particle.from.lat}>${particle.to.lon},${particle.to.lat}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);

      const color = particle.kind === 'site' ? fallbackScenePalette.ink : GridSceneHelper.fuelColor(particle.fuelKey);

      wires.push({
        path: [GridSceneHelper.curvePoint(particle, 0), GridSceneHelper.curvePoint(particle, 1)],
        color: [color[0], color[1], color[2], gridSceneSettings.WIRE_ALPHA]
      });
    }

    return wires;
  }

  public static labels(palette: IScenePalette): ISceneLabel[] {
    const ink: [number, number, number, number] = [...palette.ink, 255];
    const soft: [number, number, number, number] = [...palette.lineStrong, 255];

    const state = (label: (typeof stateLabels)[number]): ISceneLabel => ({
      text: label.label.toUpperCase(),
      lon: label.lon,
      lat: label.lat,
      size: 14,
      color: soft,
      offset: [0, 0],
      anchor: 'middle'
    });
    const city = (label: (typeof cityLabels)[number]): ISceneLabel => ({
      text: label.label,
      lon: label.lon,
      lat: label.lat,
      size: 11,
      color: ink,
      offset: [12, 6],
      anchor: 'start'
    });

    return [
      ...stateLabels.map(state),
      ...cityLabels.filter((label) => gridSceneSettings.LABELED_CITIES.includes(label.label)).map(city),
      { text: paceNode.label.toUpperCase(), lon: paceNode.lon, lat: paceNode.lat, size: 12, color: ink, offset: [0, -18], anchor: 'middle' },
      { text: sitePin.label, lon: sitePin.lon, lat: sitePin.lat, size: 12, color: ink, offset: [-12, 12], anchor: 'end' }
    ];
  }

  private static particle(
    kind: 'plant' | 'site',
    fuelKey: string,
    from: IScenePoint,
    to: IScenePoint,
    side: number,
    xScale: number,
    offset: number,
    color: SceneColor
  ): ISceneParticle {
    const dx = (to.lon - from.lon) * xScale;
    const dy = to.lat - from.lat;
    const bend = gridSceneSettings.CURVE_BEND * side;
    const distanceM = Math.hypot(dx, dy) * 111000;
    const lift = kind === 'site' ? gridSceneSettings.SITE_LIFT_M : Math.min(gridSceneSettings.PARTICLE_MAX_LIFT_M, distanceM * gridSceneSettings.PARTICLE_LIFT_FRACTION);

    return {
      kind,
      fuelKey,
      from,
      to,
      control: { lon: (from.lon + to.lon) / 2 - (dy * bend) / xScale, lat: (from.lat + to.lat) / 2 + dx * bend },
      lift,
      offset,
      position: [from.lon, from.lat, 0],
      color: [color[0], color[1], color[2], 200],
      size: 2
    };
  }

  private static fraction(index: number): number {
    return (index * 0.6180339887) % 1;
  }
}
