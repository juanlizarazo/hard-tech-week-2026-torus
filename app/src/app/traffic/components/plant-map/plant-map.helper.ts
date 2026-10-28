import { IRushHourWindow } from '@app/core/models';
import { TrafficHelper } from '../../traffic.helper';
import { cityLabels, mapFuels, paceNode, plantMapLayout, plantMapSettings, sitePin, stateLabels } from './plant-map.constants';
import {
  ICityMark,
  IFuelCapacity,
  INodeMark,
  IHourlyMix,
  IPacePlant,
  IPacePlantsFile,
  IPaceStatesFile,
  IPlantMapData,
  IPlantMapHourView,
  IPlantMark,
  IPoint,
  IRushTrack,
  IStatePath,
  IStreamGroup,
  IStreamStyle
} from './plant-map.interfaces';

export class PlantMapHelper {
  private static readonly _xScale = Math.cos(
    (((plantMapLayout.NORTH_LAT + plantMapLayout.SOUTH_LAT) / 2) * Math.PI) / 180
  );
  private static readonly _scale =
    (plantMapLayout.WIDTH - plantMapLayout.PADDING * 2) /
    ((plantMapLayout.EAST_LON - plantMapLayout.WEST_LON) * PlantMapHelper._xScale);

  public static height(): number {
    return Math.round((plantMapLayout.NORTH_LAT - plantMapLayout.SOUTH_LAT) * PlantMapHelper._scale + plantMapLayout.PADDING * 2);
  }

  public static project(lon: number, lat: number): IPoint {
    return {
      x: PlantMapHelper.round(plantMapLayout.PADDING + (lon - plantMapLayout.WEST_LON) * PlantMapHelper._xScale * PlantMapHelper._scale),
      y: PlantMapHelper.round(plantMapLayout.PADDING + (plantMapLayout.NORTH_LAT - lat) * PlantMapHelper._scale)
    };
  }

  public static isOnMap(lon: number, lat: number): boolean {
    return (
      lon >= plantMapLayout.WEST_LON &&
      lon <= plantMapLayout.EAST_LON &&
      lat >= plantMapLayout.SOUTH_LAT &&
      lat <= plantMapLayout.NORTH_LAT
    );
  }

  public static build(
    plantsFile: IPacePlantsFile,
    statesFile: IPaceStatesFile,
    history: Detour.Firestore.Snapshot.IGridHour[],
    weatherPoints: Detour.Firestore.Snapshot.IWeatherPoint[],
    rushTrack: IRushTrack
  ): IPlantMapData | null {
    const mix = PlantMapHelper.hourlyMix(history, plantMapSettings.HISTORY_DAYS);

    if (!mix) {
      return null;
    }

    const onMap = plantsFile.plants.filter((plant) => PlantMapHelper.isOnMap(plant.lon, plant.lat));
    const siteLocation = PlantMapHelper.project(sitePin.lon, sitePin.lat);
    const siteLabel = PlantMapHelper.project(sitePin.labelLon, sitePin.labelLat);
    const plantMarks = PlantMapHelper.plantMarks(onMap);
    const nodeMark = PlantMapHelper.nodeMark();

    return {
      height: PlantMapHelper.height(),
      statePaths: PlantMapHelper.statePaths(statesFile),
      stateLabelMarks: stateLabels.map((state) => ({ label: state.label, ...PlantMapHelper.project(state.lon, state.lat) })),
      plantMarks,
      cityMarks: PlantMapHelper.cityMarks(),
      weatherMarks: weatherPoints.map((point) => ({ id: point.id, label: point.label, ...PlantMapHelper.project(point.lon, point.lat) })),
      siteMark: { label: sitePin.label, note: sitePin.note, ...siteLocation, labelX: siteLabel.x, labelY: siteLabel.y },
      nodeMark,
      streamGroups: PlantMapHelper.streamGroups(plantMarks, nodeMark),
      siteStreamPath: PlantMapHelper.curve({ x: nodeMark.busX1, y: nodeMark.y }, siteLocation, -1),
      capacities: PlantMapHelper.capacities(plantsFile.plants),
      offMapPlants: plantsFile.plants
        .filter((plant) => !PlantMapHelper.isOnMap(plant.lon, plant.lat))
        .map((plant) => `${plant.name}, ${plant.state} (${PlantMapHelper.fuelLabel(plant.fuelKey).toLowerCase()}, ${Math.round(plant.capacityMw)} MW)`),
      mix,
      maxShare: Math.max(...mix.sharesByHour.flatMap((shares) => Object.values(shares)), 0.01),
      notice: PlantMapHelper.notice(mix, rushTrack),
      plantCount: new Set(plantsFile.plants.map((plant) => plant.id.split('-')[0])).size,
      period: plantsFile.period,
      pulledAt: plantsFile.pulledAt.slice(0, 10),
      sourceUrl: plantsFile.sourceUrl,
      excluded: plantsFile.excluded,
      statesSourceLabel: statesFile.sourceLabel,
      statesSourceUrl: statesFile.sourceUrl
    };
  }

