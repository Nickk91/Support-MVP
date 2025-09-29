const THEME_KEY = "ragmate-theme"; // "light" | "dark"

export function getStoredTheme() {
  return localStorage.getItem(THEME_KEY); // may be null
}

export function setStoredTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}

export function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function initTheme() {
  const stored = getStoredTheme();
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  applyTheme(stored ? stored : prefersDark ? "dark" : "light");

  // If you want live system updates ONLY when user hasn't chosen explicitly:
  if (!stored) {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => applyTheme(e.matches ? "dark" : "light");
    try {
      mql.addEventListener("change", handler);
    } catch {
      // Safari
      mql.addListener(handler);
    }
  }
}

export function toggleTheme() {
  const next = document.documentElement.classList.contains("dark")
    ? "light"
    : "dark";
  applyTheme(next);
  setStoredTheme(next);
  return next;
}
