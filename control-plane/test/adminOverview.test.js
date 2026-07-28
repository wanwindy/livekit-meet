import assert from 'node:assert/strict';
import test from 'node:test';
import {normalizeOverviewDays} from '../src/routes/admin.js';

test('uses a fourteen-day monitoring window by default', () => {
  assert.equal(normalizeOverviewDays(undefined), 14);
});

test('keeps the monitoring window within the supported range', () => {
  assert.equal(normalizeOverviewDays('3'), 7);
  assert.equal(normalizeOverviewDays('21'), 21);
  assert.equal(normalizeOverviewDays('90'), 30);
});
