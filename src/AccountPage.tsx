import * as React from 'react';
import {useEffect, useState} from 'react';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

import {
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
  ACCOUNT_KEY,
  getCurrentDeviceInfo,
  loginHostAccount,
  logoutHostAccount,
  type DeviceInfo,
} from './meetingApi';
import {BackIcon, ShieldCheckIcon, UserIcon} from './ui/BrandIcons';
import {assuranceColors, assuranceShadow, appVersion} from './ui/brand';

export const AccountPage = ({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'AccountPage'>) => {
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [hostAccount, setHostAccount] = useState('');
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ACCOUNT_KEY).then(value => {
      if (value) {
        setHostAccount(value);
        setAccount(value);
      }
    });
    getCurrentDeviceInfo().then(setDeviceInfo);
  }, []);

  const login = async () => {
    const normalizedAccount = account.trim();

    if (!normalizedAccount || !password.trim()) {
      Toast.show({
        type: 'error',
        text1: '请输入账号和密码',
      });
      return;
    }

    try {
      const result = await loginHostAccount({
        username: normalizedAccount,
        password,
      });

      setHostAccount(normalizedAccount);
      setPassword('');
      Toast.show({
        type: 'success',
        text1: '主持人账号已登录',
        text2: `当前设备已绑定，最多可绑定 ${result.account.maxDevices} 台设备。`,
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: '登录失败',
        text2: error instanceof Error ? error.message : '请稍后再试',
      });
    }
  };

  const logout = () => {
    logoutHostAccount().then(() => {
      setHostAccount('');
      setAccount('');
      setPassword('');
      Toast.show({
        type: 'info',
        text1: '已解除账号绑定',
      });
    });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="返回首页"
            onPress={() => navigation.goBack()}
            style={({pressed}) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}>
            <BackIcon />
          </Pressable>
          <Text style={styles.headerTitle}>主持人账号</Text>
          <View style={styles.headerSpace} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <UserIcon size={38} color={assuranceColors.white} />
            </View>
            <Text style={styles.profileTitle}>
              {hostAccount ? hostAccount : '未登录账号'}
            </Text>
            <View style={styles.statusPill}>
              <ShieldCheckIcon
                size={18}
                color={
                  hostAccount
                    ? assuranceColors.primary
                    : assuranceColors.textSecondary
                }
              />
              <Text
                style={[
                  styles.statusText,
                  !hostAccount && styles.statusTextIdle,
                ]}>
                {hostAccount ? '已绑定' : '未登录'}
              </Text>
            </View>
            <Text style={styles.profileDesc}>
              只有主持人创建会议时需要登录。首次登录时，后端会自动将当前设备绑定到该账号。
            </Text>
            <View
              style={[
                styles.deviceBadge,
                !hostAccount && styles.deviceBadgeIdle,
              ]}>
              <Text
                style={[
                  styles.deviceBadgeText,
                  !hostAccount && styles.deviceBadgeTextIdle,
                ]}>
                {hostAccount ? '当前设备已授权' : '尚未绑定账号'}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>主持人账号登录</Text>
            <TextInput
              value={account}
              onChangeText={setAccount}
              placeholder="请输入账号"
              placeholderTextColor={assuranceColors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="请输入密码"
              placeholderTextColor={assuranceColors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={true}
              style={styles.input}
            />
            <Pressable
              onPress={login}
              style={({pressed}) => [
                styles.primaryButton,
                pressed && styles.pressed,
              ]}>
              <Text style={styles.primaryButtonText}>登录账号</Text>
            </Pressable>
            {hostAccount ? (
              <Pressable
                onPress={logout}
                style={({pressed}) => [
                  styles.linkButton,
                  pressed && styles.pressed,
                ]}>
                <Text style={styles.linkButtonText}>解除当前账号绑定</Text>
              </Pressable>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>当前设备信息</Text>
            <InfoRow
              label="设备名称"
              value={deviceInfo?.deviceName || 'iPhone'}
            />
            <InfoRow
              label="平台"
              value={
                deviceInfo?.platform === 'ios'
                  ? 'iOS'
                  : deviceInfo?.platform === 'android'
                  ? 'Android'
                  : 'Unknown'
              }
            />
            <InfoRow
              label="App 版本"
              value={deviceInfo?.appVersion || appVersion}
            />
            <InfoRow
              label="deviceId"
              value={deviceInfo?.deviceUid || '尚未生成'}
              last={true}
            />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

type InfoRowProps = {
  label: string;
  value: string;
  last?: boolean;
};

const InfoRow = ({label, value, last = false}: InfoRowProps) => {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  header: {
    minHeight: 84,
    paddingHorizontal: 20,
    backgroundColor: assuranceColors.surface,
    borderBottomWidth: 1,
    borderBottomColor: assuranceColors.borderSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: assuranceColors.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: assuranceColors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  headerSpace: {
    width: 48,
  },
  content: {
    padding: 20,
    paddingBottom: 42,
  },
  profileCard: {
    backgroundColor: assuranceColors.surface,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    ...assuranceShadow.card,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: assuranceColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTitle: {
    color: assuranceColors.text,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '800',
    marginTop: 22,
    textAlign: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: assuranceColors.backgroundMuted,
  },
  statusText: {
    color: assuranceColors.primary,
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 10,
  },
  statusTextIdle: {
    color: assuranceColors.textSecondary,
  },
  profileDesc: {
    color: assuranceColors.textSecondary,
    fontSize: 16,
    lineHeight: 25,
    textAlign: 'center',
    marginTop: 22,
  },
  deviceBadge: {
    marginTop: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#E8F1FF',
  },
  deviceBadgeIdle: {
    backgroundColor: assuranceColors.surfaceMuted,
  },
  deviceBadgeText: {
    color: assuranceColors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  deviceBadgeTextIdle: {
    color: assuranceColors.textSecondary,
  },
  card: {
    marginTop: 24,
    backgroundColor: assuranceColors.surface,
    borderRadius: 28,
    padding: 22,
    ...assuranceShadow.card,
  },
  sectionTitle: {
    color: assuranceColors.text,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    marginBottom: 18,
  },
  input: {
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: assuranceColors.border,
    backgroundColor: assuranceColors.surfaceMuted,
    paddingHorizontal: 20,
    color: assuranceColors.text,
    fontSize: 18,
    marginBottom: 16,
  },
  primaryButton: {
    height: 64,
    borderRadius: 20,
    backgroundColor: assuranceColors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    color: assuranceColors.white,
    fontSize: 18,
    fontWeight: '800',
  },
  linkButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 18,
    paddingBottom: 6,
  },
  linkButtonText: {
    color: assuranceColors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  infoRow: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F8',
  },
  infoRowLast: {
    borderBottomWidth: 0,
  },
  infoLabel: {
    color: '#6C798D',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  infoValue: {
    color: '#253650',
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '500',
  },
  pressed: {
    transform: [{scale: 0.98}],
    opacity: 0.9,
  },
});
