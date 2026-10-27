import { energySourceFuelKeys, excludedEnergySources } from './ingest-plants.constants';
import { IEiaGeneratorRow, INaturalEarthFeature, IPlantOutput, IStateOutline } from './ingest-plants.interfaces';

export class IngestPlantsHelper {
  public static fuelKey(energySourceCode: string): string | null {
    if (excludedEnergySources.includes(energySourceCode)) {
      return null;
    }

    return energySourceFuelKeys[energySourceCode] ?? 'OTH';
  }

  public static aggregate(rows: IEiaGeneratorRow[]): IPlantOutput[] {
    const plants = new Map<string, IPlantOutput>();

    for (const row of rows) {
      const fuelKey = IngestPlantsHelper.fuelKey(row.energy_source_code);
      const capacityMw = Number(row['nameplate-capacity-mw'] ?? 0);
      const lat = Number(row.latitude);
      const lon = Number(row.longitude);

      if (!fuelKey || !Number.isFinite(capacityMw) || capacityMw <= 0 || !Number.isFinite(lat) || !Number.isFinite(lon) || lat === 0) {
        continue;
      }

      const key = `${row.plantid}-${fuelKey}`;
      const existing = plants.get(key);

      if (existing) {
        existing.capacityMw += capacityMw;
        continue;
      }

      plants.set(key, {
        id: key,
        name: row.plantName,
        state: row.stateid,
        operator: row.entityName,
        fuelKey,
        capacityMw,
        lat: IngestPlantsHelper.round(lat, 4),
        lon: IngestPlantsHelper.round(lon, 4),
      });
    }

    return [...plants.values()]
      .map((plant) => ({ ...plant, capacityMw: IngestPlantsHelper.round(plant.capacityMw, 1) }))
      .sort((first, second) => second.capacityMw - first.capacityMw);
  }

  public static totalsByFuel(plants: IPlantOutput[]): Record<string, number> {
    const totals: Record<string, number> = {};

    for (const plant of plants) {
      totals[plant.fuelKey] = IngestPlantsHelper.round((totals[plant.fuelKey] ?? 0) + plant.capacityMw, 1);
    }

    return totals;
  }

  public static stateOutline(feature: INaturalEarthFeature, code: string, tolerance: number, decimals: number): IStateOutline {
    const polygons =
      feature.geometry.type === 'Polygon'
        ? [feature.geometry.coordinates as number[][][]]
        : (feature.geometry.coordinates as number[][][][]);
    const rings = polygons
      .map((polygon) => polygon[0])
      .map((ring) => IngestPlantsHelper.simplify(ring, tolerance).map(([lon, lat]) => [IngestPlantsHelper.round(lon, decimals), IngestPlantsHelper.round(lat, decimals)]))
      .filter((ring) => ring.length >= 4);

    return { code, name: feature.properties.name ?? code, rings };
  }

  public static simplify(points: number[][], tolerance: number): number[][] {
    if (points.length <= 3) {
      return points;
    }

    const keep = new Array<boolean>(points.length).fill(false);
    keep[0] = true;
    keep[points.length - 1] = true;
    const stack: [number, number][] = [[0, points.length - 1]];

    while (stack.length > 0) {
      const [startIndex, endIndex] = stack.pop() as [number, number];
      let maxDistance = 0;
      let maxIndex = -1;

      for (let i = startIndex + 1; i < endIndex; i++) {
        const distance = IngestPlantsHelper.perpendicularDistance(points[i], points[startIndex], points[endIndex]);

        if (distance > maxDistance) {
          maxDistance = distance;
          maxIndex = i;
        }
      }

      if (maxIndex !== -1 && maxDistance > tolerance) {
        keep[maxIndex] = true;
        stack.push([startIndex, maxIndex], [maxIndex, endIndex]);
      }
    }

    return points.filter((_point, index) => keep[index]);
  }

  public static round(value: number, decimals: number): number {
    const factor = 10 ** decimals;

    return Math.round(value * factor) / factor;
  }

  private static perpendicularDistance(point: number[], lineStart: number[], lineEnd: number[]): number {
    const deltaX = lineEnd[0] - lineStart[0];
    const deltaY = lineEnd[1] - lineStart[1];
    const length = Math.hypot(deltaX, deltaY);

    if (length === 0) {
      return Math.hypot(point[0] - lineStart[0], point[1] - lineStart[1]);
    }

    return Math.abs(deltaY * point[0] - deltaX * point[1] + lineEnd[0] * lineStart[1] - lineEnd[1] * lineStart[0]) / length;
  }
}
