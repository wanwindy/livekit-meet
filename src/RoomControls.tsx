import * as React from 'react';
import {useState} from 'react';
import type {SimulationScenario} from 'livekit-client';

import {
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from 'react-native';
import {AudioOutputList} from './ui/AudioOutputList';
import {assuranceColors, assuranceShadow} from './ui/brand';

const micOnIcon = require('./icons/baseline_mic_white_24dp.png');
const micOffIcon = require('./icons/baseline_mic_off_white_24dp.png');
const cameraOnIcon = require('./icons/baseline_videocam_white_24dp.png');
const cameraOffIcon = require('./icons/baseline_videocam_off_white_24dp.png');
const flipIcon = require('./icons/camera_flip_outline.png');
const shareOnIcon = require('./icons/baseline_cast_connected_white_24dp.png');
const shareOffIcon = require('./icons/baseline_cast_white_24dp.png');
const messageIcon = require('./icons/message_outline.png');
const speakerIcon = require('./icons/speaker.png');
const leaveIcon = require('./icons/baseline_cancel_white_24dp.png');

export type Props = {
  micEnabled?: boolean;
  setMicEnabled: (enabled: boolean) => void;
  cameraEnabled?: boolean;
  setCameraEnabled: (enabled: boolean) => void;
  switchCamera: () => void;
  showCameraControls?: boolean;
  screenShareEnabled: boolean;
  setScreenShareEnabled: (enabled: boolean) => void;
  showScreenShareButton?: boolean;
  sendData: (message: string) => void;
  onSimulate?: (scenario: SimulationScenario) => void;
  onDisconnectClick: () => void;
  style?: StyleProp<ViewStyle>;
};

export const RoomControls = ({
  micEnabled = false,
  setMicEnabled,
  cameraEnabled = false,
  setCameraEnabled,
  switchCamera,
  showCameraControls = true,
  screenShareEnabled = false,
  setScreenShareEnabled,
  showScreenShareButton = true,
  sendData,
  onDisconnectClick,
  style,
}: Props) => {
  const [audioModalVisible, setAudioModalVisible] = useState(false);
  const [messageDialogVisible, setMessageDialogVisible] = useState(false);
  const [message, setMessage] = useState('');

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    sendData(trimmed);
    setMessage('');
    setMessageDialogVisible(false);
  };

  return (
    <View style={[styles.shell, style]}>
      <View style={styles.container}>
        <ControlButton
          label={micEnabled ? '麦克风' : '已静音'}
          icon={micEnabled ? micOnIcon : micOffIcon}
          active={micEnabled}
          onPress={() => setMicEnabled(!micEnabled)}
        />
        {showCameraControls ? (
          <>
            <ControlButton
              label={cameraEnabled ? '摄像头' : '摄像头关'}
              icon={cameraEnabled ? cameraOnIcon : cameraOffIcon}
              active={cameraEnabled}
              onPress={() => setCameraEnabled(!cameraEnabled)}
            />
            <ControlButton
              label="切换"
              icon={flipIcon}
              onPress={switchCamera}
            />
          </>
        ) : null}
        {showScreenShareButton ? (
          <ControlButton
            label={screenShareEnabled ? '共享中' : '共享'}
            icon={screenShareEnabled ? shareOnIcon : shareOffIcon}
            active={screenShareEnabled}
            onPress={() => setScreenShareEnabled(!screenShareEnabled)}
          />
        ) : null}
        <ControlButton
          label="消息"
          icon={messageIcon}
          onPress={() => setMessageDialogVisible(true)}
        />
        <ControlButton
          label="音频"
          icon={speakerIcon}
          onPress={() => setAudioModalVisible(true)}
        />
        <ControlButton
          label="离开"
          icon={leaveIcon}
          variant="danger"
          onPress={onDisconnectClick}
        />
      </View>

      <Modal
        animationType="fade"
        transparent={true}
        visible={messageDialogVisible}
        onRequestClose={() => setMessageDialogVisible(false)}>
        <View style={styles.modalShell}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setMessageDialogVisible(false)}
          />
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>发送消息</Text>
            <Text style={styles.sheetSubtitle}>
              通过数据通道向当前会议参与方发送一条文本消息。
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              placeholder="请输入消息内容"
              placeholderTextColor={assuranceColors.textTertiary}
              style={styles.messageInput}
              multiline={true}
            />
            <View style={styles.sheetActions}>
              <SheetSecondaryButton
                title="取消"
                onPress={() => setMessageDialogVisible(false)}
              />
              <SheetPrimaryButton
                title="发送"
                disabled={!message.trim()}
                onPress={handleSend}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        transparent={true}
        visible={audioModalVisible}
        onRequestClose={() => setAudioModalVisible(false)}>
        <View style={styles.modalShell}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setAudioModalVisible(false)}
          />
          <View style={styles.sheetCard}>
            <Text style={styles.sheetTitle}>选择音频输出</Text>
            <Text style={styles.sheetSubtitle}>
              在听筒、扬声器或蓝牙设备之间切换当前会议音频。
            </Text>
            <AudioOutputList onSelect={() => setAudioModalVisible(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

type ControlButtonProps = {
  label: string;
  icon: ImageSourcePropType;
  active?: boolean;
  variant?: 'default' | 'danger';
  onPress: () => void;
};

const ControlButton = ({
  label,
  icon,
  active = false,
  variant = 'default',
  onPress,
}: ControlButtonProps) => {
  const isDanger = variant === 'danger';
  const backgroundColor = isDanger
    ? '#B93030'
    : active
    ? assuranceColors.primary
    : 'rgba(255,255,255,0.14)';
  const tintColor = assuranceColors.white;

  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [styles.controlItem, pressed && styles.pressed]}>
      <View style={[styles.iconButton, {backgroundColor}]}>
        <Image source={icon} style={[styles.icon, {tintColor}]} />
      </View>
      <Text style={styles.controlLabel}>{label}</Text>
    </Pressable>
  );
};

type SheetButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
};

const SheetPrimaryButton = ({
  title,
  onPress,
  disabled = false,
}: SheetButtonProps) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        styles.primaryButton,
        disabled && styles.primaryButtonDisabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <Text style={styles.primaryButtonText}>{title}</Text>
    </Pressable>
  );
};

const SheetSecondaryButton = ({title, onPress}: SheetButtonProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.secondaryButton,
        pressed && styles.pressed,
      ]}>
      <Text style={styles.secondaryButtonText}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  shell: {
    width: '100%',
  },
  container: {
    marginHorizontal: 16,
    marginBottom: 18,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    borderRadius: 26,
    backgroundColor: 'rgba(10, 26, 52, 0.84)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    ...assuranceShadow.floating,
  },
  controlItem: {
    width: 52,
    alignItems: 'center',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 22,
    height: 22,
  },
  controlLabel: {
    color: assuranceColors.white,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
    minHeight: 28,
  },
  modalShell: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: assuranceColors.overlayDark,
  },
  sheetCard: {
    backgroundColor: assuranceColors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  sheetTitle: {
    color: assuranceColors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
  },
  sheetSubtitle: {
    color: assuranceColors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 10,
  },
  messageInput: {
    minHeight: 110,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: assuranceColors.border,
    backgroundColor: assuranceColors.surfaceMuted,
    marginTop: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
    color: assuranceColors.text,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 22,
  },
  secondaryButton: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: assuranceColors.border,
    backgroundColor: assuranceColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: assuranceColors.textSecondary,
    fontSize: 16,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
    height: 56,
    borderRadius: 18,
    backgroundColor: assuranceColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: '#AFC0D8',
  },
  primaryButtonText: {
    color: assuranceColors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  pressed: {
    transform: [{scale: 0.98}],
    opacity: 0.9,
  },
});
