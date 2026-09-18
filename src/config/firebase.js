import { initializeApp } from 'firebase/app';
import {
  initializeAuth,
  browserLocalPersistence,
} from 'firebase/auth';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyC6ne3Z7NdBj0iVT4j6Jx-p6erDFp1Vw0M",
  authDomain: "caresenseai-1953b.firebaseapp.com",
  projectId: "caresenseai-1953b",
  storageBucket: "caresenseai-1953b.firebasestorage.app",
  messagingSenderId: "289681245499",
  appId: "1:289681245499:web:5cf65b29f8da31fea4631e",
  measurementId: "G-3CZFJ73MKJ"
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