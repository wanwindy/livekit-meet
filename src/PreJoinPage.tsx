import * as React from 'react';
import {useEffect, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import {
  ACCOUNT_KEY,
  createMeeting,
  joinMeeting,
  type MeetingTokenResponse,
} from './meetingApi';

import {
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import type {RootStackParamList} from './App';
import {
  DoorEnterIcon,
  HomeIcon,
  ServicesIcon,
  ShieldCheckIcon,
  UserIcon,
  VideoPlusIcon,
} from './ui/BrandIcons';
import {
  appLogoSource,
  assuranceColors,
  assuranceRadius,
  assuranceShadow,
} from './ui/brand';

export const PreJoinPage = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'HomePage'>) => {
  const [meetingNumber, setMeetingNumber] = useState('');
  const [joinVisible, setJoinVisible] = useState(false);
  const [servicesVisible, setServicesVisible] = useState(false);
  const [hostAccount, setHostAccount] = useState('');
  const [createdMeeting, setCreatedMeeting] =
    useState<MeetingTokenResponse | null>(null);
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false);
  const [isJoiningMeeting, setIsJoiningMeeting] = useState(false);
  const [introAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loadHostAccount = () => {
      AsyncStorage.getItem(ACCOUNT_KEY).then(account => {
        setHostAccount(account || '');
      });
    };

    loadHostAccount();
    const unsubscribe = navigation.addListener('focus', loadHostAccount);

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    Animated.timing(introAnim, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [introAnim]);

  const openJoinDialog = () => {
    setMeetingNumber('');
    setJoinVisible(true);
  };

  const goToAccountPage = () => {
    navigation.push('AccountPage');
  };

  const createMeetingForHost = async (account: string) => {
    if (isCreatingMeeting) {
      return;
    }

    const normalizedAccount = account.trim();
    if (!normalizedAccount) {
      return;
    }

    setIsCreatingMeeting(true);
    try {
      const meeting = await createMeeting({
        displayName: normalizedAccount,
      });
      setCreatedMeeting(meeting);
      Toast.show({
        type: 'success',
        text1: '会议已创建',
        text2: `会议号 ${meeting.meetingNumber}`,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: '创建会议失败',
        text2: error instanceof Error ? error.message : '请稍后再试',
      });
    } finally {
      setIsCreatingMeeting(false);
    }
  };

  const handleCreateMeeting = () => {
    if (!hostAccount) {
      Toast.show({
        type: 'info',
        text1: '请先登录主持人账号',
      });
      goToAccountPage();
      return;
    }

    createMeetingForHost(hostAccount);
  };

  const handleJoinMeeting = async () => {
    const normalizedMeetingNumber = meetingNumber.trim();
    if (!normalizedMeetingNumber) {
      Toast.show({
        type: 'error',
        text1: '请输入会议号',
      });
      return;
    }

    setIsJoiningMeeting(true);
    try {
      const meeting = await joinMeeting({
        meetingNumber: normalizedMeetingNumber,
        displayName: '参会人',
      });
      setJoinVisible(false);
      navigation.push('RoomPage', {
        url: meeting.serverUrl,
        token: meeting.token,
        role: 'participant',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: '加入会议失败',
        text2: error instanceof Error ? error.message : '请稍后再试',
      });
    } finally {
      setIsJoiningMeeting(false);
    }
  };

  const enterCreatedMeeting = () => {
    if (!createdMeeting) {
      return;
    }

    const meeting = createdMeeting;
    setCreatedMeeting(null);
    navigation.push('RoomPage', {
      url: meeting.serverUrl,
      token: meeting.token,
      role: 'host',
    });
  };

  const heroTranslate = introAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-14, 0],
  });

  const bodyTranslate = introAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.brandWrap}>
              <Image source={appLogoSource} style={styles.logo} />
              <Text style={styles.brandName}>放心办</Text>
            </View>
            <Pressable
              accessibilityLabel="打开个人中心"
              onPress={goToAccountPage}
              style={({pressed}) => [
                styles.roundIconButton,
                pressed && styles.pressed,
              ]}>
              <UserIcon />
            </Pressable>
          </View>

          <Animated.View
            style={[
              styles.hero,
              {
                opacity: introAnim,
                transform: [{translateY: heroTranslate}],
              },
            ]}>
            <View style={styles.heroGlow} />
            <View style={styles.heroGradient} />
            <View style={styles.buildingRoof} />
            <View style={styles.buildingBeam} />
            <View style={styles.buildingBase} />
            <View style={styles.pillarRow}>
              <View style={styles.pillar} />
              <View style={styles.pillar} />
              <View style={styles.pillar} />
            </View>
            <Text style={styles.heroTitle}>线上服务，放心办理</Text>
            <Text style={styles.heroSubtitle}>
              Secure, Reliable, and Efficient Government Digital Services
            </Text>
            <View style={styles.assuranceBadge}>
              <ShieldCheckIcon size={18} />
              <Text style={styles.badgeText}>您的安全是我们最大的保障</Text>
            </View>
          </Animated.View>

          <Animated.View
            style={[
              styles.bodySection,
              {
                opacity: introAnim,
                transform: [{translateY: bodyTranslate}],
              },
            ]}>
            {!hostAccount ? (
              <View style={styles.noticeCard}>
                <View style={styles.noticeIcon}>
                  <ShieldCheckIcon size={22} color={assuranceColors.accent} />
                </View>
                <View style={styles.noticeCopy}>
                  <Text style={styles.noticeTitle}>主持人请先登录账号</Text>
                  <Text style={styles.noticeBody}>
                    创建会议前请先登录主持人账号。首次登录会自动绑定当前设备；参会人输入会议号可直接加入。
                  </Text>
                  <Pressable
                    onPress={goToAccountPage}
                    style={({pressed}) => [
                      styles.primarySmallButton,
                      pressed && styles.pressed,
                    ]}>
                    <Text style={styles.primarySmallButtonText}>
                      主持人登录
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.readyCard}>
                <View style={styles.readyIconWrap}>
                  <ShieldCheckIcon size={22} color={assuranceColors.success} />
                </View>
                <View style={styles.readyCopy}>
                  <Text style={styles.readyTitle}>
                    主持人账号已绑定当前设备
                  </Text>
                  <Text style={styles.readyBody}>
                    {`当前账号：${hostAccount}。现在可以直接创建会议，参会人凭会议号即可入会。`}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.actionGrid}>
              <ActionCard
                icon={<VideoPlusIcon size={34} />}
                title="创建会议"
                subtitle={
                  isCreatingMeeting
                    ? '正在生成会议号'
                    : hostAccount
                    ? '主持人已登录，可快速发起办理'
                    : '主持人登录后可用'
                }
                onPress={handleCreateMeeting}
                disabled={isCreatingMeeting}
              />
              <ActionCard
                icon={<DoorEnterIcon size={34} />}
                title="加入会议"
                subtitle="输入会议号即可加入"
                onPress={openJoinDialog}
              />
            </View>
          </Animated.View>
        </ScrollView>

        <BottomNav
          active="home"
          onHome={() => undefined}
          onServices={() => setServicesVisible(true)}
          onMine={goToAccountPage}
        />

        <JoinMeetingDialog
          visible={joinVisible}
          meetingNumber={meetingNumber}
          onChangeMeetingNumber={setMeetingNumber}
          onCancel={() => setJoinVisible(false)}
          onJoin={handleJoinMeeting}
          isJoining={isJoiningMeeting}
        />

        <CreatedMeetingDialog
          meeting={createdMeeting}
          onCancel={() => setCreatedMeeting(null)}
          onEnter={enterCreatedMeeting}
        />

        <ServicesSheet
          visible={servicesVisible}
          onClose={() => setServicesVisible(false)}
          onGoAccount={() => {
            setServicesVisible(false);
            goToAccountPage();
          }}
        />
      </View>
    </SafeAreaView>
  );
};

