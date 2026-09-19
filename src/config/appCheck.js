import { NativeModules } from 'react-native';

import { getApp } from '@react-native-firebase/app';
import {
  initializeAppCheck,
  ReactNativeFirebaseAppCheckProvider,
} from '@react-native-firebase/app-check';


/* ============================================================
   NATIVE APP CHECK MODULE
============================================================ */

const {
  CareSenseAppCheck,
} = NativeModules;


/* ============================================================
   APP CHECK STATE
============================================================ */

let appCheckInstance = null;

let initializationPromise = null;


/* ============================================================
   INITIALIZE RNFIREBASE APP CHECK
============================================================ */

const initializeCareSenseAppCheck =
  async () => {

    if (appCheckInstance) {
      return appCheckInstance;
    }


    if (initializationPromise) {
      return initializationPromise;
    }


    initializationPromise =
      (async () => {

        const configuredProvider =
          process.env
            .EXPO_PUBLIC_FIREBASE_APP_CHECK_PROVIDER;


        const providerName =
          configuredProvider ||
          (__DEV__
            ? 'debug'
            : 'playIntegrity');


        /*
         * Production reCAPTCHA Enterprise is initialized
         * natively in MainApplication.kt.
         *
         * Therefore we must NOT pass
         * "recaptchaEnterprise" into the RNFirebase
         * provider selector.
         */
        if (
          providerName ===
          'recaptchaEnterprise'
        ) {
          return null;
        }


        const provider =
          new ReactNativeFirebaseAppCheckProvider();


        const debugToken =
          providerName === 'debug'
            ? process.env
                .EXPO_PUBLIC_FIREBASE_APP_CHECK_DEBUG_TOKEN
            : undefined;


        if (
          providerName === 'debug' &&
          !debugToken
        ) {
          console.warn(
            'Firebase App Check debug token is missing.',
          );
        }


        console.log(
          `Firebase App Check provider: ${providerName}`,
        );


        provider.configure({
          android: {
            provider:
              providerName,

            ...(debugToken
              ? {
                  debugToken,
                }
              : {}),
          },
        });


        const instance =
          await initializeAppCheck(
            getApp(),
            {
              provider,

              isTokenAutoRefreshEnabled:
                true,
            },
          );


        appCheckInstance =
          instance;


        return instance;

      })();


    try {
      return await initializationPromise;

    } catch (error) {

      initializationPromise =
        null;

      throw error;
    }
  };


/* ============================================================
   GET APP CHECK TOKEN
============================================================ */

export const getAppCheckToken =
  async () => {

    try {

      const configuredProvider =
        process.env
          .EXPO_PUBLIC_FIREBASE_APP_CHECK_PROVIDER;


      const providerName =
        configuredProvider ||
        (__DEV__
          ? 'debug'
          : 'playIntegrity');


      /*
       * Production:
       *
       * Firebase native Android SDK initializes
       * reCAPTCHA Enterprise in MainApplication.kt.
       *
       * The native bridge then retrieves the
       * App Check token.
       */
      if (
        providerName ===
        'recaptchaEnterprise'
      ) {

        if (
          !CareSenseAppCheck ||
          typeof CareSenseAppCheck.getToken !==
            'function'
        ) {
          throw new Error(
            'Native CareSense App Check module is unavailable.',
          );
        }


        const token =
          await CareSenseAppCheck.getToken(
            false,
          );


        if (!token) {
          throw new Error(
            'Firebase App Check returned an empty token.',
          );
        }


        return token;
      }


      /*
       * Development / Preview:
       *
       * Continue using the existing RNFirebase
       * Debug App Check flow.
       */
      const appCheck =
        await initializeCareSenseAppCheck();


      if (!appCheck) {
        throw new Error(
          'Firebase App Check failed to initialize.',
        );
      }


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
