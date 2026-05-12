import * as React from 'react';

import {Image, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {
  isTrackReference,
  TrackReferenceOrPlaceholder,
  useEnsureTrackRef,
  useIsMuted,
  useIsSpeaking,
  useParticipantInfo,
  VideoTrack,
} from '@livekit/react-native';
import {assuranceColors} from './ui/brand';

const cameraOffIcon = require('./icons/baseline_videocam_off_white_24dp.png');

export type Props = {
  trackRef: TrackReferenceOrPlaceholder;
  style?: ViewStyle;
  zOrder?: number;
  mirror?: boolean;
};

export const ParticipantView = ({
  style = {},
  trackRef,
  zOrder,
  mirror,
}: Props) => {
  const trackReference = useEnsureTrackRef(trackRef);
  const {identity, name} = useParticipantInfo({
    participant: trackReference.participant,
  });
  const isSpeaking = useIsSpeaking(trackRef.participant);
  const isVideoMuted = useIsMuted(trackRef);

  const displayName = name || identity;

  return (
    <View style={[styles.container, style]}>
      {isTrackReference(trackRef) && !isVideoMuted ? (
        <VideoTrack
          style={styles.videoView}
          trackRef={trackRef}
          zOrder={zOrder}
          mirror={mirror}
        />
      ) : (
        <View style={styles.placeholder}>
          <View style={styles.placeholderIconWrap}>
            <Image source={cameraOffIcon} style={styles.placeholderIcon} />
          </View>
          <Text style={styles.placeholderTitle}>视频未开启</Text>
          <Text style={styles.placeholderText}>
            当前参与方尚未打开摄像头画面
          </Text>
        </View>
      )}

      <View style={styles.identityBar}>
        <Text numberOfLines={1} style={styles.identityText}>
          {displayName}
        </Text>
      </View>
      {isSpeaking ? <View style={styles.speakingIndicator} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#06152B',
  },
  videoView: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    backgroundColor: '#0A1933',
  },
  placeholderIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    width: 26,
    height: 26,
    tintColor: assuranceColors.white,
  },
  placeholderTitle: {
    color: assuranceColors.white,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    marginTop: 18,
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.68)',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginTop: 6,
  },
  identityBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(6, 21, 43, 0.68)',
  },
  identityText: {
    color: assuranceColors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  speakingIndicator: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderColor: assuranceColors.accent,
    borderRadius: 24,
  },
});
