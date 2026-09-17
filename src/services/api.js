import axios from 'axios';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { auth } from '../config/firebase';

const API_URL = __DEV__
  ? (
      Platform.OS === 'android'
        ? 'http://10.151.61.80:8000/api/'
        : 'http://127.0.0.1:8000/api/'
    )
  : 'https://caresenseai-backend.onrender.com/api/';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/* ============================================================
   AUTH TOKEN
============================================================ */

api.interceptors.request.use(async config => {
  const user = auth.currentUser;

  if (user) {
    const token = await user.getIdToken();

    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
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

    const response = await api.post('ai/triage/', {
      symptoms: symptomsText,
      clarifications,
      patient_context: patientContext,
    });

    return response.data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

/* ============================================================
   HEALTH RECORDS
============================================================ */

export const getRecords = async (userId = 'anonymous') => {
  try {
    void userId;

    const response = await api.get('records/');
    return response.data;
  } catch (error) {
    console.error('Get Records Error:', error);
    throw error;
  }
};

export const deleteRecord = async recordId => {
  try {
    const response = await api.delete(
      `records/${recordId}/delete/`,
    );

    return response.data;
  } catch (error) {
    console.error('Delete Record Error:', error);
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
    console.error('Get User Profile Error:', error);
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
    console.error('Update User Profile Error:', error);
    throw error;
  }
};

/* ============================================================
   PDF REPORT
============================================================ */

export const openPDFReport = async recordId => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Please sign in to download this report.');
  }

  const token = await user.getIdToken();

  const safeRecordId = String(recordId).replace(
    /[^a-zA-Z0-9_-]/g,
    '_',
  );

  const fileUri =
    `${FileSystem.cacheDirectory}` +
    `caresense_report_${safeRecordId}.pdf`;

  const url =
    `${API_URL}` +
    `records/${encodeURIComponent(recordId)}/pdf/`;

  const result = await FileSystem.downloadAsync(
    url,
    fileUri,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      'Unable to download PDF report.',
    );
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error(
      'PDF sharing is not available on this device.',
    );
  }

  await Sharing.shareAsync(result.uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Open CareSense report',
    UTI: 'com.adobe.pdf',
  });

  return result.uri;
};

/* ============================================================
   DASHBOARD
============================================================ */

export const getDashboard = async (
  days = 7,
  userId = '',
) => {
  try {
    void userId;

    const response = await api.get(
      `dashboard/?days=${days}`,
    );

    return response.data;
  } catch (error) {
    console.error('Dashboard Error:', error);
    throw error;
  }
};

/* ============================================================
   DOCTORS
============================================================ */

export const getDoctors = async (params = {}) => {
  try {
    const response = await api.get(
      'doctors/',
      { params },
    );

    return response.data;
  } catch (error) {
    console.error('Get Doctors Error:', error);
    throw error;
  }
};

export default api;