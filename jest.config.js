module.exports = {
  preset: 'react-native',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '\\.(gif|jpg|jpeg|png|webp)$': '<rootDir>/__mocks__/fileMock.js',
  },
};
