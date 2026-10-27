export interface IIngestOptions {
  isDryRun: boolean;
  outputDirectory: string;
}

export interface IEiaRegionRow {
  period: string;
  type: string;
  value: string | number | null;
}

export interface IEiaFuelRow {
  period: string;
  fueltype: string;
  value: string | number | null;
}

export interface IEiaPage<TRow> {
  response: {
    total: string | number;
    data: TRow[];
  };
}

export interface IOasisCsvRow {
  [columnName: string]: string;
}

export interface IOasisChunk {
  startMs: number;
  endMs: number;
}

export interface ISeriesGapReport {
  gapCount: number;
  firstGapKey: string | null;
  lastGapKey: string | null;
  gapsByMonth: Record<string, number>;
}

export interface IPlausibilityResult {
  filteredRows: number;
}

export interface IIngestResult {
  manifest: Detour.Firestore.Snapshot.IManifest;
  gridMonths: Detour.Firestore.Snapshot.IGridMonth[];
  priceMonths: Detour.Firestore.Snapshot.IPriceMonth[];
}
