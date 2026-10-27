import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { strFromU8, unzipSync } from 'fflate';
import { eiaRegionTypes, ingestConstants } from './ingest-snapshot.constants';
import { IngestSnapshotHelper } from './ingest-snapshot.helper';
import { IEiaFuelRow, IEiaPage, IEiaRegionRow, IOasisChunk, IOasisCsvRow } from './ingest-snapshot.interfaces';

export class IngestFetchService {
  private _apiKey: string | null = null;
  private _lastOasisRequestAt = 0;

  public constructor() {
    mkdirSync(ingestConstants.CACHE_DIRECTORY, { recursive: true });
  }

  public async fetchEiaRegionRows(now: Date): Promise<IEiaRegionRow[]> {
    const facets = Object.values(eiaRegionTypes);

    return this._fetchEiaDataset<IEiaRegionRow>(ingestConstants.EIA_REGION_URL, 'type', facets, now);
  }

  public async fetchEiaFuelRows(now: Date): Promise<IEiaFuelRow[]> {
    return this._fetchEiaDataset<IEiaFuelRow>(ingestConstants.EIA_FUEL_URL, null, [], now);
  }

  public async fetchOasisRows(
    queryName: string,
    extraParameters: Record<string, string>,
    chunks: IOasisChunk[],
  ): Promise<IOasisCsvRow[]> {
    const rows: IOasisCsvRow[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const isLastChunk = i === chunks.length - 1;
      const chunkRows = await this._fetchOasisChunk(queryName, extraParameters, chunks[i], isLastChunk);
      rows.push(...chunkRows);
    }

    return rows;
  }

  private async _fetchEiaDataset<TRow>(
    baseUrl: string,
    facetName: string | null,
    facetValues: string[],
    now: Date,
  ): Promise<TRow[]> {
    const rows: TRow[] = [];
    const start = IngestSnapshotHelper.formatEiaStart(now);
    let offset = 0;
    let total = Number.POSITIVE_INFINITY;

    while (offset < total) {
      const parameters = new URLSearchParams();
      parameters.append('frequency', 'hourly');
      parameters.append('data[0]', 'value');
      parameters.append('facets[respondent][]', ingestConstants.RESPONDENT);

      if (facetName) {
        facetValues.forEach((facetValue) => parameters.append(`facets[${facetName}][]`, facetValue));
      }

      parameters.append('sort[0][column]', 'period');
      parameters.append('sort[0][direction]', 'asc');
      parameters.append('start', start);
      parameters.append('offset', String(offset));
      parameters.append('length', String(ingestConstants.EIA_PAGE_LENGTH));

      const cacheKey = `eia-${baseUrl}?${parameters.toString()}`;
      parameters.append('api_key', this._getApiKey());

      const cachedText = this._readCache(cacheKey, 'json');
      const pageText = cachedText ?? (await this._fetchEiaText(`${baseUrl}?${parameters.toString()}`));

      if (cachedText === null) {
        this._writeCache(cacheKey, 'json', pageText);
      }

      const page = JSON.parse(pageText) as IEiaPage<TRow>;
      total = Number(page.response.total);
      rows.push(...page.response.data);
      offset += ingestConstants.EIA_PAGE_LENGTH;

      if (page.response.data.length < ingestConstants.EIA_PAGE_LENGTH) {
        break;
      }
    }

    console.log(`EIA ${baseUrl.split('/').slice(-4, -2).join('/')}: ${rows.length} rows`);

    return rows;
  }

  private async _fetchEiaText(url: string): Promise<string> {
    for (let attempt = 1; attempt <= ingestConstants.EIA_MAX_ATTEMPTS; attempt++) {
      await this._sleep(ingestConstants.EIA_DELAY_MS * attempt);

      const response = await fetch(url);

      if (response.ok) {
        return response.text();
      }

      console.warn(`EIA request failed with HTTP ${response.status} (attempt ${attempt})`);
    }

    throw new Error('EIA request failed after retries');
  }

