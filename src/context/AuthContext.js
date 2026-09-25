import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';

import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  getAdditionalUserInfo,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
} from 'firebase/auth';

import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

import { auth } from '../config/firebase';

import {
  getUserProfile,
  updateUserProfile,
  clearRecordsCache,
  clearDashboardCache,
} from '../services/api';


/* ============================================================
   STORAGE
============================================================ */

const STORAGE_KEY = '@caresense_user_settings_v2';

const PROFILE_ROUTING_CACHE_PREFIX =
  '@caresense_profile_routing_v1:';

const getProfileRoutingCacheKey = uid =>
  `${PROFILE_ROUTING_CACHE_PREFIX}${uid}`;

const readProfileRoutingCache = async uid => {
  if (!uid) {
    return null;
  }

  try {
    const raw =
      await AsyncStorage.getItem(
        getProfileRoutingCacheKey(uid)
      );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    if (
      !parsed ||
      typeof parsed !== 'object'
    ) {
      return null;
    }

    return {
      onboarding_completed:
        parsed.onboarding_completed === true,
    };
  } catch (error) {
    console.warn(
      'Unable to read profile routing cache:',
      error
    );

    return null;
  }
};

const writeProfileRoutingCache =
  async (uid, profileData) => {
    if (!uid || !profileData) {
      return;
    }

    try {
      await AsyncStorage.setItem(
        getProfileRoutingCacheKey(uid),
        JSON.stringify({
          onboarding_completed:
            profileData.onboarding_completed === true,
          cachedAt: Date.now(),
        })
      );
    } catch (error) {
      console.warn(
        'Unable to cache profile routing state:',
        error
      );
    }
  };


/* ============================================================
   CONTEXT
============================================================ */

export const AuthContext = createContext(null);


/* ============================================================
   PROVIDER
============================================================ */

