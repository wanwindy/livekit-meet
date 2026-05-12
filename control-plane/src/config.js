import dotenv from 'dotenv';

dotenv.config();

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBool = (value, fallback = false) => {
  if (value == null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 17882),
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://127.0.0.1:17882',
  jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  autoMigrate: toBool(process.env.AUTO_MIGRATE, false),
  mysql: {
    host: process.env.MYSQL_HOST || '127.0.0.1',
    port: toInt(process.env.MYSQL_PORT, 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'livekit_control',
    connectionLimit: toInt(process.env.MYSQL_CONNECTION_LIMIT, 10),
  },
  livekit: {
    apiKey: process.env.LIVEKIT_API_KEY || '',
    apiSecret: process.env.LIVEKIT_API_SECRET || '',
    defaultRegion: process.env.LIVEKIT_DEFAULT_REGION || 'hk',
    regionSignals: {
      hk: process.env.LIVEKIT_SIGNAL_HK || 'wss://fangxinbanmeet.com',
      sg: process.env.LIVEKIT_SIGNAL_SG || '',
      cn: process.env.LIVEKIT_SIGNAL_CN || '',
    },
  },
  bootstrapAdmin: {
    username: process.env.ADMIN_BOOTSTRAP_USERNAME || '',
    password: process.env.ADMIN_BOOTSTRAP_PASSWORD || '',
    displayName: process.env.ADMIN_BOOTSTRAP_DISPLAY_NAME || 'System Admin',
  },
};

export const isProduction = config.env === 'production';

