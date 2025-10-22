import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.jsx";
import OnboardingWizard from "./features/onboarding/OnboardingWizard.jsx";
import TestPage from "./pages/TestPage/TestPage.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";
import AuthPage from "./pages/Auth/AuthPage.jsx";
import DocumentInspector from "./pages/DocumentInspector/DocumentInspector.jsx"; // ADD THIS
import { AuthProvider } from "./contexts/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute.jsx";

import "./styles/tokens.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes with minimal layout */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="onboarding" element={<OnboardingWizard />} />

          {/* Protected app routes with main layout */}
          <Route path="/" element={<App />}>
            <Route index element={<Navigate to="/dashboard" replace />} />

            <Route
              path="dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            {/* ADD Document Inspector Route */}
            <Route
              path="inspect/:botId"
              element={
                <ProtectedRoute>
                  <DocumentInspector />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 404 catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
