import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import { ingestConstants } from './ingest-snapshot.constants';
import { IngestRunService } from './ingest-run.service';

const eiaApiKey = defineSecret(ingestConstants.SECRET_NAME);

export const refreshSnapshot = onSchedule(
  {
    schedule: '0 15 * * *',
    timeZone: ingestConstants.TIMEZONE,
    retryCount: 3,
    minBackoffSeconds: 600,
    maxBackoffSeconds: 600,
    timeoutSeconds: 540,
    memory: '1GiB',
    secrets: [eiaApiKey],
  },
  async () => {
    if (getApps().length === 0) {
      initializeApp();
    }

    const outcome = await new IngestRunService().runIngest({
      isDryRun: false,
      firestore: getFirestore(),
      apiKey: eiaApiKey.value(),
      log: logger,
      useCache: false,
    });

    logger.info(`refreshSnapshot ${outcome.status}: ${outcome.message}`, { validation: outcome.validation });

    if (outcome.status === 'rejected') {
      throw new Error(outcome.message);
    }
  },
);
