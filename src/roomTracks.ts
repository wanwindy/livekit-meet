import type {TrackReferenceOrPlaceholder} from '@livekit/react-native';
import {Track} from 'livekit-client';

export type RoomRole = 'host' | 'participant';

const getTrackPriority = (
  role: RoomRole,
  trackRef: TrackReferenceOrPlaceholder,
) => {
  if (
    role === 'host' &&
    trackRef.source === Track.Source.ScreenShare &&
    !trackRef.participant.isLocal
  ) {
    return 0;
  }

  if (
    trackRef.source === Track.Source.ScreenShare &&
    !trackRef.participant.isLocal
  ) {
    return 1;
  }

  if (!trackRef.participant.isLocal) {
    return 2;
  }

  if (trackRef.source === Track.Source.ScreenShare) {
    return 3;
  }

  return 4;
};

export const getVisibleTracks = ({
  role,
  tracks,
}: {
  role: RoomRole;
  tracks: TrackReferenceOrPlaceholder[];
}) =>
  tracks
    .filter(
      trackRef => !(role === 'participant' && trackRef.participant.isLocal),
    )
    .slice()
    .sort(
      (first, second) =>
        getTrackPriority(role, first) - getTrackPriority(role, second),
    );
