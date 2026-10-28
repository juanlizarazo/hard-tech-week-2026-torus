import { PlantMapStatus } from './plant-map.types';

export interface IPacePlant {
  id: string;
  name: string;
  state: string;
  operator: string;
  fuelKey: string;
  capacityMw: number;
  lat: number;
  lon: number;
}

export interface IPacePlantsFile {
  pulledAt: string;
  period: string;
  balancingAuthority: string;
  sourceLabel: string;
  sourceUrl: string;
  excluded: string[];
  totalsByFuelMw: Record<string, number>;
  plants: IPacePlant[];
}

export interface IStateOutline {
  code: string;
  name: string;
  rings: number[][][];
}

export interface IPaceStatesFile {
  sourceLabel: string;
  sourceUrl: string;
  states: IStateOutline[];
}

export interface IMapFuel {
  key: string;
  label: string;
  color: string;
}

export interface ICityLabel {
  label: string;
  lon: number;
  lat: number;
  dx: number;
  dy: number;
}

export interface IStateLabel {
  code: string;
  label: string;
  lon: number;
  lat: number;
}

export interface ISitePin {
  label: string;
  note: string;
  lon: number;
  lat: number;
  labelLon: number;
  labelLat: number;
}

export interface IPaceNode {
  label: string;
  note: string;
  lon: number;
  lat: number;
}

export interface INodeMark {
  label: string;
  note: string;
  x: number;
  y: number;
  busX1: number;
  busX2: number;
}

export interface IStreamGroup {
  fuelKey: string;
  color: string;
  path: string;
}

export interface IStreamStyle {
  width: number;
  dashArray: string;
  opacity: number;
}

export interface IPoint {
  x: number;
  y: number;
}

export interface IStatePath {
  code: string;
  path: string;
  isPace: boolean;
}

export interface IStateLabelMark {
  label: string;
  x: number;
  y: number;
}

export interface IPlantMark {
  id: string;
  x: number;
  y: number;
  radius: number;
  fuelKey: string;
  color: string;
  title: string;
}

export interface ICityMark {
  label: string;
  x: number;
  y: number;
  signX: number;
  signY: number;
  signWidth: number;
  leaderX: number;
}

export interface IWeatherMark {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface ISiteMark {
  label: string;
  note: string;
  x: number;
  y: number;
  labelX: number;
  labelY: number;
}

export interface IFuelCapacity {
  fuel: IMapFuel;
  capacityMw: number;
  plantCount: number;
}

export interface IHourlyMix {
  sharesByHour: Record<string, number>[];
  dayCount: number;
  startDate: string;
  endDate: string;
}

export interface IPlantMapData {
  height: number;
  statePaths: IStatePath[];
  stateLabelMarks: IStateLabelMark[];
  plantMarks: IPlantMark[];
  cityMarks: ICityMark[];
  weatherMarks: IWeatherMark[];
  siteMark: ISiteMark;
  nodeMark: INodeMark;
  streamGroups: IStreamGroup[];
  siteStreamPath: string;
  capacities: IFuelCapacity[];
  offMapPlants: string[];
  mix: IHourlyMix;
  maxShare: number;
  notice: string;
  plantCount: number;
  period: string;
  pulledAt: string;
  sourceUrl: string;
  excluded: string[];
  statesSourceLabel: string;
  statesSourceUrl: string;
}

export interface IFuelShareRow {
  fuel: IMapFuel;
  sharePercent: number;
  opacity: number;
}

export interface IPlantMapHourView {
  hour: number;
  hourLabel: string;
  isRush: boolean;
  rows: IFuelShareRow[];
  opacityByFuel: Record<string, number>;
  streamByFuel: Record<string, IStreamStyle>;
  siteStream: IStreamStyle;
  siteKw: number | null;
  fossilPercent: number;
  summary: string;
}

export interface IPlantMapState {
  status: PlantMapStatus;
  data: IPlantMapData | null;
  errorMessage: string;
}

export interface IRushTrack {
  startLocalHour: number;
  endLocalHour: number;
  leftPercent: number;
  widthPercent: number;
  isAssumption: boolean;
}