  private async _fetchOasisChunk(
    queryName: string,
    extraParameters: Record<string, string>,
    chunk: IOasisChunk,
    isLastChunk: boolean,
  ): Promise<IOasisCsvRow[]> {
    const parameters = new URLSearchParams({
      queryname: queryName,
      market_run_id: 'DAM',
      ...extraParameters,
      startdatetime: IngestSnapshotHelper.formatOasisTimestamp(chunk.startMs),
      enddatetime: IngestSnapshotHelper.formatOasisTimestamp(chunk.endMs),
      version: '1',
      resultformat: '6',
    });
    const url = `${ingestConstants.OASIS_URL}?${decodeURIComponent(parameters.toString())}`;
    const cachedBytes = this._readCacheBytes(url);

    if (cachedBytes) {
      return this._unzipCsv(cachedBytes) ?? [];
    }

    for (let attempt = 1; attempt <= ingestConstants.OASIS_MAX_ATTEMPTS; attempt++) {
      await this._waitForOasisSlot(attempt > 1);

      const response = await fetch(url);
      const bytes = new Uint8Array(await response.arrayBuffer());
      const rows = response.ok ? this._unzipCsv(bytes) : null;

      if (rows && rows.length > 0) {
        this._writeCache(url, 'zip', bytes);
        console.log(`OASIS ${queryName} ${new Date(chunk.startMs).toISOString().slice(0, 10)}: ${rows.length} rows`);

        return rows;
      }

      console.warn(`OASIS ${queryName} returned HTTP ${response.status} / no rows (attempt ${attempt})`);
    }

    if (isLastChunk) {
      console.warn(`OASIS ${queryName}: no data for final chunk, continuing`);

      return [];
    }

    throw new Error(`OASIS ${queryName} failed for chunk ${new Date(chunk.startMs).toISOString()}`);
  }

  private _unzipCsv(bytes: Uint8Array): IOasisCsvRow[] | null {
    try {
      const entries = unzipSync(bytes);
      const csvName = Object.keys(entries).find((name) => name.toLowerCase().endsWith('.csv'));

      return csvName ? IngestSnapshotHelper.parseCsv(strFromU8(entries[csvName])) : null;
    } catch {
      return null;
    }
  }

  private async _waitForOasisSlot(isRetry: boolean): Promise<void> {
    const requiredGap = isRetry ? ingestConstants.OASIS_RETRY_DELAY_MS : ingestConstants.OASIS_DELAY_MS;
    const remaining = this._lastOasisRequestAt + requiredGap - Date.now();

    if (remaining > 0) {
      await this._sleep(remaining);
    }

    this._lastOasisRequestAt = Date.now();
  }

  private _sleep(milliseconds: number): Promise<void> {
    return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
  }

  private _cachePath(cacheKey: string, extension: string): string {
    const digest = createHash('sha1').update(cacheKey).digest('hex');

    return `${ingestConstants.CACHE_DIRECTORY}/${digest}.${extension}`;
  }

  private _readCache(cacheKey: string, extension: string): string | null {
    const path = this._cachePath(cacheKey, extension);

    return existsSync(path) ? readFileSync(path, 'utf8') : null;
  }

  private _readCacheBytes(cacheKey: string): Uint8Array | null {
    const path = this._cachePath(cacheKey, 'zip');

    return existsSync(path) ? new Uint8Array(readFileSync(path)) : null;
  }

  private _writeCache(cacheKey: string, extension: string, content: string | Uint8Array): void {
    writeFileSync(this._cachePath(cacheKey, extension), content);
  }

  private _getApiKey(): string {
    if (this._apiKey) {
      return this._apiKey;
    }

    const repositoryRoot = resolve(__dirname, '..', '..', '..');
    const baseCommand = `firebase functions:secrets:access ${ingestConstants.SECRET_NAME} --project ${ingestConstants.PROJECT_ID}`;
    const commands = [baseCommand, `${baseCommand} --account ${ingestConstants.SECRET_ACCOUNT}`];

    for (const command of commands) {
      try {
        const output = execSync(command, { cwd: repositoryRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();

        if (output) {
          this._apiKey = output;

          return output;
        }
      } catch {
        continue;
      }
    }

    throw new Error('Could not read EIA_API_KEY from Firebase secrets');
  }
}
