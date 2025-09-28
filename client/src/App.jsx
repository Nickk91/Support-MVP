import { Outlet, NavLink } from "react-router-dom";

export default function App() {
  return (
    <div
      style={{
        minHeight: "100svh",
        background: "var(--bg)",
        color: "var(--fg)",
      }}
    >
      <header style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
        <nav style={{ display: "flex", gap: 12 }}>
          <NavLink to="/onboarding">Onboarding</NavLink>
        </nav>
      </header>
      <main style={{ maxWidth: 960, margin: "0 auto", padding: 16 }}>
        <Outlet />
      </main>
    </div>
  );
}
