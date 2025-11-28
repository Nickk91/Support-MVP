// src/App.jsx - UPDATED
import { Outlet, useLocation } from "react-router-dom";
import ThemeToggle from "./components/ThemeToggle/ThemeToggle";
import { useAuth } from "./contexts/AuthContext";

import LogoutButton from "./components/LogoutButton/LogoutButton";

export default function App() {
  const { user, token, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  // Don't show header on auth pages
  const isAuthPage = location.pathname === "/auth";

  if (isAuthPage) {
    return <Outlet />;
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="max-w-[960px] mx-auto p-4 flex items-center justify-between gap-3">
        <nav className="flex gap-3">
          {user && (
            <>
              {/* <a href="/dashboard" className="text-sm font-medium">
                Dashboard
              </a> */}
              {/* <a href="/onboarding" className="text-sm font-medium">
                Create Bot
              </a> */}
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {isAuthenticated && token?.length > 0 && <LogoutButton />}
        </div>
      </header>

      <main className="max-w-[960px] mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
