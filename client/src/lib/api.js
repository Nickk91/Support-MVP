// client/src/lib/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "/api", // Vite proxy -> http://localhost:4000
  withCredentials: false, // Keep this false for token auth
});

// Add request interceptor to include JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Optional: response interceptor for errors
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("[API ERROR]", err.response?.data || err.message);
    return Promise.reject(err);
  }
);

export default api;
