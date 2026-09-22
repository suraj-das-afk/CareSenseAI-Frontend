import axios from 'axios';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { auth } from '../config/firebase';
import { getAppCheckToken } from '../config/appCheck';

const API_TIMEOUT_MS = 20 * 1000;

const API_URL = __DEV__
  ? (
      Platform.OS === 'android'
        ? 'http://10.115.161.80:8000/api/'
        : 'http://127.0.0.1:8000/api/'
    )
  : 'https://caresenseai-backend.onrender.com/api/';

const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* ============================================================
   SAFE ERROR LOGGING
============================================================ */

const getSafeApiErrorMessage = error => {
  if (
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ETIMEDOUT'
  ) {
    return 'Request timed out.';
  }

  if (error?.response?.status) {
    return `Request failed with status ${error.response.status}.`;
  }

  return (
    error?.message ||
    'Request failed.'
  );
};

const logApiError = (label, error) => {
  if (__DEV__) {
    console.warn(
      `${label}: ${getSafeApiErrorMessage(error)}`,
    );
  }
};

/* ============================================================
   HELPER
============================================================ */

export const clearDashboardCache = () => {
  dashboardCache.clear();
  dashboardRequests.clear();
};

/* ============================================================
   AUTH TOKEN
============================================================ */

api.interceptors.request.use(async config => {
  const user = auth.currentUser;

  config.headers =
    config.headers || {};

  /*
   * Firebase Authentication
   */
  if (user) {
    const token =
      await user.getIdToken();

    config.headers.Authorization =
      `Bearer ${token}`;
  }

  /*
   * Firebase App Check
   *
   * This is sent to our Django backend
   * using the standard Firebase header.
   */
  let appCheckToken = null;

  try {
    appCheckToken =
      await getAppCheckToken();
  } catch (appCheckError) {
    if (__DEV__) {
      console.warn(
        'Firebase App Check is unavailable in development. Continuing without App Check token.',
      );
    } else {
      throw appCheckError;
    }
  }

  if (appCheckToken) {
    config.headers[
      'X-Firebase-AppCheck'
    ] = appCheckToken;
  }

  return config;
});

/* ============================================================
   SYMPTOM TRIAGE
============================================================ */

export const submitSymptoms = async (
  symptomsText,
  userId = 'anonymous',
  clarifications = {},
  patientContext = {},
) => {
  try {
    void userId;

    const response =
      await api.post(
        'ai/triage/',
        {
          symptoms:
            symptomsText,

          clarifications,

          patient_context:
            patientContext,
        },
      );

    /*
     * A completed triage creates a persisted
     * HealthRecord.
     *
     * Clarification responses normally do not.
     */
    if (
      response.status === 201
    ) {
      clearRecordsCache();
      clearDashboardCache();
    }

    return response.data;
  } catch (error) {
    logApiError('API Error', error);

    throw error;
  }
};

/* ============================================================
   RECORD CACHE
============================================================ */

const RECORDS_CACHE_TTL_MS = 30 * 1000;

const recordsCache = new Map();
const recordsRequests = new Map();

export const clearRecordsCache = () => {
  recordsCache.clear();
  recordsRequests.clear();
};


/* ============================================================
   RECORD CACHE KEY
============================================================ */

const getRecordsCacheKey = () => {
  const user = auth.currentUser;

  if (!user?.uid) {
    return null;
  }

  return user.uid;
};


/* ============================================================
   HEALTH RECORDS
============================================================ */

export const getRecords = async (
  userId = 'anonymous',
  options = {},
) => {
  try {
    void userId;

    const {
      force = false,
    } = options;

    const cacheKey =
      getRecordsCacheKey();

    if (!cacheKey) {
      throw new Error(
        'Please sign in to load your health records.',
      );
    }

    const now = Date.now();

    /* ----------------------------------------------------------
       USE CACHE
    ---------------------------------------------------------- */

    const cached =
      recordsCache.get(
        cacheKey,
      );

    if (
      !force &&
      cached &&
      now - cached.timestamp <
        RECORDS_CACHE_TTL_MS
    ) {
      return cached.data;
    }


    /* ----------------------------------------------------------
       REUSE EXISTING REQUEST
       Prevent multiple screens from making the same request
       simultaneously.
    ---------------------------------------------------------- */

    const existingRequest =
      recordsRequests.get(
        cacheKey,
      );

    if (existingRequest) {
      return existingRequest;
    }


    /* ----------------------------------------------------------
       FETCH
    ---------------------------------------------------------- */

    const request =
      (async () => {
        try {
          const response =
            await api.get(
              'records/',
            );

          recordsCache.set(
            cacheKey,
            {
              data:
                response.data,

              timestamp:
                Date.now(),
            },
          );

          return response.data;
        } catch (error) {
          logApiError('Get Records Error', error);

          /*
           * Never keep failed
           * data in cache.
           */
          recordsCache.delete(
            cacheKey,
          );

          throw error;
        } finally {
          recordsRequests.delete(
            cacheKey,
          );
        }
      })();


    recordsRequests.set(
      cacheKey,
      request,
    );

    return request;
  } catch (error) {
    logApiError('Get Records Error', error);

    throw error;
  }
};

/* ============================================================
   USER PROFILE
============================================================ */

/**
 * Get the authenticated user's profile.
 *
 * The backend identifies the user from the Firebase token,
 * so we do not send a userId from the client.
 */
