// client/src/lib/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "/api", // Vite proxy -> http://localhost:4000
  // ❌ do not set default Content-Type here
  withCredentials: false,
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
