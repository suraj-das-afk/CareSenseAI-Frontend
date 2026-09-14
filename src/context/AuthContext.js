import React, { createContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  updateProfile 
} from 'firebase/auth';
import { auth } from '../config/firebase';

const STORAGE_KEY = '@vitasync_user_settings_v2';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // App Preferences State
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState(true);
  const [isAppLocked, setIsAppLocked] = useState(false);

  // Initialize and load local storage settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedData = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedData !== null) {
          const parsed = JSON.parse(savedData);
          if (parsed.darkTheme !== undefined) setIsDarkMode(parsed.darkTheme);
          if (parsed.biometrics !== undefined) setIsBiometricsEnabled(parsed.biometrics);
        }
      } catch (e) {
        console.error('Failed to load storage settings:', e);
      }
    };
    loadSettings();
  }, []);

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          name: currentUser.displayName || 'User'
        });
        
        // Trigger biometric authentication check on user sign in / restart if enabled
        checkBiometricsOnLaunch();
      } else {
        setUser(null);
        setIsAppLocked(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Prompt Biometric Authentication
  const checkBiometricsOnLaunch = async () => {
    try {
      const savedData = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = savedData ? JSON.parse(savedData) : null;
      const biometricsActive = parsed?.biometrics !== undefined ? parsed.biometrics : isBiometricsEnabled;

      if (biometricsActive) {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (hasHardware && isEnrolled) {
          setIsAppLocked(true);
          const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate to access VitaSync Health',
            fallbackLabel: 'Use Device Passcode',
            cancelLabel: 'Cancel',
            disableDeviceFallback: false,
          });

          if (result.success) {
            setIsAppLocked(false);
          }
        }
      }
    } catch (e) {
      console.error('Biometric launch authentication error:', e);
    }
  };

  const authenticateBiometricsManually = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access VitaSync Health',
        fallbackLabel: 'Use Device Passcode',
        cancelLabel: 'Cancel',
      });
      if (result.success) {
        setIsAppLocked(false);
        return true;
      }
      return false;
    } catch (e) {
      console.error('Manual biometric error:', e);
      return false;
    }
  };

  const toggleGlobalTheme = async (value) => {
    setIsDarkMode(value);
    try {
      const existing = await AsyncStorage.getItem(STORAGE_KEY);
      const parsed = existing ? JSON.parse(existing) : {};
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, darkTheme: value }));
    } catch (e) {
      console.error('Failed to save theme setting:', e);
    }
  };

  const login = async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      console.error("Firebase Login Error:", error);
      throw error;
    }
  };

  const signup = async (name, email, password) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: name });
        setUser({
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          name: name
        });
      }
      return true;
    } catch (error) {
      console.error("Firebase Signup Error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      console.error("Firebase Logout Error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      signup, 
      logout,
      isDarkMode,
      toggleGlobalTheme,
      isAppLocked,
      authenticateBiometricsManually
    }}>
      {children}
    </AuthContext.Provider>
  );
};