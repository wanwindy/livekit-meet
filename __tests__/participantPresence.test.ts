import {describe, expect, it} from '@jest/globals';
import {
  getMeetingParticipants,
  getNewlyJoinedParticipants,
} from '../src/participantPresence';

describe('participant presence', () => {
  it('excludes hosts and uses a readable fallback name', () => {
    expect(
      getMeetingParticipants([
        {identity: 'host-10', name: '主持人'},
        {identity: 'guest-1', name: '张三'},
        {identity: 'guest-2', name: '  '},
      ]),
    ).toEqual([
      {identity: 'guest-1', displayName: '张三'},
      {identity: 'guest-2', displayName: '参会人'},
    ]);
  });

  it('reports only participants that were not previously present', () => {
    const participants = getMeetingParticipants([
      {identity: 'guest-1', name: '张三'},
      {identity: 'guest-2', name: '李四'},
    ]);

    expect(
      getNewlyJoinedParticipants(new Set(['guest-1']), participants),
    ).toEqual([{identity: 'guest-2', displayName: '李四'}]);
  });
});
