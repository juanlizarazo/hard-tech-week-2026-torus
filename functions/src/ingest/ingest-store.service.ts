import { mkdirSync, writeFileSync } from 'fs';
import { DocumentReference, FieldValue, Firestore, Timestamp } from 'firebase-admin/firestore';
import { IDerivedSignals } from '../../../app/src/app/core/models/derived.interfaces';
import { ingestConstants } from './ingest-snapshot.constants';
import { IngestSnapshotHelper } from './ingest-snapshot.helper';
import { IIngestResult } from './ingest-snapshot.interfaces';

export class IngestStoreService {
  private readonly _firestoreClient: Firestore | null;

  public constructor(firestore: Firestore | null) {
    this._firestoreClient = firestore;
  }

  private get _firestore(): Firestore {
    if (!this._firestoreClient) {
      throw new Error('IngestStoreService needs a Firestore client for this operation');
    }

    return this._firestoreClient;
  }

  public writeDryRun(result: IIngestResult, outputDirectory: string): Record<string, number> {
    const sizesByFile: Record<string, number> = {};

    mkdirSync(outputDirectory, { recursive: true });

    const writeJson = (fileName: string, payload: unknown): void => {
      const json = JSON.stringify(payload);
      writeFileSync(`${outputDirectory}/${fileName}`, json);
      sizesByFile[fileName] = Buffer.byteLength(json);
    };

    writeJson('manifest.json', result.manifest);
    result.gridMonths.forEach((month) => writeJson(`gridMonths-${month.month}.json`, month));
    result.priceMonths.forEach((month) => writeJson(`priceMonths-${month.month}.json`, month));
    result.weatherMonths.forEach((month) => writeJson(`weatherMonths-${month.month}.json`, month));

    return sizesByFile;
  }

  public async readPointer(): Promise<Detour.Firestore.Snapshot.IPointer | null> {
    const pointerSnapshot = await this._pointerReference().get();

    return pointerSnapshot.exists ? (pointerSnapshot.data() as Detour.Firestore.Snapshot.IPointer) : null;
  }

  public async readManifest(snapshotId: string): Promise<Detour.Firestore.Snapshot.IManifest | null> {
    const manifestSnapshot = await this._firestore.collection('snapshots').doc(snapshotId).get();

    return manifestSnapshot.exists ? (manifestSnapshot.data() as Detour.Firestore.Snapshot.IManifest) : null;
  }

  public async readCurrentManifest(): Promise<Detour.Firestore.Snapshot.IManifest | null> {
    const pointer = await this.readPointer();

    return pointer ? this.readManifest(pointer.currentSnapshotId) : null;
  }

  public async writeWeatherToSnapshot(
    snapshotId: string,
    weatherMonths: Detour.Firestore.Snapshot.IWeatherMonth[],
    manifestPatch: Partial<Detour.Firestore.Snapshot.IManifest>,
  ): Promise<void> {
    const snapshotReference = this._firestore.collection('snapshots').doc(snapshotId);

    for (const month of weatherMonths) {
      await snapshotReference.collection('weatherMonths').doc(month.month).set(month);
    }

    await snapshotReference.update(manifestPatch as { [fieldPath: string]: unknown });
  }

  public async writeSnapshot(result: IIngestResult): Promise<void> {
    const snapshotReference = this._firestore.collection('snapshots').doc(result.manifest.id);

    for (const month of result.gridMonths) {
      await snapshotReference.collection('gridMonths').doc(month.month).set(month);
    }

    for (const month of result.priceMonths) {
      await snapshotReference.collection('priceMonths').doc(month.month).set(month);
    }

    for (const month of result.weatherMonths) {
      await snapshotReference.collection('weatherMonths').doc(month.month).set(month);
    }

    await snapshotReference.set(result.manifest);
  }

  public async readMonths<T>(snapshotId: string, collectionName: 'gridMonths' | 'priceMonths' | 'weatherMonths'): Promise<T[]> {
    const monthsSnapshot = await this._firestore.collection('snapshots').doc(snapshotId).collection(collectionName).get();

    return monthsSnapshot.docs.map((document) => document.data() as T);
  }

