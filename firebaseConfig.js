// firebaseConfig.js (Final stable version with Persistence)

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app"; // Added getApp
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth
} from "firebase/auth";

// Project config (Keep your actual values here)
const firebaseConfig = {
  apiKey: "AIzaSyBODX7DXq1gQQHrmCHKtmIGG57UJjylxks",
  authDomain: "caresenseai-4b558.firebaseapp.com",
  projectId: "caresenseai-4b558",
  storageBucket: "caresenseai-4b558.firebasestorage.app",
  messagingSenderId: "1007381516985",
  appId: "1:1007381516985:web:5b39e5e614416158820168",
  measurementId: "G-T2RZKS8V9W"
};

// 1. Initialize Firebase App (only if it hasn't been initialized yet)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// 2. CRITICAL FIX: Initialize Auth with AsyncStorage persistence, but only if the Auth service hasn't been created yet.
// We use a try/catch block because initializeAuth throws the "already-initialized" error if it runs more than once.
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  // If it's already initialized, we grab the existing service instance.
  if (error.code === 'auth/already-initialized') {
    auth = getAuth(app);
  } else {
    console.error("Fatal Auth Initialization Error:", error);
    throw error;
  }
}

// Export the stable, initialized auth service
export { app, auth };

