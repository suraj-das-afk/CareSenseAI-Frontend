import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthContext, AuthProvider } from './src/context/AuthContext';
import { PopupProvider } from './src/context/PopupContext';
import AppPopup from './src/components/AppPopup';
import AnimatedSplashScreen from './src/components/AnimatedSplashScreen';
import AppNavigator from './src/navigation/AppNavigator';

SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const [showAnimatedSplash, setShowAnimatedSplash] =
    useState(true);

  const {
    loading,
    user,
    profile,
  } = useContext(AuthContext);

  const appReady =
    !loading &&
    (
      !user ||
      Boolean(profile)
    );

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <NavigationContainer>
      <AppNavigator />
      <AppPopup />

      {showAnimatedSplash && (
        <AnimatedSplashScreen
          ready={appReady}
          onFinish={() =>
            setShowAnimatedSplash(false)
          }
        />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <PopupProvider>
        <AppContent />
      </PopupProvider>
    </AuthProvider>
  );
}
