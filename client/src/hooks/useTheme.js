import { useEffect, useState } from "react";
import { initTheme, toggleTheme } from "@/lib/theme";

export function useTheme() {
  const [theme, setTheme] = useState(() =>
    document.documentElement.classList.contains("dark") ? "dark" : "light"
  );

  useEffect(() => {
    // run once on mount
    initTheme();
    setTheme(
      document.documentElement.classList.contains("dark") ? "dark" : "light"
    );
  }, []);

  const toggle = () => {
    const next = toggleTheme();
    setTheme(next);
  };

  return { theme, toggle, isDark: theme === "dark" };
}
