const THEME_KEY = "ragmate-theme"; // "light" | "dark"

function withThemeAnimation(fn) {
  const root = document.documentElement;
  root.classList.add("theme-animating");
  try {
    fn();
  } finally {
    // allow the transitions to run, then remove the class
    setTimeout(() => root.classList.remove("theme-animating"), 220);
  }
}

export function getStoredTheme() {
  return localStorage.getItem(THEME_KEY);
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

  // apply without animation on first paint
  applyTheme(stored ? stored : prefersDark ? "dark" : "light");

  if (!stored) {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => applyTheme(e.matches ? "dark" : "light");
    try {
      mql.addEventListener("change", handler);
    } catch {
      mql.addListener(handler);
    } // Safari
  }
}

export function toggleTheme() {
  const next = document.documentElement.classList.contains("dark")
    ? "light"
    : "dark";
  withThemeAnimation(() => applyTheme(next));
  setStoredTheme(next);
  return next;
}
