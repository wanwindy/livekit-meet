import * as React from 'react';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import {
  FlatList,
  ListRenderItem,
  Modal,
  NativeModules,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  findNodeHandle,
} from 'react-native';
import {
  AudioSession,
  LiveKitRoom,
  ReceivedDataMessage,
  TrackReferenceOrPlaceholder,
  useConnectionState,
  useDataChannel,
  useIOSAudioManagement,
  useLocalParticipant,
  useRemoteParticipants,
  useRoomContext,
  useTracks,
  useVisualStableUpdate,
} from '@livekit/react-native';
// @ts-ignore
import {
  ScreenCapturePickerView,
  mediaDevices,
} from '@livekit/react-native-webrtc';
import {
  ConnectionState,
  Track,
  type ScreenShareCaptureOptions,
  type TrackPublishOptions,
} from 'livekit-client';
import Toast from 'react-native-toast-message';
import type {RootStackParamList} from './App';
import {ParticipantView} from './ParticipantView';
import {RoomControls} from './RoomControls';
import {startCallService, stopCallService} from './callservice/CallService';
import {getVisibleTracks} from './roomTracks';

import 'fastestsmallesttextencoderdecoder';

const HIGH_QUALITY_SCREEN_SHARE_CAPTURE: ScreenShareCaptureOptions = {
  resolution: {
    width: 1920,
    height: 1080,
    frameRate: 60,
  },
  contentHint: 'detail',
};

const HIGH_QUALITY_SCREEN_SHARE_PUBLISH: TrackPublishOptions = {
  simulcast: false,
  screenShareEncoding: {
    maxBitrate: 7_000_000,
    maxFramerate: 60,
  },
};

export const RoomPage = ({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'RoomPage'>) => {
  const {url, token, role} = route.params;

  React.useEffect(() => {
    const start = async () => {
      await AudioSession.startAudioSession();
    };

    start().catch(() => undefined);
    return () => {
      AudioSession.stopAudioSession();
    };
  }, []);

  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect={true}
      options={{
        adaptiveStream: {pixelDensity: 'screen'},
      }}
      audio={true}
      video={role === 'host'}>
      <RoomView navigation={navigation} role={role} />
    </LiveKitRoom>
  );
};

type RoomViewProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RoomPage'>;
  role: 'host' | 'participant';
};

