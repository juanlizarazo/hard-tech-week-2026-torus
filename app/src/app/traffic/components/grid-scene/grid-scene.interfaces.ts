export type SceneColor = [number, number, number];

export interface IScenePalette {
  ink: SceneColor;
  paper: SceneColor;
  panel: SceneColor;
  line: SceneColor;
  lineStrong: SceneColor;
  muted: SceneColor;
  rush: SceneColor;
  clear: SceneColor;
}

export interface ISceneColumn {
  lon: number;
  lat: number;
  fuelKey: string;
}

export interface ISceneColumnGroup {
  id: string;
  diskResolution: number;
  radius: number;
  columns: ISceneColumn[];
}

export interface IScenePoint {
  lon: number;
  lat: number;
}

export interface ISceneParticle {
  kind: 'plant' | 'site';
  fuelKey: string;
  from: IScenePoint;
  control: IScenePoint;
  to: IScenePoint;
  lift: number;
  offset: number;
  position: [number, number, number];
  color: [number, number, number, number];
  size: number;
}

export interface ISceneDot {
  position: [number, number, number];
  color: [number, number, number, number];
  size: number;
}

export interface ISceneLabel {
  text: string;
  lon: number;
  lat: number;
  size: number;
  color: [number, number, number, number];
  offset: [number, number];
  anchor: 'start' | 'middle' | 'end';
}

export interface ISceneViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}