export const AuthProvider = ({ children }) => {


  useEffect(() => {
  GoogleSignin.configure({
    webClientId:
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,

      offlineAccess: false,
    });
  }, []);

  /* ==========================================================
     SYSTEM / THEME
  ========================================================== */

  const systemColorScheme = useColorScheme();

  // Device appearance is the single source of truth for CareSense theme.
  // There is intentionally no app-level light/dark override.
  const isDarkMode =
    systemColorScheme === 'dark';


  /* ==========================================================
     AUTH STATE
  ========================================================== */

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);


  /* ==========================================================
     BACKEND PROFILE STATE
  ========================================================== */

  const [profile, setProfile] = useState(null);

  const [profileLoading, setProfileLoading] = useState(false);

  const [profileError, setProfileError] = useState(null);


  /* ==========================================================
     BIOMETRIC STATE
  ========================================================== */

  const [isBiometricsEnabled, setIsBiometricsEnabled] =
    useState(false);

  const [passwordLockEnabled, setPasswordLockEnabled] =
    useState(false);

  const [isAppLocked, setIsAppLocked] =
    useState(false);


  /* ==========================================================
     INTERNAL REFS
  ========================================================== */

  /*
   * Prevents duplicate biometric prompts when Firebase
   * fires auth state updates more than once.
   */
  const biometricCheckedForUser = useRef(null);

  /*
   * Prevents state updates after a component/provider
   * lifecycle has changed.
   */
  const mountedRef = useRef(true);

  /*
   * Tracks the intent of an interactive Google flow.
   * While this is active, the auth-state listener waits
   * for the flow to decide whether the account is allowed.
   */
  const googleAuthFlowRef = useRef(null);

  /*
   * Email/password flows temporarily suppress the global
   * unverified-session guard while Firebase finishes the
   * interactive sign-in or signup operation.
   */
  const emailLoginFlowRef = useRef(false);
  const emailSignupFlowRef = useRef(false);


  /* ==========================================================
     SAFE MOUNT TRACKING
  ========================================================== */

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);


  /* ==========================================================
     LOCAL SETTINGS
  ========================================================== */

  useEffect(() => {

    const loadSettings = async () => {
      try {
        const savedData =
          await AsyncStorage.getItem(STORAGE_KEY);

        if (!savedData) {
          return;
        }

        const parsed = JSON.parse(savedData);

        if (
          parsed &&
          typeof parsed.biometrics === 'boolean'
        ) {
          setIsBiometricsEnabled(parsed.biometrics);
        }

        if (
          parsed &&
          typeof parsed.passwordLock === 'boolean'
        ) {
          setPasswordLockEnabled(parsed.passwordLock);
        }

      } catch (error) {
        console.error(
          'Failed to load CareSense settings:',
          error
        );
      }
    };

    void loadSettings();

  }, []);


  /* ==========================================================
     PROFILE: BUILD FIREBASE FALLBACK
  ========================================================== */

  const buildFirebaseFallbackProfile = useCallback(
    firebaseUser => {

      if (!firebaseUser) {
        return null;
      }

      const displayName =
        firebaseUser.displayName?.trim() || '';

      const nameParts =
        displayName
          ? displayName.split(/\s+/)
          : [];

      const firstName =
        nameParts[0] || '';

      const lastName =
        nameParts.slice(1).join(' ') || '';

      return {
        firebase_uid: firebaseUser.uid,

        email: firebaseUser.email || '',

        first_name: firstName,

        last_name: lastName,

        profile_photo_url:
          firebaseUser.photoURL || null,

        date_of_birth: null,

        gender: '',

        height_cm: null,

        weight_kg: null,

        blood_type: '',

        medical_conditions: '',

        current_medications: '',

        allergies: '',

        emergency_contact_name: '',

        emergency_contact_phone: '',

        emergency_contact_relation: '',

        onboarding_completed: false,
      };
    },
    []
  );


  /* ==========================================================
     PROFILE: LOAD FROM BACKEND
  ========================================================== */

  const refreshProfile = useCallback(async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      if (mountedRef.current) {
        setProfile(null);
        setProfileError(null);
        setProfileLoading(false);
      }

      return null;
    }

    if (mountedRef.current) {
      setProfileLoading(true);
      setProfileError(null);
    }

    /*
    * Load only the cached routing state first.
    *
    * This allows an already-known user to reach the correct
    * part of the application even when the backend is offline.
    */
    const cachedRouting =
      await readProfileRoutingCache(
        currentUser.uid
      );

    if (
      cachedRouting &&
      mountedRef.current
    ) {
      const cachedProfile =
        buildFirebaseFallbackProfile(
          currentUser
        );

      cachedProfile.onboarding_completed =
        cachedRouting.onboarding_completed;

      setProfile(cachedProfile);
    }

    try {
      const backendProfile =
        await getUserProfile();

      if (!mountedRef.current) {
        return backendProfile;
      }

      const fallbackProfile =
        buildFirebaseFallbackProfile(
          currentUser
        );

      const mergedProfile = {
        ...fallbackProfile,
        ...backendProfile,

        profile_photo_url:
          backendProfile?.profile_photo_url ||
          currentUser.photoURL ||
          null,

        email:
          backendProfile?.email ||
          currentUser.email ||
          '',
      };

      setProfile(mergedProfile);

      /*
      * Store only the routing state locally.
      */
      await writeProfileRoutingCache(
        currentUser.uid,
        mergedProfile
      );

      return mergedProfile;

    } catch (error) {
      const status =
        error?.response?.status;

      /*
      * 404 means the authenticated Firebase user
      * does not have a CareSense backend profile yet.
      *
      * This is a real onboarding case and should NOT
      * be treated as an offline failure.
      */
      if (status === 404) {
        const newProfile =
          buildFirebaseFallbackProfile(
            currentUser
          );

        if (mountedRef.current) {
          setProfile(newProfile);
          setProfileError(null);
        }

        return newProfile;
      }

      /*
      * Network / backend outage:
      *
      * Keep the cached onboarding state when we have it.
      */
      if (cachedRouting) {
        const offlineProfile =
          buildFirebaseFallbackProfile(
            currentUser
          );

        offlineProfile.onboarding_completed =
          cachedRouting.onboarding_completed;

        if (mountedRef.current) {
          setProfile(offlineProfile);

          setProfileError(
            'CareSense is offline. Showing your last known app state.'
          );
        }

        return offlineProfile;
      }

      /*
      * No cached state means we genuinely cannot know
      * whether this account has completed onboarding.
      *
      * Do NOT send the user to onboarding here.
      */
      if (mountedRef.current) {
        setProfile(null);

        setProfileError(
          'Unable to connect to CareSense. Please connect to the internet and try again.'
        );
      }

      return null;

    } finally {
      if (mountedRef.current) {
        setProfileLoading(false);
      }
    }
  }, [buildFirebaseFallbackProfile]);


  /* ==========================================================
     PROFILE: UPDATE
  ========================================================== */

  const saveProfile = useCallback(
    async profileData => {

      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error(
          'Please sign in before updating your profile.'
        );
      }

      if (
        !profileData ||
        typeof profileData !== 'object'
      ) {
        throw new Error(
          'Invalid profile data.'
        );
      }

      if (mountedRef.current) {
        setProfileLoading(true);
        setProfileError(null);
      }

      try {

        const updatedProfile =
          await updateUserProfile(profileData);

        /*
         * Merge the response with the current in-memory
         * profile instead of replacing unrelated fields.
         */
        const nextProfile = {
          ...(profile || {}),
          ...(updatedProfile || {}),
        };

        await writeProfileRoutingCache(
          currentUser.uid,
          nextProfile
        );

        if (mountedRef.current) {
          setProfile(nextProfile);
        }

        return nextProfile;

      } catch (error) {

        console.error(
          'Failed to save CareSense profile:',
          error
        );

        if (mountedRef.current) {
          setProfileError(
            error?.response?.data ||
            error?.message ||
            'Unable to save your profile.'
          );
        }

        throw error;

      } finally {

        if (mountedRef.current) {
          setProfileLoading(false);
        }
      }

    },
    [profile]
  );


  /* ==========================================================
     BIOMETRIC AUTHENTICATION
  ========================================================== */

  const checkBiometricsOnLaunch = useCallback(
    async firebaseUser => {

      if (!firebaseUser?.uid) {
        return;
      }

      /*
       * Do not prompt multiple times for the same
       * authenticated Firebase session.
       */
      if (
        biometricCheckedForUser.current ===
        firebaseUser.uid
      ) {
        return;
      }

      biometricCheckedForUser.current =
        firebaseUser.uid;

      try {

        const savedData =
          await AsyncStorage.getItem(STORAGE_KEY);

        const parsed =
          savedData
            ? JSON.parse(savedData)
            : {};

        const biometricsActive =
          parsed?.biometrics === true;

        const passwordActive =
          parsed?.passwordLock === true &&
          typeof parsed?.appPasscode === 'string' &&
          parsed.appPasscode.length >= 4;

        /*
         * Keep state synchronized with storage.
         */
        if (mountedRef.current) {
          setIsBiometricsEnabled(
            biometricsActive
          );

          setPasswordLockEnabled(
            passwordActive
          );
        }

        if (!biometricsActive && !passwordActive) {
          if (mountedRef.current) {
            setIsAppLocked(false);
          }

          return;
        }

        if (!biometricsActive && passwordActive) {
          if (mountedRef.current) {
            setIsAppLocked(true);
          }

          return;
        }

        const hasHardware =
          await LocalAuthentication.hasHardwareAsync();

        const isEnrolled =
          await LocalAuthentication.isEnrolledAsync();

        if (
          !hasHardware ||
          !isEnrolled
        ) {
          if (mountedRef.current) {
            setIsAppLocked(false);
          }

          return;
        }

        if (mountedRef.current) {
          setIsAppLocked(true);
        }

        const result =
          await LocalAuthentication.authenticateAsync({
            promptMessage:
              'CareSense AI Protected',

            subtitle:
              'Authenticate to access CareSense AI',

            cancelLabel:
              'Cancel',

            fallbackLabel:
              'Enter password',

            disableDeviceFallback:
              false,
          });

        if (
          result.success &&
          mountedRef.current
        ) {
          setIsAppLocked(false);
        }

      } catch (error) {

        console.error(
          'Biometric launch authentication error:',
          error
        );

        /*
         * Fail closed while biometric protection is enabled.
         */
        if (
          mountedRef.current &&
          isBiometricsEnabled
        ) {
          setIsAppLocked(true);
        }
      }

    },
    [isBiometricsEnabled]
  );


  /* ==========================================================
     FIREBASE AUTH STATE
  ========================================================== */

  useEffect(() => {

    const unsubscribe =
      onAuthStateChanged(
        auth,
        async currentUser => {

          /*
           * User signed out.
           */
          if (!currentUser) {
            /*
            * Safety cleanup:
            * if Firebase becomes unauthenticated for any reason,
            * make sure no previous user's cached health data remains.
            */
            clearRecordsCache();
            clearDashboardCache();

            biometricCheckedForUser.current = null;

            if (mountedRef.current) {
              setUser(null);
              setProfile(null);
              setProfileError(null);
              setProfileLoading(false);
              setIsAppLocked(false);
            }

            setLoading(false);

            return;
          }

          /*
           * Email/password accounts must own the email address
           * before CareSense allows the authenticated session to
           * continue into the app. Google accounts are already
           * verified by their federated identity provider.
           */
          const isGoogleAccount =
            Array.isArray(currentUser.providerData) &&
            currentUser.providerData.some(
              provider =>
                provider?.providerId === 'google.com'
            );

          if (
            currentUser.email &&
            currentUser.emailVerified !== true &&
            !isGoogleAccount
          ) {
            if (
              emailLoginFlowRef.current ||
              emailSignupFlowRef.current
            ) {
              return;
            }
            try {
              await firebaseSignOut(auth);
            } catch (signOutError) {
              console.warn(
                'Unable to clear an unverified Firebase session:',
                signOutError
              );
            }

            clearRecordsCache();
            clearDashboardCache();

            biometricCheckedForUser.current = null;

            if (mountedRef.current) {
              setUser(null);
              setProfile(null);
              setProfileError(null);
              setProfileLoading(false);
              setIsAppLocked(false);
              setLoading(false);
            }

            return;
          }

          /*
           * Firebase user object.
           */
          const displayName =
            currentUser.displayName ||
            currentUser.email?.split('@')[0] ||
            'User';


          const firebaseUser = {
            uid: currentUser.uid,

            email:
              currentUser.email || '',

            name:
              displayName,

            displayName:
              currentUser.displayName || '',

            photoURL:
              currentUser.photoURL || null,

            emailVerified:
              currentUser.emailVerified === true,
          };


          if (mountedRef.current) {
            setUser(firebaseUser);
          }


          /*
           * Mark Firebase authentication as ready immediately.
           * Profile loading and biometric checks continue in the
           * background so Render/network delays can never trap the
           * entire application on a startup spinner.
           */
          if (mountedRef.current) {
            setLoading(false);
          }

          /*
           * Interactive Google login/signup decides whether this
           * Firebase identity is allowed for the requested flow.
           * Do not load backend profile data or trigger biometrics
           * until that decision has completed.
           */
          if (googleAuthFlowRef.current) {
            return;
          }

          void refreshProfile();
          void checkBiometricsOnLaunch(currentUser);
        }
      );

    return () => unsubscribe();

  }, [
    refreshProfile,
    checkBiometricsOnLaunch,
  ]);


  /* ==========================================================
     MANUAL BIOMETRIC AUTH
  ========================================================== */

  const authenticateBiometricsManually =
    useCallback(async () => {

      try {

        const hasHardware =
          await LocalAuthentication.hasHardwareAsync();

        if (!hasHardware) {
          return false;
        }

        const isEnrolled =
          await LocalAuthentication.isEnrolledAsync();

        if (!isEnrolled) {
          return false;
        }

        const result =
          await LocalAuthentication.authenticateAsync({
            promptMessage:
              'CareSense AI Protected',

            subtitle:
              'Authenticate to access CareSense AI',

            fallbackLabel:
              'Use Device Passcode',

            cancelLabel:
              'Cancel',
          });

        if (result.success) {

          if (mountedRef.current) {
            setIsAppLocked(false);
          }

          return true;
        }

        return false;

      } catch (error) {

        console.error(
          'Manual biometric authentication error:',
          error
        );

        return false;
      }

    }, []);


  /* ==========================================================
     TOGGLE BIOMETRICS
  ========================================================== */

  const toggleBiometrics =
    useCallback(async enabled => {

      try {

        /*
         * Turning OFF
         */
        if (!enabled) {

          setIsBiometricsEnabled(false);

          setIsAppLocked(false);

          const existing =
            await AsyncStorage.getItem(
              STORAGE_KEY
            );

          const parsed =
            existing
              ? JSON.parse(existing)
              : {};

          const passwordActive =
            parsed?.passwordLock === true &&
            typeof parsed?.appPasscode === 'string' &&
            parsed.appPasscode.length >= 4;

          setPasswordLockEnabled(passwordActive);

          await AsyncStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              ...parsed,
              biometrics: false,
            })
          );

          setIsAppLocked(passwordActive);

          return {
            success: true,
          };
        }


        /*
         * Turning ON
         */
        const hasHardware =
          await LocalAuthentication.hasHardwareAsync();

        if (!hasHardware) {

          return {
            success: false,

            message:
              'This device does not support biometric authentication.',
          };
        }


        const isEnrolled =
          await LocalAuthentication.isEnrolledAsync();

        if (!isEnrolled) {

          return {
            success: false,

            message:
              'No fingerprint or Face ID is enrolled on this device.',
          };
        }


        /*
         * Verify the user before enabling protection.
         */
        const result =
          await LocalAuthentication.authenticateAsync({
            promptMessage:
              'CareSense AI Protection',

            subtitle:
              'Verify your identity to enable biometric protection.',

            cancelLabel:
              'Cancel',

            fallbackLabel:
              'Use Device Passcode',

            disableDeviceFallback:
              false,
          });


        if (!result.success) {

          return {
            success: false,

            message:
              'Biometric verification was not completed. Protection remains off.',
          };
        }


        setIsBiometricsEnabled(true);

        setIsAppLocked(false);


        const existing =
          await AsyncStorage.getItem(
            STORAGE_KEY
          );

        const parsed =
          existing
            ? JSON.parse(existing)
            : {};


        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...parsed,
            biometrics: true,
          })
        );


        /*
         * Make sure a future Firebase auth event
         * doesn't trigger another prompt immediately.
         */
        if (auth.currentUser?.uid) {
          biometricCheckedForUser.current =
            auth.currentUser.uid;
        }


        return {
          success: true,
        };

      } catch (error) {

        console.error(
          'Failed to toggle biometric protection:',
          error
        );

        return {
          success: false,

          message:
            'Unable to change biometric protection right now.',
        };
      }

    }, []);


  /* ==========================================================
     PASSWORD / PIN LOCK
  ========================================================== */

  const enablePasswordLock =
    useCallback(async passcode => {
      const normalized = String(passcode || '').trim();

      if (normalized.length < 4) {
        return {
          success: false,
          message: 'Use at least 4 digits for the app PIN.',
        };
      }

      try {
        const existing =
          await AsyncStorage.getItem(STORAGE_KEY);

        const parsed =
          existing
            ? JSON.parse(existing)
            : {};

        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            ...parsed,
            passwordLock: true,
            appPasscode: normalized,
          })
        );

        setPasswordLockEnabled(true);
        setIsAppLocked(false);

        return {
          success: true,
        };
      } catch (error) {
        console.error(
          'Failed to enable password lock:',
          error
        );

        return {
          success: false,
          message: 'Unable to enable password lock right now.',
        };
      }
    }, []);

  const disablePasswordLock =
    useCallback(async passcode => {
      try {
        const existing =
          await AsyncStorage.getItem(STORAGE_KEY);

        const parsed =
          existing
            ? JSON.parse(existing)
            : {};

        if (
          parsed?.passwordLock !== true ||
          String(passcode || '') !==
            String(parsed?.appPasscode || '')
        ) {
          return {
            success: false,
            message: 'The current app PIN is incorrect.',
          };
        }

        const next = {
          ...parsed,
          passwordLock: false,
        };

        delete next.appPasscode;

        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(next)
        );

        setPasswordLockEnabled(false);

        return {
          success: true,
        };
      } catch (error) {
        console.error(
          'Failed to disable password lock:',
          error
        );

        return {
          success: false,
          message: 'Unable to disable password lock right now.',
        };
      }
    }, []);

  const verifyPasswordLock =
    useCallback(async passcode => {
      try {
        const existing =
          await AsyncStorage.getItem(STORAGE_KEY);

        const parsed =
          existing
            ? JSON.parse(existing)
            : {};

        if (
          parsed?.passwordLock !== true ||
          String(passcode || '') !==
            String(parsed?.appPasscode || '')
        ) {
          return {
            success: false,
            message: 'The PIN is incorrect.',
          };
        }

        if (mountedRef.current) {
          setIsAppLocked(false);
        }

        return {
          success: true,
        };
      } catch (error) {
        console.error(
          'Password lock verification error:',
          error
        );

        return {
          success: false,
          message: 'Unable to verify the app PIN right now.',
        };
      }
    }, []);


  /* ==========================================================
      GOOGLE AUTHENTICATION
    ========================================================== */

    const clearLocalAuthState = useCallback(() => {
      /*
      * Clear in-memory API caches first.
      *
      * This prevents health records or dashboard information
      * belonging to the previous Firebase account from remaining
      * available after logout/account switching.
      */
      clearRecordsCache();
      clearDashboardCache();

      biometricCheckedForUser.current = null;

      if (mountedRef.current) {
        setUser(null);
        setProfile(null);
        setProfileError(null);
        setProfileLoading(false);
        setIsAppLocked(false);
      }
    }, []);


  const googleAuth = useCallback(
    async intent => {
      googleAuthFlowRef.current = intent;

      try {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });

        /*
         * Clear the native Google Sign-In session before every
         * interactive authentication. This prevents Android from
         * silently reusing the previously selected Google account.
         * The Google account itself remains on the device, so the
         * next sign-in can still display the account chooser.
         */
        try {
          await GoogleSignin.signOut();
        } catch (signOutError) {
          if (
            signOutError?.code !==
            statusCodes.SIGN_IN_REQUIRED
          ) {
            console.warn(
              'Google native session could not be cleared before sign-in:',
              signOutError,
            );
          }
        }

        const response =
          await GoogleSignin.signIn();

        if (
          response?.type !==
          'success'
        ) {
          return false;
        }

        const idToken =
          response?.data?.idToken;

        if (!idToken) {
          throw new Error(
            'Google did not return an ID token.',
          );
        }

        const credential =
          GoogleAuthProvider.credential(
            idToken,
          );

        const userCredential =
          await signInWithCredential(
            auth,
            credential,
          );

        const additionalUserInfo =
          getAdditionalUserInfo(
            userCredential,
          );

        const isNewUser =
          additionalUserInfo?.isNewUser === true;

        /*
         * LOGIN is restricted to an existing CareSense account.
         * Firebase may create the Google identity when it is new,
         * so remove that just-created identity immediately.
         */
        if (
          intent === 'login' &&
          isNewUser
        ) {
          try {
            await userCredential.user.delete();
          } catch (deleteError) {
            console.error(
              'Unable to remove unregistered Google account after login attempt:',
              deleteError,
            );

            try {
              await firebaseSignOut(auth);
            } catch {
              // Best effort cleanup.
            }
          }

          try {
            await GoogleSignin.signOut();
          } catch {
            // Best effort cleanup.
          }

          clearLocalAuthState();

          const error =
            new Error(
              'No CareSense AI account exists for this Google account. Please use Sign Up first.',
            );

          error.code =
            'auth/google-account-not-found';

          throw error;
        }

        /*
         * SIGNUP is restricted to a brand-new Google identity.
         * Existing CareSense accounts must use Log In.
         */
        if (
          intent === 'signup' &&
          !isNewUser
        ) {
          try {
            await firebaseSignOut(auth);
          } catch {
            // Best effort cleanup.
          }

          try {
            await GoogleSignin.signOut();
          } catch {
            // Best effort cleanup.
          }

          clearLocalAuthState();

          const error =
            new Error(
              'That Google account already has a CareSense AI account. Please use Log In instead.',
            );

          error.code =
            'auth/google-account-already-exists';

          throw error;
        }

        /*
         * The selected Google account is valid for the requested
         * flow. Release the auth-flow guard before loading the
         * backend profile and biometric protection.
         */
        googleAuthFlowRef.current =
          null;

        await refreshProfile();

        await checkBiometricsOnLaunch(
          userCredential.user,
        );

        return true;

      } catch (error) {
        if (
          error?.code ===
          statusCodes.SIGN_IN_CANCELLED
        ) {
          return false;
        }

        if (
          error?.code ===
          statusCodes.IN_PROGRESS
        ) {
          throw new Error(
            'Google sign-in is already in progress.',
          );
        }

        if (
          error?.code ===
          statusCodes.PLAY_SERVICES_NOT_AVAILABLE
        ) {
          throw new Error(
            'Google Play Services is unavailable or needs updating.',
          );
        }

        console.error(
          'Google authentication error:',
          error,
        );

        throw error;
      } finally {
        googleAuthFlowRef.current =
          null;
      }
    },
    [
      refreshProfile,
      checkBiometricsOnLaunch,
      clearLocalAuthState,
    ],
  );


  const googleLogin =
    useCallback(
      async () =>
        googleAuth('login'),
      [googleAuth],
    );


  const googleSignup =
    useCallback(
      async () =>
        googleAuth('signup'),
      [googleAuth],
    );


  /* ==========================================================
     LOGIN
  ========================================================== */

  const login = useCallback(
    async (email, password) => {

      if (!email?.trim()) {
        throw new Error(
          'Please enter your email address.'
        );
      }

      if (!password) {
        throw new Error(
          'Please enter your password.'
        );
      }

      emailLoginFlowRef.current = true;

      try {

        const userCredential =
          await signInWithEmailAndPassword(
            auth,
            email.trim(),
            password
          );

        const firebaseUser =
          userCredential.user;

        if (
          firebaseUser &&
          firebaseUser.email &&
          firebaseUser.emailVerified !== true
        ) {
          let verificationEmailSent = false;

          try {
            await sendEmailVerification(
              firebaseUser
            );
            verificationEmailSent = true;
          } catch (verificationError) {
            console.warn(
              'Unable to resend verification email during login:',
              verificationError
            );
          }

          await firebaseSignOut(auth);

          const error =
            new Error(
              verificationEmailSent
                ? 'Please verify your email address before signing in.'
                : 'Your email address is not verified yet. Please verify it before signing in.'
            );

          error.code =
            'auth/email-not-verified';

          error.verificationEmailSent =
            verificationEmailSent;

          throw error;
        }

        return true;

      } catch (error) {

        console.error(
          'Firebase Login Error:',
          error
        );

        throw error;
      } finally {
        emailLoginFlowRef.current = false;
      }

    },
    []
  );


  /* ==========================================================
     SIGNUP
  ========================================================== */

  const signup = useCallback(
    async (name, email, password) => {

      if (!name?.trim()) {
        throw new Error(
          'Please enter your name.'
        );
      }

      if (!email?.trim()) {
        throw new Error(
          'Please enter your email address.'
        );
      }

      if (!password) {
        throw new Error(
          'Please enter a password.'
        );
      }

      emailSignupFlowRef.current = true;

      try {

        const userCredential =
          await createUserWithEmailAndPassword(
            auth,
            email.trim(),
            password
          );

        const firebaseUser =
          userCredential.user;


        if (firebaseUser) {

          /*
           * Save the Firebase display name.
           */
          await updateProfile(
            firebaseUser,
            {
              displayName:
                name.trim(),
            }
          );

          /*
           * Require ownership of the email address before
           * the account can enter the CareSense application.
           */
          try {
            await sendEmailVerification(
              firebaseUser
            );
          } catch (verificationError) {
            try {
              await firebaseSignOut(auth);
            } catch (signOutError) {
              console.warn(
                'Unable to sign out after verification email failure:',
                signOutError
              );
            }

            const error =
              new Error(
                'We could not send the verification email. Please try again.'
              );

            error.code =
              'auth/verification-email-failed';

            error.cause =
              verificationError;

            throw error;
          }

          /*
           * Do not create a backend health profile until the
           * email has been verified and the user successfully
           * signs in.
           */
          await firebaseSignOut(auth);

          return {
            requiresEmailVerification: true,
            email:
              firebaseUser.email ||
              email.trim(),
          };
        }

      } catch (error) {

        console.error(
          'Firebase Signup Error:',
          error
        );

        throw error;
      } finally {
        emailSignupFlowRef.current = false;
      }

    },
    []
  );


  /* ==========================================================
     LOGOUT
  ========================================================== */

  const logout = useCallback(async () => {

    try {

      /*
       * Clear the native Google session as well as Firebase.
       * This prevents the next Google authentication from
       * silently reusing the previous Google identity.
       */
      try {
        await GoogleSignin.signOut();
      } catch (googleError) {
        if (
          googleError?.code !==
          statusCodes.SIGN_IN_REQUIRED
        ) {
          console.warn(
            'Google logout cleanup warning:',
            googleError,
          );
        }
      }

      await firebaseSignOut(auth);

      googleAuthFlowRef.current =
        null;

      clearLocalAuthState();

    } catch (error) {

      console.error(
        'Firebase Logout Error:',
        error
      );

      throw error;
    }

  }, [clearLocalAuthState]);


  /* ==========================================================
     DERIVED PROFILE VALUES
  ========================================================== */

  const onboardingCompleted =
    profile?.onboarding_completed === true;


  const profilePhoto =
    profile?.profile_photo_url ||
    user?.photoURL ||
    null;


  const fullName =
    [
      profile?.first_name,
      profile?.last_name,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    user?.displayName ||
    user?.name ||
    user?.email?.split('@')[0] ||
    'User';


  /* ==========================================================
     CONTEXT VALUE
  ========================================================== */

  const contextValue = {
    /*
     * Authentication
     */
    user,
    loading,
    login,
    signup,
    googleLogin,
    googleSignup,
    logout,

    /*
     * Persistent backend profile
     */
    profile,
    profileLoading,
    profileError,
    refreshProfile,
    saveProfile,

    /*
     * Useful derived profile values
     */
    fullName,
    profilePhoto,
    onboardingCompleted,

    /*
     * Theme
     */
    isDarkMode,

    /*
     * Biometrics and app lock
     */
    isBiometricsEnabled,
    toggleBiometrics,
    passwordLockEnabled,
    enablePasswordLock,
    disablePasswordLock,
    verifyPasswordLock,
    isAppLocked,
    authenticateBiometricsManually,
  };


  /* ==========================================================
     PROVIDER
  ========================================================== */

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};