import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// TODO: Replace with your actual Firebase project configuration
// You can get this from your Firebase Console > Project Settings > General > Your Apps
const firebaseConfig = {
  apiKey: "AIzaSyBODX7DXq1gQQHrmCHKtmIGG57UJjylxks",
  authDomain: "caresenseai-4b558.firebaseapp.com",
  projectId: "caresenseai-4b558",
  storageBucket: "caresenseai-4b558.firebasestorage.app",
  messagingSenderId: "1007381516985",
  appId: "1:1007381516985:web:5b39e5e614416158820168",
  measurementId: "G-T2RZKS8V9W"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence so the user stays logged in
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export { app, auth };
