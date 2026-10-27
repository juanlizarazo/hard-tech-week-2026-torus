import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import * as logger from 'firebase-functions/logger';

setGlobalOptions({ region: 'us-central1', maxInstances: 10, minInstances: 0 });

export const hello = onRequest({ cors: true }, async (request, response) => {
  try {
    logger.info('hello called');
    response.json({ message: 'DETOUR is alive' });
  } catch (error) {
    logger.error('hello error', { error: (error as Error).message });
    response.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});