  public static statePaths(statesFile: IPaceStatesFile): IStatePath[] {
    return statesFile.states
      .map((state) => ({
        code: state.code,
        isPace: plantMapSettings.PACE_STATE_CODES.includes(state.code),
        path: state.rings
          .map(
            (ring) =>
              ring
                .map(([lon, lat], index) => {
                  const point = PlantMapHelper.project(lon, lat);

                  return `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`;
                })
                .join('') + 'Z'
          )
          .join('')
      }))
      .sort((first, second) => Number(first.isPace) - Number(second.isPace));
  }

  public static plantMarks(plants: IPacePlant[]): IPlantMark[] {
    return [...plants]
      .sort((first, second) => second.capacityMw - first.capacityMw)
      .map((plant) => {
        const point = PlantMapHelper.project(plant.lon, plant.lat);

        return {
          id: plant.id,
          x: point.x,
          y: point.y,
          radius: PlantMapHelper.radius(plant.capacityMw),
          fuelKey: plant.fuelKey,
          color: PlantMapHelper.fuelColor(plant.fuelKey),
          title: `${plant.name}, ${plant.state}: ${PlantMapHelper.fuelLabel(plant.fuelKey).toLowerCase()}, ${Math.round(plant.capacityMw).toLocaleString()} MW`
        };
      });
  }

  public static nodeMark(): INodeMark {
    const point = PlantMapHelper.project(paceNode.lon, paceNode.lat);

    return {
      label: paceNode.label,
      note: paceNode.note,
      ...point,
      busX1: point.x - plantMapLayout.BUS_HALF_WIDTH,
      busX2: point.x + plantMapLayout.BUS_HALF_WIDTH
    };
  }

  public static streamGroups(plants: IPlantMark[], node: INodeMark): IStreamGroup[] {
    const firstTapX = node.x - ((mapFuels.length - 1) * plantMapLayout.BUS_TAP_SPACING) / 2;

    return mapFuels.map((fuel, fuelIndex) => {
      const tap = { x: PlantMapHelper.round(firstTapX + fuelIndex * plantMapLayout.BUS_TAP_SPACING), y: node.y };
      const path = plants
        .filter((plant) => plant.fuelKey === fuel.key)
        .map((plant) => PlantMapHelper.curve(plant, tap, 1))
        .join('');

      return { fuelKey: fuel.key, color: fuel.color, path };
    });
  }

  public static curve(from: IPoint, to: IPoint, side: number): string {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const bend = plantMapLayout.STREAM_BEND * side;
    const controlX = PlantMapHelper.round((from.x + to.x) / 2 - dy * bend);
    const controlY = PlantMapHelper.round((from.y + to.y) / 2 + dx * bend);

    return `M${from.x} ${from.y}Q${controlX} ${controlY} ${to.x} ${to.y}`;
  }

  public static streamStyle(relative: number, boost: number): IStreamStyle {
    const level = Math.min(Math.max(relative, 0), 1);
    const dash = PlantMapHelper.round(plantMapLayout.STREAM_MIN_DASH + plantMapLayout.STREAM_DASH_RANGE * level);

    return {
      width: PlantMapHelper.round((plantMapLayout.STREAM_MIN_WIDTH + plantMapLayout.STREAM_WIDTH_RANGE * level) * boost),
      dashArray: `${dash} ${PlantMapHelper.round(plantMapLayout.STREAM_PERIOD - dash)}`,
      opacity: PlantMapHelper.round(plantMapLayout.STREAM_MIN_OPACITY + plantMapLayout.STREAM_OPACITY_RANGE * level)
    };
  }

  public static siteStreamStyle(siteKwByHour: number[], hour: number): IStreamStyle {
    const peakKw = Math.max(...siteKwByHour, 1);
    const level = siteKwByHour.length > 0 ? (siteKwByHour[hour] ?? 0) / peakKw : 0.5;
    const dash = PlantMapHelper.round(3 + 4 * level);

    return {
      width: PlantMapHelper.round(plantMapLayout.SITE_MIN_WIDTH + plantMapLayout.SITE_WIDTH_RANGE * level),
      dashArray: `${dash} ${PlantMapHelper.round(plantMapLayout.STREAM_PERIOD - dash)}`,
      opacity: 1
    };
  }

  public static radius(capacityMw: number): number {
    return PlantMapHelper.round(Math.max(plantMapLayout.MIN_RADIUS, Math.sqrt(capacityMw) * plantMapLayout.RADIUS_PER_ROOT_MW));
  }

