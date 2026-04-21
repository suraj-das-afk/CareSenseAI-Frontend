import axios from "axios";
import { auth } from "../../firebaseConfig";

/**
 * 🌐 Backend URL
 * Use LAN IP for Android / physical device
 */
export const SERVER_URL = "http://10.166.230.80:8000";

// ------------------------------------
// Axios instance
// ------------------------------------
const api = axios.create({
  baseURL: SERVER_URL,
  timeout: 20000,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

// ------------------------------------
// 🔐 REQUEST INTERCEPTOR
// ------------------------------------
api.interceptors.request.use(
  async (config) => {
    const user = auth.currentUser;

    if (user) {
      // ✅ Do NOT force refresh
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }

    console.log(
      "🚀 API →",
      config.method?.toUpperCase(),
      config.url
    );

    return config;
  },
  (error) => Promise.reject(error)
);

// ------------------------------------
// 📥 RESPONSE INTERCEPTOR
// ------------------------------------
api.interceptors.response.use(
  (response) => {
    console.log(
      "✅ API ←",
      response.status,
      response.config.url
    );
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(
        "❌ API ERROR:",
        error.response.status,
        error.response.data
      );
    } else {
      console.error("🌐 NETWORK ERROR:", error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
