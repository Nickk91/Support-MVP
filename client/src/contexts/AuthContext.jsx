// src/contexts/AuthContext.jsx - SIMPLEST VERSION
import { createContext, useContext } from "react";
import { useUserStore } from "../store/useUserStore";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const authState = useUserStore();

  return (
    <AuthContext.Provider value={authState}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
