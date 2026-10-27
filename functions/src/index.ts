import { setGlobalOptions } from 'firebase-functions/v2';

setGlobalOptions({ region: 'us-central1', maxInstances: 10, minInstances: 0 });

export { refreshSnapshot } from './ingest/refresh-snapshot.function';
