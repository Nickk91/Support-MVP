// src/hooks/useAuth.js - Add debugging
import { useState, useEffect } from "react";

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedToken = localStorage.getItem("authToken");
        const storedUser = localStorage.getItem("user");

        console.log("🔐 Auth Check:", {
          hasToken: !!storedToken,
          hasUser: !!storedUser,
          tokenLength: storedToken?.length,
          user: storedUser ? JSON.parse(storedUser) : null,
        });

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        } else {
          setToken(null);
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    // Listen for storage changes (like from other tabs)
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  return { user, token, isAuthenticated };
};
