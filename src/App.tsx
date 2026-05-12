import * as React from 'react';

import {DefaultTheme, NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {AccountPage} from './AccountPage';
import {PreJoinPage} from './PreJoinPage';
import {RoomPage} from './RoomPage';
import Toast from 'react-native-toast-message';

export type RootStackParamList = {
  HomePage: undefined;
  AccountPage: undefined;
  RoomPage: {url: string; token: string; role: 'host' | 'participant'};
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const assuranceTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#F8FAFC',
    card: '#FFFFFF',
    primary: '#1E56A0',
    text: '#0F2748',
    border: '#E6ECF5',
  },
};

export default function App() {
  return (
    <>
      <NavigationContainer theme={assuranceTheme}>
        <Stack.Navigator screenOptions={{headerShown: false}}>
          <Stack.Screen name="HomePage" component={PreJoinPage} />
          <Stack.Screen name="AccountPage" component={AccountPage} />
          <Stack.Screen name="RoomPage" component={RoomPage} />
        </Stack.Navigator>
      </NavigationContainer>
      <Toast />
    </>
  );
}