type ActionCardProps = {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
  disabled?: boolean;
};

const ActionCard = ({
  icon,
  title,
  subtitle,
  onPress,
  disabled = false,
}: ActionCardProps) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        styles.actionCard,
        disabled && styles.actionCardDisabled,
        pressed && !disabled && styles.pressed,
      ]}>
      <View style={styles.actionIcon}>{icon}</View>
      <Text style={styles.actionTitle}>{title}</Text>
      <Text style={styles.actionSubtitle}>{subtitle}</Text>
    </Pressable>
  );
};

type BottomNavProps = {
  active: 'home' | 'services' | 'mine';
  onHome: () => void;
  onServices: () => void;
  onMine: () => void;
};

const BottomNav = ({active, onHome, onServices, onMine}: BottomNavProps) => {
  return (
    <View style={styles.bottomNav}>
      <NavItem
        active={active === 'home'}
        label="首页"
        icon={
          <HomeIcon
            color={active === 'home' ? assuranceColors.primary : '#8A96A8'}
          />
        }
        onPress={onHome}
      />
      <NavItem
        active={active === 'services'}
        label="服务"
        icon={
          <ServicesIcon
            color={active === 'services' ? assuranceColors.primary : '#8A96A8'}
          />
        }
        onPress={onServices}
      />
      <NavItem
        active={active === 'mine'}
        label="我的"
        icon={
          <UserIcon
            size={18}
            color={active === 'mine' ? assuranceColors.primary : '#8A96A8'}
          />
        }
        onPress={onMine}
      />
    </View>
  );
};

