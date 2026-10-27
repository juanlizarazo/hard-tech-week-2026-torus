import { execSync } from 'child_process';
import { resolve } from 'path';
import { Firestore } from '@google-cloud/firestore';
import { OAuth2Client } from 'google-auth-library';
import { ingestConstants } from '../ingest/ingest-snapshot.constants';

export class DevCredentialsService {
  public createFirestore(): Firestore {
    process.env['GOOGLE_CLOUD_QUOTA_PROJECT'] = ingestConstants.PROJECT_ID;

    const accessToken = execSync(`gcloud auth print-access-token --account ${ingestConstants.SECRET_ACCOUNT}`, {
      encoding: 'utf8',
    }).trim();
    const authClient = new OAuth2Client();
    authClient.setCredentials({ access_token: accessToken });

    return new Firestore({ projectId: ingestConstants.PROJECT_ID, authClient } as ConstructorParameters<typeof Firestore>[0]);
  }

  public getEiaApiKey(): string {
    const repositoryRoot = resolve(__dirname, '..', '..', '..');
    const baseCommand = `firebase functions:secrets:access ${ingestConstants.SECRET_NAME} --project ${ingestConstants.PROJECT_ID}`;
    const commands = [baseCommand, `${baseCommand} --account ${ingestConstants.SECRET_ACCOUNT}`];

    for (const command of commands) {
      try {
        const output = execSync(command, { cwd: repositoryRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();

        if (output) {
          return output;
        }
      } catch {
        continue;
      }
    }

    throw new Error('Could not read EIA_API_KEY from Firebase secrets');
  }
}
