import { ingestConstants } from './ingest-snapshot.constants';
import { IngestSnapshotHelper } from './ingest-snapshot.helper';
import { IIngestDiagnostics, IIngestResult, IIngestValidation } from './ingest-snapshot.interfaces';

type Manifest = Detour.Firestore.Snapshot.IManifest;

export class IngestValidationHelper {
  public static validate(
    result: IIngestResult,
    diagnostics: IIngestDiagnostics,
    currentManifest: Manifest | null,
  ): IIngestValidation {
    const reasons: string[] = [];
    const { manifest } = result;
    const isStale = currentManifest !== null && manifest.targetDate <= currentManifest.targetDate;

    if (isStale) {
      reasons.push(
        `Target date ${manifest.targetDate} is not later than the current snapshot's ${currentManifest.targetDate}; OASIS has likely not posted the next day yet`,
      );
    }

    reasons.push(...IngestValidationHelper._checkTargetDayHours(result));

    if (diagnostics.emptyOasisChunks.length > 0) {
      reasons.push(`OASIS returned empty chunks: ${diagnostics.emptyOasisChunks.join(', ')}`);
    }

    reasons.push(...IngestValidationHelper._checkDocumentSizes(result));

    if (currentManifest) {
      const currentRows = IngestValidationHelper._sumRows(currentManifest.gridMonths);
      const newRows = IngestValidationHelper._sumRows(manifest.gridMonths);

      if (newRows < currentRows * ingestConstants.MIN_GRID_ROW_RATIO) {
        reasons.push(`Grid rows dropped to ${newRows} from ${currentRows} (below ${ingestConstants.MIN_GRID_ROW_RATIO * 100}%)`);
      }
    }

    return { isValid: reasons.length === 0, isStale, reasons };
  }

  private static _checkTargetDayHours(result: IIngestResult): string[] {
    const targetDate = result.manifest.targetDate;
    const expectedHours = IngestSnapshotHelper.hoursInLocalDay(targetDate);
    const forecastHours = result.gridMonths
      .flatMap((month) => month.hours)
      .filter((hour) => hour.localHourStart.startsWith(targetDate) && hour.dayAheadForecastMw !== null).length;
    const priceHours = result.priceMonths
      .flatMap((month) => month.hours)
      .filter((hour) => hour.localStart.startsWith(targetDate) && hour.lmp !== null).length;
    const reasons: string[] = [];

    if (forecastHours < expectedHours) {
      reasons.push(`Target day ${targetDate} has ${forecastHours}/${expectedHours} forecast hours`);
    }

    if (priceHours < expectedHours) {
      reasons.push(`Target day ${targetDate} has ${priceHours}/${expectedHours} price hours`);
    }

    return reasons;
  }

  private static _checkDocumentSizes(result: IIngestResult): string[] {
    const documents: { label: string; payload: unknown }[] = [
      { label: 'manifest', payload: result.manifest },
      ...result.gridMonths.map((month) => ({ label: `gridMonths/${month.month}`, payload: month })),
      ...result.priceMonths.map((month) => ({ label: `priceMonths/${month.month}`, payload: month })),
      ...result.weatherMonths.map((month) => ({ label: `weatherMonths/${month.month}`, payload: month })),
    ];

    return documents
      .map((document) => ({ label: document.label, bytes: Buffer.byteLength(JSON.stringify(document.payload)) }))
      .filter((document) => document.bytes >= ingestConstants.FIRESTORE_DOCUMENT_LIMIT_BYTES)
      .map((document) => `${document.label} is ${document.bytes} bytes, over the 1 MiB Firestore limit`);
  }

  private static _sumRows(months: Detour.Firestore.Snapshot.IMonthEntry[]): number {
    return months.reduce((total, month) => total + month.rowCount, 0);
  }
}
