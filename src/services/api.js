import axios from 'axios';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { auth } from '../config/firebase';

const API_URL = Platform.OS === 'android'
  ? 'http://10.182.194.80:8000/api/'
  : 'http://127.0.0.1:8000/api/';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

export const deleteRecord = async (recordId) => {
  try {
    const response = await api.delete(`records/${recordId}/delete/`);
    return response.data;
  } catch (error) {
    console.error('Delete Record Error:', error);
    throw error;
  }
};

/** Download an authenticated PDF to temporary app storage, then open its share sheet. */
export const openPDFReport = async (recordId) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please sign in to download this report.');
  }

  const token = await user.getIdToken();
  const safeRecordId = String(recordId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileUri = `${FileSystem.cacheDirectory}caresense_report_${safeRecordId}.pdf`;
  const url = `${API_URL}records/${encodeURIComponent(recordId)}/pdf/`;
  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error('Unable to download PDF report.');
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('PDF sharing is not available on this device.');
  }

  await Sharing.shareAsync(result.uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Open CareSense report',
    UTI: 'com.adobe.pdf',
  });
  return result.uri;
};

/** Fetch doctor dashboard data */
export const getDashboard = async (days = 7, userId = '') => {
  try {
    void userId;
    const response = await api.get(`dashboard/?days=${days}`);
    return response.data;
  } catch (error) {
    console.error('Dashboard Error:', error);
    throw error;
  }
};

export default api;
