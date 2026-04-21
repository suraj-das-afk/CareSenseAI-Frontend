import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SystemUI from 'expo-system-ui';
import AppNavigator from './src/navigation/AppNavigator';
import { PopupProvider } from "./src/contexts/PopupContext";

export default function App() {
  // ✅ Set system navigation bar background color once
  useEffect(() => {
    SystemUI.setBackgroundColorAsync('#F5F8FC'); // your preferred color
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <PopupProvider>
          <AppNavigator />
        </PopupProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}