// src/config/api.js
export const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000",
};

// src/main.jsx or your entry point
import { API_CONFIG } from "./config/api";
console.log("🚀 API Base URL:", API_CONFIG.baseURL);