type NavItemProps = {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
};

const NavItem = ({active, label, icon, onPress}: NavItemProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.navItem,
        active && styles.navItemActive,
        pressed && styles.pressed,
      ]}>
      <View style={styles.navIconWrap}>{icon}</View>
      <Text style={[styles.navLabel, active && styles.navLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
};

type JoinMeetingDialogProps = {
  visible: boolean;
  meetingNumber: string;
  onChangeMeetingNumber: (value: string) => void;
  onCancel: () => void;
  onJoin: () => void;
  isJoining: boolean;
};

const JoinMeetingDialog = ({
  visible,
  meetingNumber,
  onChangeMeetingNumber,
  onCancel,
  onJoin,
  isJoining,
}: JoinMeetingDialogProps) => {
  const canJoin = meetingNumber.trim().length > 0;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalShell}>
        <Pressable style={styles.modalBackdrop} onPress={onCancel} />
        <View style={styles.sheetCard}>
          <Text style={styles.sheetTitle}>输入会议号</Text>
          <Text style={styles.sheetSubtitle}>
            参会人无需登录，输入会议号后即可加入会议
          </Text>
          <TextInput
            value={meetingNumber}
            onChangeText={onChangeMeetingNumber}
            placeholder="请输入会议号"
            placeholderTextColor={assuranceColors.textTertiary}
            keyboardType="number-pad"
            autoFocus={true}
            style={styles.meetingInput}
          />
          <View style={styles.sheetActions}>
            <SheetSecondaryButton title="取消" onPress={onCancel} />
            <SheetPrimaryButton
              title={isJoining ? '正在加入' : '加入会议'}
              disabled={!canJoin || isJoining}
              onPress={onJoin}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

type CreatedMeetingDialogProps = {
  meeting: MeetingTokenResponse | null;
  onCancel: () => void;
  onEnter: () => void;
};

const CreatedMeetingDialog = ({
  meeting,
  onCancel,
  onEnter,
}: CreatedMeetingDialogProps) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={Boolean(meeting)}
      onRequestClose={onCancel}>
      <View style={styles.modalShell}>
        <Pressable style={styles.modalBackdrop} onPress={onCancel} />
        <View style={styles.sheetCard}>
          <Text style={styles.sheetTitle}>会议已创建</Text>
          <Text style={styles.sheetSubtitle}>请将会议号发送给参会人</Text>
          <View style={styles.meetingNumberBox}>
            <Text style={styles.meetingNumberLabel}>会议号</Text>
            <Text style={styles.meetingNumberText}>
              {meeting?.meetingNumber}
            </Text>
          </View>
          <View style={styles.sheetActions}>
            <SheetSecondaryButton title="稍后进入" onPress={onCancel} />
            <SheetPrimaryButton title="进入会议" onPress={onEnter} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

type ServicesSheetProps = {
  visible: boolean;
  onClose: () => void;
  onGoAccount: () => void;
};

const ServicesSheet = ({visible, onClose, onGoAccount}: ServicesSheetProps) => {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.modalShell}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.sheetCard}>
          <Text style={styles.sheetTitle}>在线服务大厅</Text>
          <Text style={styles.sheetSubtitle}>
            当前版本提供远程视频办理、会议接入与主持人账户管理。
          </Text>
          <View style={styles.serviceList}>
            <ServiceItem
              title="远程视频办理"
              body="主持人可创建会议并通过视频协助参会人完成业务操作。"
              icon={<VideoPlusIcon size={28} />}
            />
            <ServiceItem
              title="快速加入会议"
              body="参会人输入会议号即可进入，无需额外登录。"
              icon={<DoorEnterIcon size={28} />}
            />
            <ServiceItem
              title="主持人账号管理"
              body="支持账号绑定、设备授权和当前设备信息查看。"
              icon={<UserIcon size={18} />}
            />
          </View>
          <View style={styles.sheetActions}>
            <SheetSecondaryButton title="关闭" onPress={onClose} />
            <SheetPrimaryButton title="前往我的" onPress={onGoAccount} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