const RoomView = ({navigation, role}: RoomViewProps) => {
  const [isCameraFrontFacing, setCameraFrontFacing] = React.useState(true);
  const [servicePromptVisible, setServicePromptVisible] = React.useState(false);
  const [isStartingService, setIsStartingService] = React.useState(false);
  const autoShareAttemptedRef = React.useRef(false);
  const isStartingServiceRef = React.useRef(false);
  const room = useRoomContext();
  const connectionState = useConnectionState(room);
  const remoteParticipants = useRemoteParticipants();
  const isHost = role === 'host';
  useIOSAudioManagement(room);

  React.useEffect(() => {
    startCallService().catch(error => {
      Toast.show({
        type: 'info',
        text1: '后台保活未启动',
        text2:
          error instanceof Error
            ? error.message
            : '切换到后台后，会议音频可能会中断。',
      });
    });

    return () => {
      stopCallService().catch(() => undefined);
    };
  }, []);

  const {send} = useDataChannel((dataMessage: ReceivedDataMessage<string>) => {
    // @ts-ignore
    const decoder = new TextDecoder('utf-8');
    const message = decoder.decode(dataMessage.payload);

    let title = 'Received Message';
    if (dataMessage.from != null) {
      title = `Received Message from ${dataMessage.from.identity}`;
    }

    Toast.show({
      type: 'success',
      text1: title,
      text2: message,
    });
  });

  const tracks = useTracks(
    [
      {source: Track.Source.Camera, withPlaceholder: true},
      {source: Track.Source.ScreenShare, withPlaceholder: false},
    ],
    {onlySubscribed: false},
  );
  const {
    isCameraEnabled,
    isMicrophoneEnabled,
    isScreenShareEnabled,
    localParticipant,
  } = useLocalParticipant();

  const screenCaptureRef = React.useRef(null);
  const screenCapturePickerView = Platform.OS === 'ios' && (
    <ScreenCapturePickerView ref={screenCaptureRef} />
  );

  const hostTrackPermissions = React.useMemo(
    () =>
      remoteParticipants
        .filter(participant => participant.identity.startsWith('host-'))
        .map(participant => ({
          participantIdentity: participant.identity,
          allowAll: true,
        })),
    [remoteParticipants],
  );

  React.useEffect(() => {
    if (role === 'participant') {
      localParticipant.setTrackSubscriptionPermissions(
        false,
        hostTrackPermissions,
      );
    }
  }, [hostTrackPermissions, localParticipant, role]);

  const startBroadcast = React.useCallback(async () => {
    if (Platform.OS === 'ios') {
      const reactTag = findNodeHandle(screenCaptureRef.current);
      await NativeModules.ScreenCapturePickerViewManager.show(reactTag);
    }

    await localParticipant.setScreenShareEnabled(
      true,
      HIGH_QUALITY_SCREEN_SHARE_CAPTURE,
      HIGH_QUALITY_SCREEN_SHARE_PUBLISH,
    );
  }, [localParticipant]);

  const requestParticipantScreenShare = React.useCallback(
    async (trigger: 'auto' | 'manual') => {
      if (
        role !== 'participant' ||
        isScreenShareEnabled ||
        isStartingServiceRef.current
      ) {
        return false;
      }

      isStartingServiceRef.current = true;
      setIsStartingService(true);

      if (trigger === 'manual') {
        setServicePromptVisible(false);
      }

      let wasStarted = false;

      try {
        await startBroadcast();
        wasStarted = true;
        setServicePromptVisible(false);

        if (trigger === 'manual') {
          Toast.show({
            type: 'success',
            text1: '屏幕共享已开启',
            text2: '主持人现在可以看到您的办理画面。',
          });
        }
      } catch (error) {
        if (trigger === 'manual') {
          Toast.show({
            type: 'error',
            text1: '屏幕共享未开启',
            text2:
              error instanceof Error ? error.message : '请重新授权屏幕共享',
          });
        } else {
          Toast.show({
            type: 'info',
            text1: '请完成屏幕共享授权',
            text2: '已自动发起共享，如未成功可点击“开始办理服务”重试。',
          });
        }

        setServicePromptVisible(true);
      } finally {
        isStartingServiceRef.current = false;
        setIsStartingService(false);
      }

      return wasStarted;
    },
    [isScreenShareEnabled, role, startBroadcast],
  );

  React.useEffect(() => {
    if (
      role === 'participant' &&
      connectionState !== ConnectionState.Connected
    ) {
      autoShareAttemptedRef.current = false;
      setServicePromptVisible(false);
    }
  }, [connectionState, role]);

  React.useEffect(() => {
    if (isScreenShareEnabled) {
      setServicePromptVisible(false);
    }
  }, [isScreenShareEnabled]);

  React.useEffect(() => {
    if (
      role !== 'participant' ||
      connectionState !== ConnectionState.Connected ||
      isScreenShareEnabled ||
      autoShareAttemptedRef.current
    ) {
      return;
    }

    autoShareAttemptedRef.current = true;
    requestParticipantScreenShare('auto').catch(() => undefined);
  }, [
    connectionState,
    isScreenShareEnabled,
    requestParticipantScreenShare,
    role,
  ]);

  const displayTracks = React.useMemo(
    () => getVisibleTracks({role, tracks}),
    [role, tracks],
  );
  const stableTracks = useVisualStableUpdate(displayTracks, 5);

  const stageView =
    stableTracks.length > 0 ? (
      <ParticipantView trackRef={stableTracks[0]} style={styles.stage} />
    ) : (
      <View style={[styles.stage, styles.emptyStage]}>
        <Text style={styles.emptyStageTitle}>
          {isHost
            ? '等待参会人加入'
            : connectionState === ConnectionState.Connected
            ? '等待主持人查看画面'
            : '正在连接会议'}
        </Text>
        <Text style={styles.emptyStageText}>
          {isHost
            ? '参会人授权屏幕共享后，画面会显示在这里。'
            : isScreenShareEnabled
            ? '您的屏幕共享已开启，本机不会显示自己的共享画面。'
            : '入会后会自动尝试共享屏幕，如系统需要授权请按提示完成。'}
        </Text>
      </View>
    );

  const renderParticipant: ListRenderItem<TrackReferenceOrPlaceholder> = ({
    item,
  }) => <ParticipantView trackRef={item} style={styles.otherParticipantView} />;

  const otherTracks = stableTracks.slice(1);
  const otherParticipantsView = otherTracks.length > 0 && (
    <FlatList
      data={otherTracks}
      renderItem={renderParticipant}
      horizontal={true}
      style={styles.otherParticipantsList}
    />
  );

  const handleStartService = () => {
    requestParticipantScreenShare('manual').catch(() => undefined);
  };

  return (
    <View style={styles.container}>
      {stageView}
      {otherParticipantsView}
      <RoomControls
        micEnabled={isMicrophoneEnabled}
        setMicEnabled={(enabled: boolean) => {
          localParticipant.setMicrophoneEnabled(enabled);
        }}
        cameraEnabled={isCameraEnabled}
        setCameraEnabled={(enabled: boolean) => {
          localParticipant.setCameraEnabled(enabled);
        }}
        switchCamera={async () => {
          const facingModeStr = !isCameraFrontFacing ? 'front' : 'environment';
          setCameraFrontFacing(!isCameraFrontFacing);

          const devices = await mediaDevices.enumerateDevices();
          let newDevice;

          // @ts-ignore
          for (const device of devices) {
            // @ts-ignore
            if (
              device.kind === 'videoinput' &&
              device.facing === facingModeStr
            ) {
              newDevice = device;
              break;
            }
          }

          if (newDevice == null) {
            return;
          }

          // @ts-ignore
          await room.switchActiveDevice('videoinput', newDevice.deviceId);
        }}
        showCameraControls={isHost}
        screenShareEnabled={isScreenShareEnabled}
        setScreenShareEnabled={(enabled: boolean) => {
          if (enabled) {
            requestParticipantScreenShare('manual').catch(() => undefined);
          } else {
            localParticipant.setScreenShareEnabled(false);
          }
        }}
        showScreenShareButton={!isHost}
        sendData={(message: string) => {
          Toast.show({
            type: 'success',
            text1: 'Sending Message',
            text2: message,
          });

          // @ts-ignore
          const encoder = new TextEncoder();
          const encodedData = encoder.encode(message);
          send(encodedData, {reliable: true});
        }}
        onSimulate={scenario => {
          room.simulateScenario(scenario);
        }}
        onDisconnectClick={() => {
          navigation.pop();
        }}
      />
      <ServiceStartDialog
        visible={
          role === 'participant' &&
          servicePromptVisible &&
          !isScreenShareEnabled
        }
        isStarting={isStartingService}
        onStart={handleStartService}
        onLeave={() => {
          navigation.pop();
        }}
      />
      {screenCapturePickerView}
    </View>
  );
};

