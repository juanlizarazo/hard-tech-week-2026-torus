import type { Firestore } from 'firebase-admin/firestore';

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

export interface IOpenMeteoResponse {
  latitude: number;
  longitude: number;
  hourly: {
    time: string[];
    [variableName: string]: string[] | number[];
  };
}

export interface IIngestResult {
  manifest: Detour.Firestore.Snapshot.IManifest;
  gridMonths: Detour.Firestore.Snapshot.IGridMonth[];
  priceMonths: Detour.Firestore.Snapshot.IPriceMonth[];
  weatherMonths: Detour.Firestore.Snapshot.IWeatherMonth[];
}

export interface IIngestLogger {
  info(message: string, ...details: unknown[]): void;
  warn(message: string, ...details: unknown[]): void;
}

export interface IIngestFetchOptions {
  apiKey: string | null;
  cacheDirectory: string | null;
  log: IIngestLogger;
}

export interface IOasisFetchResult {
  rows: IOasisCsvRow[];
  emptyChunkStarts: string[];
}

export interface IIngestDiagnostics {
  emptyOasisChunks: string[];
}

export interface IIngestBuild {
  result: IIngestResult;
  diagnostics: IIngestDiagnostics;
}

export interface IIngestValidation {
  isValid: boolean;
  isStale: boolean;
  reasons: string[];
}

export interface IRunIngestOptions {
  isDryRun: boolean;
  firestore: Firestore | null;
  apiKey: string;
  log: IIngestLogger;
  useCache: boolean;
  outputDirectory?: string;
  now?: Date;
}

export interface IRunIngestOutcome {
  status: Detour.Firestore.Snapshot.RunStatus | 'dry-run';
  snapshotId: string;
  targetDate: string;
  message: string;
  validation: IIngestValidation;
}