type ServiceItemProps = {
  title: string;
  body: string;
  icon: React.ReactNode;
};

const ServiceItem = ({title, body, icon}: ServiceItemProps) => {
  return (
    <View style={styles.serviceItem}>
      <View style={styles.serviceItemIcon}>{icon}</View>
      <View style={styles.serviceItemCopy}>
        <Text style={styles.serviceItemTitle}>{title}</Text>
        <Text style={styles.serviceItemBody}>{body}</Text>
      </View>
    </View>
  );
};

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
};

const SheetPrimaryButton = ({
  title,
  onPress,
  disabled = false,
}: ButtonProps) => {
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

const SheetSecondaryButton = ({title, onPress}: ButtonProps) => {
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
  safeArea: {
    flex: 1,
    backgroundColor: assuranceColors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: assuranceColors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 118,
  },
  header: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  brandWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 54,
    height: 54,
    borderRadius: assuranceRadius.sm,
  },
  brandName: {
    marginLeft: 14,
    color: assuranceColors.primary,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '800',
  },
  roundIconButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: assuranceColors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: {
    minHeight: 250,
    marginTop: 14,
    paddingHorizontal: 28,
    paddingVertical: 28,
    borderRadius: 30,
    backgroundColor: assuranceColors.primary,
    overflow: 'hidden',
    ...assuranceShadow.hero,
  },
  heroGlow: {
    position: 'absolute',
    left: -78,
    top: 34,
    width: 290,
    height: 190,
    borderRadius: 145,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  heroGradient: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '55%',
    backgroundColor: 'rgba(10, 32, 74, 0.22)',
  },
  buildingRoof: {
    position: 'absolute',
    right: 30,
    top: 98,
    width: 158,
    height: 82,
    backgroundColor: 'rgba(255,255,255,0.10)',
    transform: [{skewY: '-21deg'}],
  },
  buildingBeam: {
    position: 'absolute',
    right: 24,
    top: 160,
    width: 196,
    height: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  buildingBase: {
    position: 'absolute',
    right: 18,
    bottom: 36,
    width: 214,
    height: 18,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  pillarRow: {
    position: 'absolute',
    right: 64,
    bottom: 56,
    width: 132,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pillar: {
    width: 22,
    height: 78,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  heroTitle: {
    color: assuranceColors.white,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    marginTop: 26,
    maxWidth: 270,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.84)',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
    maxWidth: 290,
  },
  assuranceBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 26,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: assuranceRadius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  badgeText: {
    color: assuranceColors.white,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 10,
  },
  bodySection: {
    marginTop: 24,
  },
  noticeCard: {
    padding: 24,
    borderRadius: 26,
    backgroundColor: assuranceColors.surface,
    flexDirection: 'row',
    ...assuranceShadow.card,
  },
  noticeIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: assuranceColors.accentSoft,
  },
  noticeCopy: {
    flex: 1,
    marginLeft: 16,
  },
  noticeTitle: {
    color: assuranceColors.text,
    fontSize: 22,
    lineHeight: 30,
    fontWeight: '800',
  },
  noticeBody: {
    color: assuranceColors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
  },
  primarySmallButton: {
    alignSelf: 'flex-start',
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: assuranceRadius.pill,
    backgroundColor: assuranceColors.primary,
  },
  primarySmallButtonText: {
    color: assuranceColors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  readyCard: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#ECF6F0',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#D7EBDD',
  },
  readyIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DFF2E6',
  },
  readyCopy: {
    flex: 1,
    marginLeft: 14,
  },
  readyTitle: {
    color: '#1C5637',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  readyBody: {
    color: '#35674A',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
  actionCard: {
    flex: 1,
    minHeight: 222,
    borderRadius: 28,
    backgroundColor: assuranceColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    ...assuranceShadow.card,
  },
  actionCardDisabled: {
    opacity: 0.72,
  },
  actionIcon: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: assuranceColors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  actionTitle: {
    color: assuranceColors.text,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  actionSubtitle: {
    color: '#748299',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },
  bottomNav: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 18,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderColor: assuranceColors.borderSoft,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    ...assuranceShadow.floating,
  },
  navItem: {
    minWidth: 92,
    height: 48,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  navItemActive: {
    backgroundColor: assuranceColors.backgroundMuted,
  },
  navIconWrap: {
    marginRight: 8,
  },
  navLabel: {
    color: '#8A96A8',
    fontSize: 13,
    fontWeight: '700',
  },
  navLabelActive: {
    color: assuranceColors.primary,
  },
  modalShell: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: assuranceColors.overlay,
  },
  sheetCard: {
    backgroundColor: assuranceColors.surface,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 34,
  },
  sheetTitle: {
    color: assuranceColors.text,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
  },
  sheetSubtitle: {
    color: assuranceColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
  },
  meetingInput: {
    height: 70,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: assuranceColors.border,
    backgroundColor: assuranceColors.surfaceMuted,
    marginTop: 24,
    paddingHorizontal: 22,
    color: assuranceColors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  meetingNumberBox: {
    minHeight: 96,
    borderRadius: 22,
    backgroundColor: assuranceColors.surfaceMuted,
    borderWidth: 1,
    borderColor: assuranceColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  meetingNumberLabel: {
    color: assuranceColors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  meetingNumberText: {
    color: assuranceColors.primary,
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '900',
    marginTop: 6,
  },
  sheetActions: {
    flexDirection: 'row',
    gap: 14,
    marginTop: 24,
  },
  secondaryButton: {
    flex: 1,
    height: 58,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: assuranceColors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: assuranceColors.surface,
  },
  secondaryButtonText: {
    color: '#425168',
    fontSize: 16,
    fontWeight: '800',
  },
  primaryButton: {
    flex: 1,
    height: 58,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: assuranceColors.primary,
  },
  primaryButtonDisabled: {
    backgroundColor: '#AFC0D8',
  },
  primaryButtonText: {
    color: assuranceColors.white,
    fontSize: 16,
    fontWeight: '800',
  },
  serviceList: {
    marginTop: 22,
    gap: 14,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 18,
    borderRadius: 20,
    backgroundColor: assuranceColors.surfaceMuted,
    borderWidth: 1,
    borderColor: assuranceColors.borderSoft,
  },
  serviceItemIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: assuranceColors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceItemCopy: {
    flex: 1,
    marginLeft: 14,
  },
  serviceItemTitle: {
    color: assuranceColors.text,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '800',
  },
  serviceItemBody: {
    color: assuranceColors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 6,
  },
  pressed: {
    transform: [{scale: 0.98}],
    opacity: 0.9,
  },
});
