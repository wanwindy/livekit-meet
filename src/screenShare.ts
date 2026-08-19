import type {
  ScreenShareCaptureOptions,
  TrackPublishOptions,
} from 'livekit-client';

export const MOBILE_SCREEN_SHARE_CAPTURE: ScreenShareCaptureOptions = {
  resolution: {
    width: 1280,
    height: 720,
    frameRate: 15,
  },
  contentHint: 'detail',
};

export const MOBILE_SCREEN_SHARE_PUBLISH: TrackPublishOptions = {
  simulcast: false,
  videoCodec: 'h264',
  backupCodec: true,
  screenShareEncoding: {
    maxBitrate: 1_500_000,
    maxFramerate: 15,
  },
};

export const shouldAutoStartParticipantScreenShare = (platform: string) =>
  platform === 'ios';

export type ParticipantIdentity = {
  identity: string;
};

export const getHostTrackSubscriptionPermissions = ({
  hostIdentity,
  remoteParticipants,
}: {
  hostIdentity?: string;
  remoteParticipants: ParticipantIdentity[];
}) => {
  const hostIdentities = new Set<string>();
  const expectedHostIdentity = hostIdentity?.trim();

  if (expectedHostIdentity) {
    hostIdentities.add(expectedHostIdentity);
  }

  remoteParticipants.forEach(participant => {
    if (participant.identity.startsWith('host-')) {
      hostIdentities.add(participant.identity);
    }
  });

  if (hostIdentities.size === 0) {
    // Legacy meetings did not return a host identity. Keeping subscriptions
    // open is safer than publishing into a deny-all window the host cannot exit.
    return {
      allParticipantsAllowed: true,
      participantTrackPermissions: [],
    };
  }

  return {
    allParticipantsAllowed: false,
    participantTrackPermissions: Array.from(hostIdentities).map(identity => ({
      participantIdentity: identity,
      allowAll: true,
    })),
  };
};
