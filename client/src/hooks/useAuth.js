// src/hooks/useAuth.js
import { useState, useEffect } from "react";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Read from localStorage on component mount
    const token = localStorage.getItem("authToken");
    const userStr = localStorage.getItem("user");

    if (token && userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
        setToken(token);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to parse user data:", error);
      }
    }
  }, []);

  return { user, token, isAuthenticated };
}
