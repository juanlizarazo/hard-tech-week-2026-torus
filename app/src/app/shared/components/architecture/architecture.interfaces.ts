import { ArchitectureTone } from './architecture.types';

export interface IArchitectureItem {
  title: string;
  detail: string;
}

export interface IArchitectureStage {
  id: string;
  title: string;
  tone: ArchitectureTone;
  items: IArchitectureItem[];
}

export interface IArchitectureNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  details: string[];
  tone: ArchitectureTone;
}

export interface IArchitectureLabel {
  x: number;
  y: number;
  text: string;
}

export interface IArchitectureEdge {
  d: string;
  hasArrow: boolean;
}

export interface IArchitectureLayout {
  width: number;
  height: number;
  nodes: IArchitectureNode[];
  edges: IArchitectureEdge[];
  labels: IArchitectureLabel[];
}

export interface IArchitectureView {
  id: string;
  layout: IArchitectureLayout;
}
