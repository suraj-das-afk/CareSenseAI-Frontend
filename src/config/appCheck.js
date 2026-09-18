import { getApp } from '@react-native-firebase/app';
import {
  initializeAppCheck,
  ReactNativeFirebaseAppCheckProvider,
} from '@react-native-firebase/app-check';

let appCheckInstance = null;
let initializationPromise = null;

const initializeCareSenseAppCheck = async () => {
  if (appCheckInstance) {
    return appCheckInstance;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const provider =
      new ReactNativeFirebaseAppCheckProvider();

    const providerName = __DEV__
      ? 'debug'
      : 'playIntegrity';

    console.log(
      `Firebase App Check provider: ${providerName}`,
    );

    provider.configure({
      android: {
        provider: providerName,
      },
    });

    const instance =
      await initializeAppCheck(
        getApp(),
        {
          provider,
          isTokenAutoRefreshEnabled: true,
        },
      );

    appCheckInstance = instance;

    return instance;
  })();

  try {
    return await initializationPromise;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
};

export const getAppCheckToken = async () => {
  try {
    const appCheck =
      await initializeCareSenseAppCheck();

    const { token } =
      await appCheck.getToken(false);

    if (!token) {
      throw new Error(
        'Firebase App Check returned an empty token.',
      );
    }

    return token;
  } catch (error) {
    console.error(
      'Firebase App Check Error:',
      error,
    );

    throw error;
  }
};