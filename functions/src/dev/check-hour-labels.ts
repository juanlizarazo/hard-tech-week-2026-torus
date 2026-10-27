import { strict as assert } from 'assert';
import { IngestSnapshotHelper } from '../ingest/ingest-snapshot.helper';

assert.equal(IngestSnapshotHelper.createEmptyGridHour('2026-07-01T19').localHourStart, '2026-07-01T12:00-06:00');
assert.equal(IngestSnapshotHelper.createEmptyGridHour('2026-01-15T07').localHourStart, '2026-01-14T23:00-07:00');
assert.equal(IngestSnapshotHelper.hourStartKeyToHourEndingKey('2026-10-28T05'), '2026-10-28T06');

const forecastByKey = IngestSnapshotHelper.buildForecastByKey([{ INTERVALSTARTTIME_GMT: '2026-07-01T18:00:00-00:00', MW: '7000' }]);
assert.deepEqual([...forecastByKey.keys()], ['2026-07-01T19']);

console.log('Hour labels OK: EIA hour-ending 19Z is the 12:00 MDT hour, OASIS start 18Z joins it');
