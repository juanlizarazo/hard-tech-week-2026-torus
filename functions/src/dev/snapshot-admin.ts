import { IngestStoreService } from '../ingest/ingest-store.service';
import { IngestSnapshotHelper } from '../ingest/ingest-snapshot.helper';
import { DevCredentialsService } from './dev-credentials.service';

const storeService = new IngestStoreService(new DevCredentialsService().createFirestore());

async function printStatus(): Promise<void> {
  const pointer = await storeService.readPointer();

  if (!pointer) {
    console.log('config/snapshot does not exist');

    return;
  }

  const servedSnapshotId = pointer.pinnedSnapshotId ?? pointer.currentSnapshotId;
  const servedManifest = await storeService.readManifest(servedSnapshotId);
  const lastRun = pointer.lastRun;

  console.log(`current:   ${pointer.currentSnapshotId}`);
  console.log(`previous:  ${pointer.previousSnapshotId ?? '-'}`);
  console.log(`pinned:    ${pointer.pinnedSnapshotId ?? '-'}`);
  console.log(`served:    ${servedSnapshotId} (target ${servedManifest?.targetDate ?? 'manifest missing'})`);
  console.log(`updatedAt: ${pointer.updatedAt.toDate().toISOString()}`);
  console.log(`lastGood:  ${IngestSnapshotHelper.resolveLastGoodIds(pointer).join(', ') || '-'}`);
  console.log(
    lastRun
      ? `lastRun:   ${lastRun.status} at ${lastRun.at.toDate().toISOString()} ${lastRun.snapshotId ?? ''} ${lastRun.targetDate ?? ''}\n           ${lastRun.message}`
      : 'lastRun:   -',
  );
}

async function pin(snapshotId: string | undefined): Promise<void> {
  const pointer = await storeService.readPointer();
  const targetSnapshotId = snapshotId ?? pointer?.currentSnapshotId;

  if (!targetSnapshotId) {
    throw new Error('Nothing to pin: config/snapshot does not exist');
  }

  await storeService.pin(targetSnapshotId);
  console.log(`Pinned ${targetSnapshotId}`);
}

async function main(): Promise<void> {
  const [command, argument] = process.argv.slice(2);

  if (command === 'pin') {
    await pin(argument);
  } else if (command === 'unpin') {
    await storeService.unpin();
    console.log('Unpinned');
  } else if (command === 'rollback') {
    console.log(`Rolled back to ${await storeService.rollback()}`);
  } else if (command !== 'status') {
    throw new Error(`Unknown command ${command}; use status, pin [id], unpin or rollback`);
  }

  await printStatus();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
