export interface IEiaGeneratorRow {
  period: string;
  stateid: string;
  plantid: string;
  plantName: string;
  entityName: string;
  energy_source_code: string;
  balancing_authority_code: string;
  status: string;
  'nameplate-capacity-mw': string | null;
  'net-summer-capacity-mw': string | null;
  latitude: string | null;
  longitude: string | null;
}

export interface IPlantOutput {
  id: string;
  name: string;
  state: string;
  operator: string;
  fuelKey: string;
  capacityMw: number;
  lat: number;
  lon: number;
}

export interface IPlantsFile {
  pulledAt: string;
  period: string;
  balancingAuthority: string;
  sourceLabel: string;
  sourceUrl: string;
  apiRoute: string;
  capacityMeasure: string;
  fuelMapping: Record<string, string>;
  excluded: string[];
  totalsByFuelMw: Record<string, number>;
  plants: IPlantOutput[];
}

export interface IStateOutline {
  code: string;
  name: string;
  rings: number[][][];
}

export interface IStatesFile {
  pulledAt: string;
  sourceLabel: string;
  sourceUrl: string;
  simplifyToleranceDegrees: number;
  states: IStateOutline[];
}

export interface INaturalEarthFeature {
  properties: { iso_3166_2?: string; postal?: string; name?: string; iso_a2?: string };
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: number[][][] | number[][][][] };
}
