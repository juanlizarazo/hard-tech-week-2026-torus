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

    return sizesByFile;
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
