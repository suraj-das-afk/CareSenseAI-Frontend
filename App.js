import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from './src/context/AuthContext';
import { PopupProvider } from './src/context/PopupContext';
import AppPopup from './src/components/AppPopup';
import AppNavigator from './src/navigation/AppNavigator';

// Keep the splash screen visible while we load things
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  useEffect(() => {
    // Hide the splash screen after the root component mounts
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <PopupProvider>
        <NavigationContainer>
          <AppNavigator />
          <AppPopup />
        </NavigationContainer>
      </PopupProvider>
    </AuthProvider>
  );
}
