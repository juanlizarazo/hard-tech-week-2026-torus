export interface INavLink {
  path: string;
  label: string;
  shortLabel: string;
  step: string;
  kind: 'start' | 'step' | 'record';
  description: string;
  dayNoun?: string;
}
