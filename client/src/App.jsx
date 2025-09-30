import { Outlet, NavLink } from "react-router-dom";
import ThemeToggle from "./components/ThemeToggle/ThemeToggle";

export default function App() {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="max-w-[960px] mx-auto p-4 flex items-center justify-between gap-3">
        <nav className="flex gap-3">
          {/* <NavLink to="/onboarding">Onboarding</NavLink> */}
        </nav>
        <ThemeToggle />
      </header>

      <main className="max-w-[960px] mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
