import assert from 'node:assert/strict';
import test from 'node:test';
import {getNodeHealthUrl, nextNodeHealthState} from '../src/nodeHealth.js';

test('maps a WSS signal URL to the LiveKit root health endpoint', () => {
  assert.equal(
    getNodeHealthUrl('wss://hk.livekit.fangxinbanmeet.com/rtc?token=ignored'),
    'https://hk.livekit.fangxinbanmeet.com/',
  );
});

test('marks a node offline after the configured number of failures', () => {
  const firstFailure = nextNodeHealthState({
    currentStatus: 'healthy',
    consecutiveFailures: 0,
    healthy: false,
    failureThreshold: 3,
  });
  const thirdFailure = nextNodeHealthState({
    currentStatus: 'degraded',
    consecutiveFailures: 2,
    healthy: false,
    failureThreshold: 3,
  });

  assert.equal(firstFailure.status, 'degraded');
  assert.equal(thirdFailure.status, 'offline');
});

test('does not reactivate a draining node', () => {
  assert.deepEqual(
    nextNodeHealthState({
      currentStatus: 'draining',
      consecutiveFailures: 2,
      healthy: true,
      failureThreshold: 3,
    }),
    {status: 'draining', consecutiveFailures: 0},
  );
});
