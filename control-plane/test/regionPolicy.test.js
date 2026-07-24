import assert from 'node:assert/strict';
import test from 'node:test';
import {chooseNode, decidePreferredRegion} from '../src/regionPolicy.js';

test('defaults China-facing meetings to Hong Kong', () => {
  assert.equal(decidePreferredRegion({}), 'hk');
});

test('routes Southeast Asia audience to Singapore when requested', () => {
  assert.equal(decidePreferredRegion({audienceRegion: 'sea'}), 'sg');
});

test('chooses preferred healthy node first', () => {
  const node = chooseNode({
    preferredRegion: 'sg',
    nodes: [
      {region: 'hk', status: 'healthy'},
      {region: 'sg', status: 'healthy'},
    ],
  });

  assert.equal(node.region, 'sg');
});

test('falls back to Hong Kong when Singapore is offline', () => {
  const node = chooseNode({
    preferredRegion: 'sg',
    nodes: [
      {region: 'hk', status: 'healthy'},
      {region: 'sg', status: 'offline'},
    ],
  });

  assert.equal(node.region, 'hk');
});

test('chooses a healthy fallback before a degraded preferred node', () => {
  const node = chooseNode({
    preferredRegion: 'sg',
    nodes: [
      {region: 'hk', status: 'healthy'},
      {region: 'sg', status: 'degraded'},
    ],
  });

  assert.equal(node.region, 'hk');
});

test('does not select a node with stale health data', () => {
  const now = Date.UTC(2026, 6, 24, 12, 0, 0);
  const node = chooseNode({
    preferredRegion: 'hk',
    staleAfterMs: 90_000,
    now,
    nodes: [
      {region: 'hk', status: 'healthy', lastHealthAt: new Date(now - 91_000)},
      {region: 'sg', status: 'healthy', lastHealthAt: new Date(now - 1_000)},
    ],
  });

  assert.equal(node.region, 'sg');
});
