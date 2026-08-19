import * as React from 'react';
import type {NavigationAction} from '@react-navigation/native';
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
} from '@livekit/react-native';
// @ts-ignore
import {
  ScreenCapturePickerView,
  mediaDevices,
} from '@livekit/react-native-webrtc';
import {ConnectionState, Track} from 'livekit-client';
import Toast from 'react-native-toast-message';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import type {RootStackParamList} from './App';
import {ParticipantView} from './ParticipantView';
import {RoomControls} from './RoomControls';
import {startCallService, stopCallService} from './callservice/CallService';
import {
  getMeetingParticipants,
  getNewlyJoinedParticipants,
} from './participantPresence';
import {
  getStageTrackObjectFit,
  getTrackViewKey,
  getVisibleTracks,
  isRemoteScreenShareTrack,
} from './roomTracks';
import {
  getHostTrackSubscriptionPermissions,
  MOBILE_SCREEN_SHARE_CAPTURE,
  MOBILE_SCREEN_SHARE_PUBLISH,
} from './screenShare';

import 'fastestsmallesttextencoderdecoder';

export const RoomPage = ({
  navigation,
  route,
}: NativeStackScreenProps<RootStackParamList, 'RoomPage'>) => {
  const {url, token, role, meetingNumber, hostIdentity} = route.params;

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
      <RoomView
        navigation={navigation}
        role={role}
        meetingNumber={meetingNumber}
        hostIdentity={hostIdentity}
      />
    </LiveKitRoom>
  );
};

type RoomViewProps = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'RoomPage'>;
  role: 'host' | 'participant';
  meetingNumber: string;
  hostIdentity?: string;
};