export const getUserProfile = async () => {
  try {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('Please sign in to load your profile.');
    }

    const response = await api.get('profile/');
    return response.data;
  } catch (error) {
    logApiError('Get User Profile Error', error);
    throw error;
  }
};

/**
 * Create or update the authenticated user's profile.
 *
 * The backend uses the Firebase token to determine ownership.
 * Only the supplied fields are updated.
 */
export const updateUserProfile = async profileData => {
  try {
    const user = auth.currentUser;

    if (!user) {
      throw new Error('Please sign in to update your profile.');
    }

    const response = await api.post(
      'profile/',
      profileData,
    );

    return response.data;
  } catch (error) {
    logApiError('Update User Profile Error', error);
    throw error;
  }
};

/* ============================================================
   PDF REPORT
============================================================ */

export const openPDFReport = async recordId => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      'Please sign in to download this report.',
    );
  }

  const token =
    await user.getIdToken();

  const appCheckToken =
    await getAppCheckToken();

  const safeRecordId =
    String(recordId).replace(
      /[^a-zA-Z0-9_-]/g,
      '_',
    );

  const fileUri =
    `${FileSystem.cacheDirectory}` +
    `caresense_report_${safeRecordId}.pdf`;

  const url =
    `${API_URL}` +
    `records/${encodeURIComponent(recordId)}/pdf/`;

  const result =
    await FileSystem.downloadAsync(
      url,
      fileUri,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,

          'X-Firebase-AppCheck':
            appCheckToken,
        },
      },
    );

  if (
    result.status < 200 ||
    result.status >= 300
  ) {
    throw new Error(
      'Unable to download PDF report.',
    );
  }

  if (
    !(await Sharing.isAvailableAsync())
  ) {
    throw new Error(
      'PDF sharing is not available on this device.',
    );
  }

  await Sharing.shareAsync(
    result.uri,
    {
      mimeType:
        'application/pdf',

      dialogTitle:
        'Open CareSense report',

      UTI:
        'com.adobe.pdf',
    },
  );

  return result.uri;
};

/* ============================================================
   DASHBOARD CACHE
============================================================ */

const DASHBOARD_CACHE_TTL_MS = 30 * 1000;

const dashboardCache = new Map();
const dashboardRequests = new Map();

/* ============================================================
   DASHBOARD
============================================================ */

export const getDashboard = async (
  days = 30,
  options = {},
) => {
  const { force = false } = options;

  const user = auth.currentUser;

  if (!user) {
    throw new Error('Please sign in to load your dashboard.');
  }

  const userKey = user.uid;
  const cacheKey = `${userKey}:${days}`;

  const now = Date.now();
  const cached = dashboardCache.get(cacheKey);

  /* ----------------------------------------------------------
     USE SHARED CACHE
  ---------------------------------------------------------- */

  if (
    !force &&
    cached &&
    now - cached.timestamp < DASHBOARD_CACHE_TTL_MS
  ) {
    return cached.data;
  }

  /* ----------------------------------------------------------
     REUSE EXISTING REQUEST
     Prevent duplicate simultaneous requests.
  ---------------------------------------------------------- */

  if (!force) {
    const existingRequest =
      dashboardRequests.get(cacheKey);

    if (existingRequest) {
      return existingRequest;
    }
  }

  /* ----------------------------------------------------------
     FETCH
  ---------------------------------------------------------- */

  const request = (async () => {
    try {
      const response = await api.get(
        `dashboard/?scope=user&days=${days}`,
      );

      dashboardCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now(),
      });

      return response.data;
    } catch (error) {
      logApiError('Dashboard Error', error);

      /* Never keep failed data in cache. */
      dashboardCache.delete(cacheKey);

      throw error;
    } finally {
      dashboardRequests.delete(cacheKey);
    }
  })();

  if (!force) {
    dashboardRequests.set(
      cacheKey,
      request,
    );
  }

  return request;
};

/* ============================================================
   NEARBY HEALTHCARE
============================================================ */

export const getNearbyHealthcarePlaces = async (
  params = {},
) => {
  try {
    const {
      lat,
      lng,
      radius = 5000,
    } = params;

    if (
      !Number.isFinite(Number(lat)) ||
      !Number.isFinite(Number(lng))
    ) {
      throw new Error(
        'A valid device location is required.',
      );
    }

    const response =
      await api.get(
        'doctors/',
        {
          params: {
            lat,
            lng,
            radius,
          },
        },
      );

    return response.data;
  } catch (error) {
    logApiError(
      'Nearby Healthcare Error',
      error,
    );

    throw error;
  }
};

/*
 * Backward-compatible alias.
 */
export const getDoctors =
  getNearbyHealthcarePlaces;

/* ============================================================
   DELETE HEALTH RECORD
============================================================ */

export const deleteRecord = async recordId => {
  try {
    const user = auth.currentUser;

    if (!user) {
      throw new Error(
        'Please sign in to delete this health record.',
      );
    }

    if (
      recordId === null ||
      recordId === undefined ||
      String(recordId).trim() === ''
    ) {
      throw new Error(
        'A valid health record ID is required.',
      );
    }

    const response = await api.delete(
      `records/${encodeURIComponent(recordId)}/delete/`,
    );

    /*
     * The deleted record must not remain in any
     * in-memory cache after the operation succeeds.
     */
    clearRecordsCache();
    clearDashboardCache();

    return response.data;
  } catch (error) {
    logApiError('Delete Record Error', error);

    throw error;
  }
};

export default api;