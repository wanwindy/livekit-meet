import assert from 'node:assert/strict';
import test from 'node:test';
import {getHostIdentity} from '../src/livekitService.js';

test('uses one stable LiveKit identity for host tokens and join responses', () => {
  assert.equal(getHostIdentity(42), 'host-42');
});
