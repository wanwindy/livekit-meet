import {describe, expect, it} from '@jest/globals';
import {
  getHostTrackSubscriptionPermissions,
  MOBILE_SCREEN_SHARE_CAPTURE,
  MOBILE_SCREEN_SHARE_PUBLISH,
  shouldAutoStartParticipantScreenShare,
} from '../src/screenShare';

describe('mobile screen sharing', () => {
  it('uses the high-quality screen capture and encoding profile', () => {
    expect(MOBILE_SCREEN_SHARE_CAPTURE.resolution).toEqual({
      width: 1920,
      height: 1080,
      frameRate: 60,
    });
    expect(MOBILE_SCREEN_SHARE_PUBLISH).toMatchObject({
      videoCodec: 'h264',
      backupCodec: false,
      screenShareEncoding: {
        maxBitrate: 7_000_000,
        maxFramerate: 60,
      },
    });
  });

  it('allows the expected host before they appear in the room', () => {
    expect(
      getHostTrackSubscriptionPermissions({
        hostIdentity: 'host-42',
        remoteParticipants: [],
      }),
    ).toEqual({
      allParticipantsAllowed: false,
      participantTrackPermissions: [
        {participantIdentity: 'host-42', allowAll: true},
      ],
    });
  });

  it('does not create a deny-all window for legacy meetings', () => {
    expect(
      getHostTrackSubscriptionPermissions({
        remoteParticipants: [{identity: 'legacy-host'}],
      }),
    ).toEqual({
      allParticipantsAllowed: true,
      participantTrackPermissions: [],
    });
  });

  it('requires a foreground button press before Android screen capture', () => {
    expect(shouldAutoStartParticipantScreenShare('ios')).toBe(true);
    expect(shouldAutoStartParticipantScreenShare('android')).toBe(false);
  });
});
