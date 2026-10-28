import { DeriveSignalsService } from '../derive/derive-signals.service';
import { IngestStoreService } from '../ingest/ingest-store.service';
import { DevCredentialsService } from './dev-credentials.service';

const storeService = new IngestStoreService(new DevCredentialsService().createFirestore());

async function main(): Promise<void> {
  const [argument] = process.argv.slice(2);
  const pointer = await storeService.readPointer();
  const snapshotId = argument ?? pointer?.pinnedSnapshotId ?? pointer?.currentSnapshotId;

  if (!snapshotId) {
    throw new Error('Nothing to derive: pass a snapshotId or create config/snapshot');
  }

  const manifest = await storeService.readManifest(snapshotId);

  if (!manifest) {
    throw new Error(`Snapshot ${snapshotId} has no manifest`);
  }

  const gridMonths = await storeService.readMonths<Detour.Firestore.Snapshot.IGridMonth>(snapshotId, 'gridMonths');
  const weatherMonths = await storeService.readMonths<Detour.Firestore.Snapshot.IWeatherMonth>(snapshotId, 'weatherMonths');
  const derived = DeriveSignalsService.build(manifest, gridMonths, weatherMonths);
  const byteSize = await storeService.writeDerived(snapshotId, derived);

  console.log(`Derived ${snapshotId}: ${byteSize} bytes, targetHours ${derived.loadForecast?.targetHours.length ?? 0}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
