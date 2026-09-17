import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { AuthContext, AuthProvider } from './src/context/AuthContext';
import { PopupProvider } from './src/context/PopupContext';
import AppPopup from './src/components/AppPopup';
import AnimatedSplashScreen from './src/components/AnimatedSplashScreen';
import AppNavigator from './src/navigation/AppNavigator';

// Keep Expo's native splash visible only until React has mounted.
// The animated React splash will then take over.
SplashScreen.preventAutoHideAsync().catch(() => {});

function AppContent() {
  const { loading } = useContext(AuthContext);
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);

  useEffect(() => {
    // IMPORTANT:
    // Do not wait for the custom animation to finish before hiding
    // Expo's native splash. Otherwise the native splash covers the
    // entire animation and the animation appears to never run.
    const hideNativeSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        console.warn('Native splash hide warning:', error);
      }
    };

    hideNativeSplash();
  }, []);

  return (
    <NavigationContainer>
      <AppNavigator />
      <AppPopup />

      {showAnimatedSplash && (
        <AnimatedSplashScreen
          ready={!loading}
          onFinish={() => setShowAnimatedSplash(false)}
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
