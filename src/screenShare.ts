import type {
  ScreenShareCaptureOptions,
  TrackPublishOptions,
} from 'livekit-client';

export const MOBILE_SCREEN_SHARE_CAPTURE: ScreenShareCaptureOptions = {
  resolution: {
    width: 1920,
    height: 1080,
    frameRate: 60,
  },
  contentHint: 'detail',
};

export const MOBILE_SCREEN_SHARE_PUBLISH: TrackPublishOptions = {
  simulcast: false,
  videoCodec: 'h264',
  backupCodec: false,
  screenShareEncoding: {
    maxBitrate: 7_000_000,
    maxFramerate: 60,
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
