export interface IRunLogRow {
  time: string;
  step: string;
  source: string;
}

export interface IRunLogView {
  ranAt: string | null;
  ranLabel: string;
  rows: IRunLogRow[];
}
