import {Track} from 'livekit-client';
import {describe, expect, it} from '@jest/globals';
import {getVisibleTracks} from '../src/roomTracks';

const createTrack = ({
  source,
  isLocal,
  identity,
}: {
  source: Track.Source;
  isLocal: boolean;
  identity: string;
}) =>
  ({
    source,
    participant: {
      identity,
      isLocal,
    },
  } as any);

describe('getVisibleTracks', () => {
  it('hides local tracks for participants', () => {
    const visibleTracks = getVisibleTracks({
      role: 'participant',
      tracks: [
        createTrack({
          source: Track.Source.Camera,
          isLocal: true,
          identity: 'guest-local',
        }),
        createTrack({
          source: Track.Source.ScreenShare,
          isLocal: true,
          identity: 'guest-local',
        }),
        createTrack({
          source: Track.Source.Camera,
          isLocal: false,
          identity: 'host-1',
        }),
      ],
    });

    expect(visibleTracks).toHaveLength(1);
    expect(visibleTracks[0].participant.identity).toBe('host-1');
  });

  it('prioritizes remote screen share for hosts', () => {
    const visibleTracks = getVisibleTracks({
      role: 'host',
      tracks: [
        createTrack({
          source: Track.Source.Camera,
          isLocal: true,
          identity: 'host-1',
        }),
        createTrack({
          source: Track.Source.Camera,
          isLocal: false,
          identity: 'guest-1',
        }),
        createTrack({
          source: Track.Source.ScreenShare,
          isLocal: false,
          identity: 'guest-1',
        }),
      ],
    });

    expect(visibleTracks[0].source).toBe(Track.Source.ScreenShare);
    expect(visibleTracks[0].participant.identity).toBe('guest-1');
  });
});