type ServiceStartDialogProps = {
  visible: boolean;
  isStarting: boolean;
  onStart: () => void;
  onLeave: () => void;
};

const ServiceStartDialog = ({
  visible,
  isStarting,
  onStart,
  onLeave,
}: ServiceStartDialogProps) => {
  return (
    <Modal animationType="fade" transparent={true} visible={visible}>
      <View style={styles.serviceModalShell}>
        <View style={styles.serviceCard}>
          <View style={styles.serviceIcon}>
            <Text style={styles.serviceIconText}>办</Text>
          </View>
          <Text style={styles.serviceTitle}>开始办理服务</Text>
          <Text style={styles.serviceText}>
            入会后系统会自动尝试共享屏幕。若系统未完成授权，请点击下方按钮重试。主持人将看到您的操作画面，您本机不会显示自己的共享画面。
          </Text>
          <Pressable
            disabled={isStarting}
            onPress={onStart}
            style={({pressed}) => [
              styles.servicePrimaryButton,
              isStarting && styles.serviceButtonDisabled,
              pressed && !isStarting && styles.pressed,
            ]}>
            <Text style={styles.servicePrimaryText}>
              {isStarting ? '正在申请授权' : '开始办理服务'}
            </Text>
          </Pressable>
          <Pressable
            disabled={isStarting}
            onPress={onLeave}
            style={({pressed}) => [
              styles.serviceSecondaryButton,
              pressed && !isStarting && styles.pressed,
            ]}>
            <Text style={styles.serviceSecondaryText}>退出会议</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#06152B',
  },
  stage: {
    flex: 1,
    width: '100%',
  },
  emptyStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#06152B',
  },
  emptyStageTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyStageText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    lineHeight: 23,
    marginTop: 12,
    textAlign: 'center',
  },
  otherParticipantsList: {
    width: '100%',
    height: 150,
    flexGrow: 0,
  },
  otherParticipantView: {
    width: 150,
    height: 150,
  },
  serviceModalShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(6,21,43,0.76)',
  },
  serviceCard: {
    width: '100%',
    borderRadius: 28,
    paddingHorizontal: 26,
    paddingVertical: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  serviceIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF3FB',
  },
  serviceIconText: {
    color: '#1E56A0',
    fontSize: 28,
    fontWeight: '900',
  },
  serviceTitle: {
    color: '#0F2748',
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '900',
    marginTop: 22,
    textAlign: 'center',
  },
  serviceText: {
    color: '#627086',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 12,
    textAlign: 'center',
  },
  servicePrimaryButton: {
    width: '100%',
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E56A0',
    marginTop: 26,
  },
  serviceButtonDisabled: {
    backgroundColor: '#AFC0D8',
  },
  servicePrimaryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  serviceSecondaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  serviceSecondaryText: {
    color: '#627086',
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    transform: [{scale: 0.98}],
    opacity: 0.88,
  },
});
