import {ImageSourcePropType} from 'react-native';

export const assuranceColors = {
  background: '#F8FAFC',
  backgroundMuted: '#EEF3FB',
  surface: '#FFFFFF',
  surfaceMuted: '#F5F8FC',
  border: '#DDE5F0',
  borderSoft: '#E8EEF7',
  text: '#0F2748',
  textSecondary: '#627086',
  textTertiary: '#8998AC',
  primary: '#1E56A0',
  primaryStrong: '#143E79',
  primarySoft: '#D9E8FA',
  accent: '#D4AF37',
  accentSoft: '#F6F0DA',
  success: '#2C7C4F',
  overlay: 'rgba(15, 39, 72, 0.48)',
  overlayDark: 'rgba(6, 21, 43, 0.76)',
  white: '#FFFFFF',
} as const;

export const assuranceRadius = {
  sm: 8,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const assuranceShadow = {
  card: {
    shadowColor: '#163F75',
    shadowOffset: {width: 0, height: 12},
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  hero: {
    shadowColor: '#163F75',
    shadowOffset: {width: 0, height: 18},
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 8,
  },
  floating: {
    shadowColor: '#163F75',
    shadowOffset: {width: 0, height: 14},
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

export const appVersion = '1.0.0';

export const appLogoSource: ImageSourcePropType = require('../assets/app-logo.png');