  public static cityMarks(): ICityMark[] {
    return cityLabels.map((city) => {
      const point = PlantMapHelper.project(city.lon, city.lat);
      const signWidth = Math.round(city.label.length * 6.4 + 14);
      const signX = city.dx < 0 ? point.x + city.dx - signWidth : point.x + city.dx;

      return {
        label: city.label,
        x: point.x,
        y: point.y,
        signX,
        signY: point.y + city.dy - 9,
        signWidth,
        leaderX: city.dx < 0 ? signX + signWidth : signX
      };
    });
  }

  public static capacities(plants: IPacePlant[]): IFuelCapacity[] {
    return mapFuels.map((fuel) => {
      const fuelPlants = plants.filter((plant) => plant.fuelKey === fuel.key);

      return {
        fuel,
        capacityMw: Math.round(fuelPlants.reduce((sum, plant) => sum + plant.capacityMw, 0)),
        plantCount: fuelPlants.length
      };
    });
  }

  public static hourlyMix(history: Detour.Firestore.Snapshot.IGridHour[], days: number): IHourlyMix | null {
    const totalsByDate = new Map<string, Detour.Firestore.Snapshot.IGridHour[]>();

    for (const hour of history) {
      const hasFuel = Object.values(hour.fuelMw ?? {}).some((value) => value !== null);

      if (!hasFuel) {
        continue;
      }

      const date = hour.localHourStart.slice(0, 10);
      totalsByDate.set(date, [...(totalsByDate.get(date) ?? []), hour]);
    }

    const dates = [...totalsByDate.keys()]
      .filter((date) => (totalsByDate.get(date) ?? []).length >= 20)
      .sort()
      .slice(-days);

    if (dates.length === 0) {
      return null;
    }

    const fuelSums = Array.from({ length: 24 }, () => new Map<string, number>());

    for (const date of dates) {
      for (const hour of totalsByDate.get(date) ?? []) {
        const localHour = Number(hour.localHourStart.slice(11, 13));

        for (const [fuelKey, value] of Object.entries(hour.fuelMw)) {
          const mapKey = mapFuels.some((fuel) => fuel.key === fuelKey) ? fuelKey : 'OTH';
          fuelSums[localHour].set(mapKey, (fuelSums[localHour].get(mapKey) ?? 0) + Math.max(value ?? 0, 0));
        }
      }
    }

    const sharesByHour = fuelSums.map((sums) => {
      const total = [...sums.values()].reduce((sum, value) => sum + value, 0);
      const shares: Record<string, number> = {};

      for (const fuel of mapFuels) {
        shares[fuel.key] = total > 0 ? (sums.get(fuel.key) ?? 0) / total : 0;
      }

      return shares;
    });

    return { sharesByHour, dayCount: dates.length, startDate: dates[0], endDate: dates[dates.length - 1] };
  }

  public static fossilShare(shares: Record<string, number>): number {
    return plantMapSettings.FOSSIL_FUEL_KEYS.reduce((sum, key) => sum + (shares[key] ?? 0), 0);
  }

  public static averageShares(mix: IHourlyMix, startHour: number, endHour: number): Record<string, number> {
    const hours = mix.sharesByHour.slice(startHour, Math.max(endHour, startHour + 1));
    const averages: Record<string, number> = {};

    for (const fuel of mapFuels) {
      averages[fuel.key] = hours.reduce((sum, shares) => sum + (shares[fuel.key] ?? 0), 0) / hours.length;
    }

    return averages;
  }

  public static notice(mix: IHourlyMix, rushTrack: IRushTrack): string {
    const rush = PlantMapHelper.averageShares(mix, rushTrack.startLocalHour, rushTrack.endLocalHour);
    const solarPeakHour = mix.sharesByHour.reduce(
      (best, shares, hour) => ((shares['SUN'] ?? 0) > (mix.sharesByHour[best]['SUN'] ?? 0) ? hour : best),
      12
    );
    const peak = mix.sharesByHour[solarPeakHour];
    const rushLabel = `${TrafficHelper.hourLabel(rushTrack.startLocalHour)}–${TrafficHelper.hourLabel(rushTrack.endLocalHour % 24)} rush`;
    const peakLabel = TrafficHelper.hourLabel(solarPeakHour);
    const solarAtPeak = PlantMapHelper.percent(peak['SUN']);
    const solarAtRush = PlantMapHelper.percent(rush['SUN']);
    const fossilAtRush = PlantMapHelper.percent(PlantMapHelper.fossilShare(rush));
    const fossilAtPeak = PlantMapHelper.percent(PlantMapHelper.fossilShare(peak));

    if (solarAtPeak - solarAtRush >= 5 && fossilAtRush > fossilAtPeak) {
      return `Solar makes ${solarAtPeak}% of PACE's power at ${peakLabel} but ${solarAtRush < 1 ? 'almost none' : `only ${solarAtRush}%`} across the ${rushLabel}, so coal and gas carry ${fossilAtRush}% of it, up from ${fossilAtPeak}%. When solar is gone, fossil plants answer the next kWh.`;
    }

    if (fossilAtRush > fossilAtPeak) {
      return `Coal and gas carry ${fossilAtRush}% of PACE's power across the ${rushLabel}, up from ${fossilAtPeak}% at ${peakLabel}, while solar stays small. Fossil plants carry more of the load in the rush.`;
    }

    if (fossilAtRush < fossilAtPeak) {
      return `Coal and gas carry ${fossilAtRush}% of PACE's power across the ${rushLabel}, down from ${fossilAtPeak}% at ${peakLabel}: wind and hydro cover more of the rush today, so the usual pattern does not hold.`;
    }

    return `Coal and gas carry ${fossilAtRush}% of PACE's power across the ${rushLabel} and ${fossilAtPeak}% at ${peakLabel}: over the last ${mix.dayCount} days the mix barely changes into the rush.`;
  }