  public async writeDerived(snapshotId: string, derived: IDerivedSignals): Promise<number> {
    const byteSize = Buffer.byteLength(JSON.stringify(derived));

    if (byteSize >= ingestConstants.DERIVED_MAX_BYTES) {
      throw new Error(`Derived signals are ${byteSize} bytes; the limit is ${ingestConstants.DERIVED_MAX_BYTES}`);
    }

    await this._firestore.collection('snapshots').doc(snapshotId).collection('derived').doc('signals').set(derived);
    console.log(`Derived signals for ${snapshotId} written: ${byteSize} bytes`);

    return byteSize;
  }

  public async flipPointer(snapshotId: string, lastRun: Detour.Firestore.Snapshot.ILastRun): Promise<void> {
    await this._firestore.runTransaction(async (transaction) => {
      const pointerSnapshot = await transaction.get(this._pointerReference());
      const pointer = pointerSnapshot.exists ? (pointerSnapshot.data() as Detour.Firestore.Snapshot.IPointer) : null;
      const lastGoodSnapshotIds = [snapshotId, ...IngestSnapshotHelper.resolveLastGoodIds(pointer)]
        .filter((id, index, ids) => ids.indexOf(id) === index)
        .slice(0, ingestConstants.LAST_GOOD_SNAPSHOT_LIMIT);

      transaction.set(
        this._pointerReference(),
        {
          currentSnapshotId: snapshotId,
          previousSnapshotId: pointer?.currentSnapshotId ?? null,
          updatedAt: Timestamp.now(),
          lastGoodSnapshotIds,
          lastRun,
        },
        { merge: true },
      );
    });
  }

  public async recordLastRun(lastRun: Detour.Firestore.Snapshot.ILastRun): Promise<void> {
    await this._pointerReference().set({ lastRun }, { merge: true });
  }

  public async pin(snapshotId: string): Promise<void> {
    const manifest = await this.readManifest(snapshotId);

    if (!manifest) {
      throw new Error(`Snapshot ${snapshotId} has no manifest; refusing to pin`);
    }

    await this._pointerReference().update({ pinnedSnapshotId: snapshotId });
  }

  public async unpin(): Promise<void> {
    await this._pointerReference().update({ pinnedSnapshotId: FieldValue.delete() });
  }

  public async rollback(): Promise<string> {
    const pointer = await this.readPointer();

    if (!pointer) {
      throw new Error('config/snapshot does not exist');
    }

    const lastGoodSnapshotIds = IngestSnapshotHelper.resolveLastGoodIds(pointer);
    const currentIndex = lastGoodSnapshotIds.indexOf(pointer.currentSnapshotId);
    const targetSnapshotId = lastGoodSnapshotIds[currentIndex + 1];

    if (!targetSnapshotId) {
      throw new Error(`No good snapshot older than ${pointer.currentSnapshotId} to roll back to`);
    }

    await this.setCurrent(targetSnapshotId, lastGoodSnapshotIds);

    return targetSnapshotId;
  }

  public async promote(snapshotId: string): Promise<void> {
    const pointer = await this.readPointer();
    const lastGoodSnapshotIds = [snapshotId, ...IngestSnapshotHelper.resolveLastGoodIds(pointer)]
      .filter((candidateId, index, candidateIds) => candidateIds.indexOf(candidateId) === index)
      .slice(0, ingestConstants.LAST_GOOD_SNAPSHOT_LIMIT);

    await this.setCurrent(snapshotId, lastGoodSnapshotIds);
  }

  public async setCurrent(snapshotId: string, lastGoodSnapshotIds: string[]): Promise<void> {
    const pointer = await this.readPointer();

    if (!(await this.readManifest(snapshotId))) {
      throw new Error(`Snapshot ${snapshotId} has no manifest; refusing to point at it`);
    }

    await this._pointerReference().set(
      {
        currentSnapshotId: snapshotId,
        previousSnapshotId: pointer?.currentSnapshotId ?? null,
        updatedAt: Timestamp.now(),
        lastGoodSnapshotIds,
      },
      { merge: true },
    );
  }

  private _pointerReference(): DocumentReference {
    return this._firestore.collection('config').doc('snapshot');
  }
}