const RoomView = ({
  navigation,
  role,
  meetingNumber,
  hostIdentity,
}: RoomViewProps) => {
  const [isCameraFrontFacing, setCameraFrontFacing] = React.useState(true);
  const [servicePromptVisible, setServicePromptVisible] = React.useState(false);
  const [isStartingService, setIsStartingService] = React.useState(false);
  const [subscriptionPermissionsReady, setSubscriptionPermissionsReady] =
    React.useState(role !== 'participant');
  const [leavePromptVisible, setLeavePromptVisible] = React.useState(false);
  const autoShareAttemptedRef = React.useRef(false);
  const isStartingServiceRef = React.useRef(false);
  const isLeavingRef = React.useRef(false);
  const knownParticipantIdentitiesRef = React.useRef<Set<string> | null>(null);
  const pendingLeaveActionRef = React.useRef<NavigationAction | null>(null);
  const room = useRoomContext();
  const connectionState = useConnectionState(room);
  const remoteParticipants = useRemoteParticipants();
  const isHost = role === 'host';
  const isAndroidHost = Platform.OS === 'android' && isHost;
  const insets = useSafeAreaInsets();
  useIOSAudioManagement(room);

  const meetingParticipants = React.useMemo(
    () => getMeetingParticipants(remoteParticipants),
    [remoteParticipants],
  );

  React.useEffect(() => {
    if (!isAndroidHost || connectionState !== ConnectionState.Connected) {
      knownParticipantIdentitiesRef.current = null;
      return;
    }

    const currentIdentities = new Set(
      meetingParticipants.map(participant => participant.identity),
    );
    const previousIdentities = knownParticipantIdentitiesRef.current;
    knownParticipantIdentitiesRef.current = currentIdentities;

    if (previousIdentities == null) {
      return;
    }

    const joinedParticipants = getNewlyJoinedParticipants(
      previousIdentities,
      meetingParticipants,
    );
    if (joinedParticipants.length === 0) {
      return;
    }

    const firstParticipant = joinedParticipants[0];
    const joinedLabel =
      joinedParticipants.length === 1
        ? firstParticipant.displayName
        : `${firstParticipant.displayName} 等 ${joinedParticipants.length} 人`;
    Toast.show({
      type: 'success',
      text1: `${joinedLabel} 已进入会议`,
      text2: `当前已有 ${meetingParticipants.length} 位参会人`,
    });
  }, [connectionState, isAndroidHost, meetingParticipants]);

  React.useEffect(() => {
    startCallService().catch((error: unknown) => {
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

  const hostTrackSubscriptionPermissions = React.useMemo(
    () =>
      getHostTrackSubscriptionPermissions({
        hostIdentity,
        remoteParticipants,
      }),
    [hostIdentity, remoteParticipants],
  );

  React.useEffect(() => {
    if (role === 'participant') {
      const {allParticipantsAllowed, participantTrackPermissions} =
        hostTrackSubscriptionPermissions;
      localParticipant.setTrackSubscriptionPermissions(
        allParticipantsAllowed,
        participantTrackPermissions,
      );
      setSubscriptionPermissionsReady(true);
    }
  }, [hostTrackSubscriptionPermissions, localParticipant, role]);

  const startBroadcast = React.useCallback(async () => {
    if (Platform.OS === 'ios') {
      const reactTag = findNodeHandle(screenCaptureRef.current);
      await NativeModules.ScreenCapturePickerViewManager.show(reactTag);
    }

    await localParticipant.setScreenShareEnabled(
      true,
      MOBILE_SCREEN_SHARE_CAPTURE,
      MOBILE_SCREEN_SHARE_PUBLISH,
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

  const openLeavePrompt = React.useCallback((action?: NavigationAction) => {
    pendingLeaveActionRef.current = action ?? null;
    setLeavePromptVisible(true);
  }, []);

  const cancelLeave = React.useCallback(() => {
    pendingLeaveActionRef.current = null;
    setLeavePromptVisible(false);
  }, []);

  const confirmLeave = React.useCallback(() => {
    const action = pendingLeaveActionRef.current;
    pendingLeaveActionRef.current = null;
    setLeavePromptVisible(false);
    isLeavingRef.current = true;

    if (action != null) {
      navigation.dispatch(action);
      return;
    }

    navigation.pop();
  }, [navigation]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', event => {
      if (isLeavingRef.current) {
        return;
      }

      event.preventDefault();
      openLeavePrompt(event.data.action);
    });

    return unsubscribe;
  }, [navigation, openLeavePrompt]);

  React.useEffect(() => {
    if (
      role !== 'participant' ||
      connectionState !== ConnectionState.Connected ||
      !subscriptionPermissionsReady ||
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
    subscriptionPermissionsReady,
  ]);

  const displayTracks = React.useMemo(
    () => getVisibleTracks({role, tracks}),
    [role, tracks],
  );
  // Keep the highest-priority track in the stage immediately.
  // useVisualStableUpdate intentionally preserves prior page order, which
  // can leave a newly started screenshare stuck in the thumbnail strip.
  const visibleTracks = displayTracks;
  const stageTrack = visibleTracks[0];
  const isFullscreenScreenShare =
    isHost && isRemoteScreenShareTrack(stageTrack);

  const stageView =
    visibleTracks.length > 0 ? (
      <ParticipantView
        key={getTrackViewKey(stageTrack)}
        trackRef={stageTrack}
        style={styles.stage}
        objectFit={getStageTrackObjectFit(stageTrack)}
      />
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
  }) => (
    <ParticipantView
      key={getTrackViewKey(item)}
      trackRef={item}
      style={styles.otherParticipantView}
    />
  );

  const otherTracks = visibleTracks.slice(1);
  const otherParticipantsView = !isFullscreenScreenShare &&
    otherTracks.length > 0 && (
      <FlatList
        data={otherTracks}
        keyExtractor={getTrackViewKey}
        renderItem={renderParticipant}
        horizontal={true}
        style={styles.otherParticipantsList}
      />
    );

  const handleStartService = () => {
    requestParticipantScreenShare('manual').catch(() => undefined);
  };

  const handleLeaveRequest = () => {
    openLeavePrompt();
  };

  return (
    <View style={styles.container}>
      {stageView}
      {otherParticipantsView}
      <View
        accessible={true}
        accessibilityLabel={`会议号 ${meetingNumber}`}
        style={[styles.meetingHeader, {top: insets.top + 8}]}
        pointerEvents="none">
        <Text style={styles.meetingHeaderLabel}>会议号</Text>
        <Text style={styles.meetingHeaderNumber}>{meetingNumber}</Text>
      </View>
      {isAndroidHost ? (
        <View
          accessible={true}
          accessibilityLabel={`已入会参会人 ${meetingParticipants.length} 人`}
          pointerEvents="none"
          style={[styles.participantStatus, {top: insets.top + 44}]}>
          <View
            style={[
              styles.participantStatusDot,
              meetingParticipants.length > 0 &&
                styles.participantStatusDotActive,
            ]}
          />
          <Text style={styles.participantStatusText}>
            {meetingParticipants.length > 0
              ? `已入会 ${meetingParticipants.length} 人`
              : '等待参会人'}
          </Text>
        </View>
      ) : null}
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
        onDisconnectClick={handleLeaveRequest}
        style={isFullscreenScreenShare ? styles.controlsOverlay : undefined}
      />
      <ServiceStartDialog
        visible={
          role === 'participant' &&
          servicePromptVisible &&
          !isScreenShareEnabled
        }
        isStarting={isStartingService}
        onStart={handleStartService}
        onLeave={handleLeaveRequest}
      />
      <LeaveConfirmDialog
        visible={leavePromptVisible}
        onCancel={cancelLeave}
        onConfirm={confirmLeave}
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

type LeaveConfirmDialogProps = {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

const LeaveConfirmDialog = ({
  visible,
  onCancel,
  onConfirm,
}: LeaveConfirmDialogProps) => {
  return (
    <Modal animationType="fade" transparent={true} visible={visible}>
      <View style={styles.leaveModalShell}>
        <View style={styles.leaveCard}>
          <Text style={styles.leaveTitle}>确认退出会议？</Text>
          <Text style={styles.leaveText}>
            返回上一页会立即离开当前会议，确认后才会退出。
          </Text>
          <Pressable
            onPress={onConfirm}
            style={({pressed}) => [
              styles.leavePrimaryButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.leavePrimaryText}>确认退出</Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            style={({pressed}) => [
              styles.leaveSecondaryButton,
              pressed && styles.pressed,
            ]}>
            <Text style={styles.leaveSecondaryText}>继续会议</Text>
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
  controlsOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  meetingHeader: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  meetingHeaderLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  meetingHeaderNumber: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  participantStatus: {
    position: 'absolute',
    right: 16,
    zIndex: 12,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(6,21,43,0.8)',
  },
  participantStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  participantStatusDotActive: {
    backgroundColor: '#48C99A',
  },
  participantStatusText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
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
  leaveModalShell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(6,21,43,0.76)',
  },
  leaveCard: {
    width: '100%',
    borderRadius: 28,
    paddingHorizontal: 26,
    paddingVertical: 30,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  leaveTitle: {
    color: '#0F2748',
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
  leaveText: {
    color: '#627086',
    fontSize: 15,
    lineHeight: 24,
    marginTop: 12,
    textAlign: 'center',
  },
  leavePrimaryButton: {
    width: '100%',
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D34747',
    marginTop: 26,
  },
  leavePrimaryText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  leaveSecondaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    backgroundColor: '#EEF3FB',
  },
  leaveSecondaryText: {
    color: '#0F2748',
    fontSize: 15,
    fontWeight: '800',
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
