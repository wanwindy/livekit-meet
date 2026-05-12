/* eslint-env jest */

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('react-native-toast-message', () => ({
  __esModule: true,
  default: Object.assign(() => null, {
    show: jest.fn(),
    hide: jest.fn(),
  }),
}));

const ReactNative = require('react-native');

Object.defineProperty(ReactNative, 'BackHandler', {
  configurable: true,
  get: () => ({
    addEventListener: jest.fn(() => ({remove: jest.fn()})),
    removeEventListener: jest.fn(),
    exitApp: jest.fn(),
  }),
});

Object.defineProperty(ReactNative, 'Linking', {
  configurable: true,
  get: () => ({
    addEventListener: jest.fn(() => ({remove: jest.fn()})),
    getInitialURL: jest.fn(() => Promise.resolve(null)),
    openURL: jest.fn(),
  }),
});
