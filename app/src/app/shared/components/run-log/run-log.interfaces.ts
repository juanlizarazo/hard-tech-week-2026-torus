export interface IRunLogRow {
  time: string;
  step: string;
  source: string;
}

export interface IRunLogView {
  ranAt: string | null;
  rows: IRunLogRow[];
}
