import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  browserLocalPersistence,
} from 'firebase/auth';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBODX7DXq1gQQHrmCHKtmIGG57UJjylxks",
  authDomain: "caresenseai-4b558.firebaseapp.com",
  projectId: "caresenseai-4b558",
  storageBucket: "caresenseai-4b558.firebasestorage.app",
  messagingSenderId: "1007381516985",
  appId: "1:1007381516985:web:5b39e5e614416158820168",
  measurementId: "G-T2RZKS8V9W"
};

const app = initializeApp(firebaseConfig);

let auth;

if (Platform.OS === 'web') {
  // Browser persistence
  auth = initializeAuth(app, {
    persistence: browserLocalPersistence,
  });
} else {
  // React Native persistence
  const { getReactNativePersistence } = require('firebase/auth');

  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
}

export { app, auth };