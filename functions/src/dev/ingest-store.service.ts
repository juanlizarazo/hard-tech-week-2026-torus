import { mkdirSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { Firestore, Timestamp } from '@google-cloud/firestore';
import { OAuth2Client } from 'google-auth-library';
import { ingestConstants } from './ingest-snapshot.constants';
import { IIngestResult } from './ingest-snapshot.interfaces';

export class IngestStoreService {
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

  public async readCurrentManifest(): Promise<Detour.Firestore.Snapshot.IManifest | null> {
    const firestore = this._createFirestore();
    const pointerSnapshot = await firestore.collection('config').doc('snapshot').get();

    if (!pointerSnapshot.exists) {
      return null;
    }

    const pointer = pointerSnapshot.data() as Detour.Firestore.Snapshot.IPointer;
    const manifestSnapshot = await firestore.collection('snapshots').doc(pointer.currentSnapshotId).get();

    return manifestSnapshot.exists ? (manifestSnapshot.data() as Detour.Firestore.Snapshot.IManifest) : null;
  }

  public async writeWeatherToSnapshot(
    snapshotId: string,
    weatherMonths: Detour.Firestore.Snapshot.IWeatherMonth[],
    manifestPatch: Partial<Detour.Firestore.Snapshot.IManifest>,
  ): Promise<void> {
    const firestore = this._createFirestore();
    const snapshotReference = firestore.collection('snapshots').doc(snapshotId);

    for (const month of weatherMonths) {
      await snapshotReference.collection('weatherMonths').doc(month.month).set(month);
    }

    await snapshotReference.update(manifestPatch as { [fieldPath: string]: unknown });
  }

  public async writeToFirestore(result: IIngestResult): Promise<void> {
    const firestore = this._createFirestore();
    const snapshotReference = firestore.collection('snapshots').doc(result.manifest.id);
    const pointerReference = firestore.collection('config').doc('snapshot');
    const previousPointer = await pointerReference.get();
    const previousSnapshotId = previousPointer.exists
      ? ((previousPointer.data() as Detour.Firestore.Snapshot.IPointer).currentSnapshotId ?? null)
      : null;

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

    const pointer: Detour.Firestore.Snapshot.IPointer = {
      currentSnapshotId: result.manifest.id,
      previousSnapshotId,
      updatedAt: Timestamp.now(),
    };

    await pointerReference.set(pointer);
  }

  private _createFirestore(): Firestore {
    const accessToken = execSync(
      `gcloud auth print-access-token --account ${ingestConstants.SECRET_ACCOUNT}`,
      { encoding: 'utf8' }
    ).trim();
    const authClient = new OAuth2Client();
    authClient.setCredentials({ access_token: accessToken });

    return new Firestore({ projectId: ingestConstants.PROJECT_ID, authClient } as ConstructorParameters<typeof Firestore>[0]);
  }
}
