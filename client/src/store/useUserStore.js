// src/store/useUserStore.js - UPDATED
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useUserStore = create(
  persist(
    (set, get) => ({
      // User state
      user: null,
      token: null,
      isAuthenticated: false,

      // Actions
      login: (userData, authToken) => {
        // Also update localStorage for compatibility
        localStorage.setItem("authToken", authToken);
        localStorage.setItem("user", JSON.stringify(userData));

        set({
          user: userData,
          token: authToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");

        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },

      updateUser: (userData) => {
        const currentUser = get().user;
        const updatedUser = { ...currentUser, ...userData };

        // Update both store and localStorage
        localStorage.setItem("user", JSON.stringify(updatedUser));
        set({ user: updatedUser });
      },

      // ✅ ADD THIS METHOD - Check if user is authenticated
      checkAuth: async () => {
        try {
          const token = localStorage.getItem("authToken");
          const userStr = localStorage.getItem("user");

          if (token && userStr) {
            const user = JSON.parse(userStr);

            // Optional: Validate token with backend
            // const response = await api.get('/auth/verify');
            // if (!response.data.ok) throw new Error('Invalid token');

            set({
              user,
              token,
              isAuthenticated: true,
            });
            return true;
          } else {
            // Clear any invalid state
            set({
              user: null,
              token: null,
              isAuthenticated: false,
            });
            return false;
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          // Clear invalid auth state
          get().logout();
          return false;
        }
      },

      // Initialize from localStorage on app start
      initializeFromStorage: () => {
        try {
          const token = localStorage.getItem("authToken");
          const userStr = localStorage.getItem("user");

          if (token && userStr) {
            const user = JSON.parse(userStr);
            set({
              user,
              token,
              isAuthenticated: true,
            });
          }
        } catch (error) {
          console.error("Failed to initialize user from storage:", error);
        }
      },
    }),
    {
      name: "user-storage",
    }
  )
);
