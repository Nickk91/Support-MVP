// src/lib/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000/api", // Direct to your Node.js server
  withCredentials: false,
});

// Add request interceptor to include JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Enhanced response interceptor for better error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const error = err.response?.data || { message: err.message };

    // Auto-logout on 401 Unauthorized
    if (err.response?.status === 401) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      console.warn("🔄 Session expired, redirecting to login");
      // Optional: redirect to login page
      // window.location.href = '/login';
    }

    console.error("[API ERROR]", error);
    return Promise.reject(error);
  }
);

export default api;
