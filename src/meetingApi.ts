import {LIVEKIT_TOKEN_SERVICE_URL} from './livekitDefaults';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import {appVersion} from './ui/brand';

export type MeetingTokenResponse = {
  meetingNumber: string;
  roomName: string;
  serverUrl: string;
  region?: string;
  token: string;
};

type CreateMeetingRequest = {
  displayName?: string;
  preferredRegion?: 'hk' | 'sg' | 'cn';
  audienceRegion?: 'china' | 'sea';
};

type JoinMeetingRequest = {
  meetingNumber: string;
  displayName?: string;
};

type HostLoginRequest = {
  username: string;
  password: string;
};

export type HostLoginResponse = {
  token: string;
  account: {
    id: number;
    username: string;
    displayName: string;
    role: string;
    maxDevices: number;
  };
  device: {
    id: number;
    status: string;
    deviceUid?: string;
  };
};

export {LIVEKIT_TOKEN_SERVICE_URL};

export const ACCOUNT_KEY = 'hostAccount';
export const AUTH_TOKEN_KEY = 'hostAuthToken';
export const DEVICE_UID_KEY = 'deviceUid';

export type DeviceInfo = {
  deviceUid: string;
  platform: 'ios' | 'android' | 'unknown';
  deviceName: string;
  appVersion: string;
};

const getDeviceUid = async () => {
  const existing = await AsyncStorage.getItem(DEVICE_UID_KEY);
  if (existing) {
    return existing;
  }

  const generated = `rn-${Platform.OS}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 12)}`;
  await AsyncStorage.setItem(DEVICE_UID_KEY, generated);
  return generated;
};

export const getCurrentDeviceInfo = async (): Promise<DeviceInfo> => ({
  deviceUid: await getDeviceUid(),
  platform:
    Platform.OS === 'ios' || Platform.OS === 'android'
      ? Platform.OS
      : 'unknown',
  deviceName: Platform.OS === 'ios' ? 'iPhone' : 'Android',
  appVersion,
});

const requestMeetingToken = async <T>(
  path: string,
  body: Record<string, string | undefined>,
  useAuth = false,
): Promise<T> => {
  const token = useAuth ? await AsyncStorage.getItem(AUTH_TOKEN_KEY) : null;
  const response = await fetch(`${LIVEKIT_TOKEN_SERVICE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? {Authorization: `Bearer ${token}`} : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || '会议服务暂时不可用');
  }

  return data as T;
};

export const loginHostAccount = async (body: HostLoginRequest) => {
  const response = await fetch(`${LIVEKIT_TOKEN_SERVICE_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...body,
      ...(await getCurrentDeviceInfo()),
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.message || '登录失败');
  }

  const loginResponse = data as HostLoginResponse;
  await AsyncStorage.multiSet([
    [AUTH_TOKEN_KEY, loginResponse.token],
    [ACCOUNT_KEY, loginResponse.account.username],
  ]);

  return loginResponse;
};

export const logoutHostAccount = async () => {
  await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, ACCOUNT_KEY]);
};

export const createMeeting = async (body: CreateMeetingRequest) =>
  requestMeetingToken<MeetingTokenResponse>(
    '/api/meetings/create',
    {
      ...body,
      ...(await getCurrentDeviceInfo()),
    },
    true,
  );

export const joinMeeting = (body: JoinMeetingRequest) =>
  requestMeetingToken<MeetingTokenResponse>('/api/meetings/join', body);
