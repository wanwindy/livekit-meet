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

