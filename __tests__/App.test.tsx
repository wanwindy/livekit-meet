/**
 * @format
 */

import 'react-native';
import React from 'react';

jest.mock('../src/PreJoinPage', () => {
  const ReactMock = require('react');
  const {Text} = require('react-native');

  return {
    PreJoinPage: () => ReactMock.createElement(Text, null, 'HomePage'),
  };
});

jest.mock('../src/AccountPage', () => {
  const ReactMock = require('react');
  const {Text} = require('react-native');

  return {
    AccountPage: () => ReactMock.createElement(Text, null, 'AccountPage'),
  };
});

jest.mock('../src/RoomPage', () => {
  const ReactMock = require('react');
  const {Text} = require('react-native');

  return {
    RoomPage: () => ReactMock.createElement(Text, null, 'RoomPage'),
  };
});

import App from '../src/App';

// Note: import explicitly to use the types shipped with jest.
import {it, jest} from '@jest/globals';

// Note: test renderer must be required after react-native.
import renderer from 'react-test-renderer';

it('renders correctly', () => {
  renderer.create(<App />);
});
