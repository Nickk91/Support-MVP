// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.jsx";
import OnboardingWizard from "./features/onboarding/OnboardingWizard.jsx";
import TestPage from "./pages/TestPage/TestPage.jsx";
import Dashboard from "./pages/Dashboard/Dashboard.jsx";

import "./styles/tokens.css";
import "./index.css"; // your base styles if any

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<Navigate to="/onboarding" replace />} />
          <Route path="/onboarding" element={<OnboardingWizard />} />
          <Route path="/test" element={<TestPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