  public static hourView(data: IPlantMapData, hour: number, rush: IRushTrack, siteKwByHour: number[] = []): IPlantMapHourView {
    const shares = data.mix.sharesByHour[hour];
    const rows = mapFuels
      .map((fuel) => ({
        fuel,
        sharePercent: PlantMapHelper.percent(shares[fuel.key]),
        opacity: PlantMapHelper.opacity(shares[fuel.key] ?? 0, data.maxShare)
      }))
      .sort((first, second) => second.sharePercent - first.sharePercent);
    const isRush = hour >= rush.startLocalHour && hour < rush.endLocalHour;
    const opacityByFuel: Record<string, number> = {};
    const streamByFuel: Record<string, IStreamStyle> = {};

    for (const row of rows) {
      const isFossil = plantMapSettings.FOSSIL_FUEL_KEYS.includes(row.fuel.key);
      opacityByFuel[row.fuel.key] = row.opacity;
      streamByFuel[row.fuel.key] = PlantMapHelper.streamStyle(
        (shares[row.fuel.key] ?? 0) / data.maxShare,
        isRush && isFossil ? plantMapLayout.RUSH_FOSSIL_BOOST : 1
      );
    }

    const hourLabel = TrafficHelper.hourLabel(hour);
    const fossilPercent = PlantMapHelper.percent(PlantMapHelper.fossilShare(shares));
    const leaders = rows
      .filter((row) => !plantMapSettings.FOSSIL_FUEL_KEYS.includes(row.fuel.key))
      .slice(0, 2)
      .map((row) => `${row.fuel.label.toLowerCase()} ${row.sharePercent}%`)
      .join(', ');

    return {
      hour,
      hourLabel,
      isRush,
      rows,
      opacityByFuel,
      streamByFuel,
      siteStream: PlantMapHelper.siteStreamStyle(siteKwByHour, hour),
      siteKw: siteKwByHour.length > 0 ? Math.round(siteKwByHour[hour] ?? 0) : null,
      fossilPercent,
      summary: `${hourLabel}: coal and gas ${fossilPercent}%, ${leaders}`
    };
  }

  public static rushTrack(rush: IRushHourWindow | null): IRushTrack {
    const startLocalHour = rush?.startLocalHour ?? plantMapSettings.FALLBACK_HOUR;
    const endLocalHour = rush?.endLocalHour ?? startLocalHour + 4;

    return {
      startLocalHour,
      endLocalHour,
      leftPercent: PlantMapHelper.round(((startLocalHour - 0.5) / 23) * 100),
      widthPercent: PlantMapHelper.round(((endLocalHour - startLocalHour) / 23) * 100),
      isAssumption: rush?.isAssumption ?? true
    };
  }

  public static tickLabel(hour: number): string {
    return hour === 12 ? 'noon' : TrafficHelper.hourLabel(hour);
  }

  public static tickPosition(hour: number): number {
    return PlantMapHelper.round((hour / 23) * 100);
  }

  public static opacity(share: number, maxShare: number): number {
    return PlantMapHelper.round(plantMapLayout.MIN_OPACITY + (1 - plantMapLayout.MIN_OPACITY) * Math.min(share / maxShare, 1));
  }

  public static fuelLabel(fuelKey: string): string {
    return mapFuels.find((fuel) => fuel.key === fuelKey)?.label ?? 'Other';
  }

  public static fuelColor(fuelKey: string): string {
    return mapFuels.find((fuel) => fuel.key === fuelKey)?.color ?? mapFuels[mapFuels.length - 1].color;
  }

  public static percent(share: number | undefined): number {
    return Math.round((share ?? 0) * 100);
  }

  public static round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
