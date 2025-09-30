// src/components/ThemeToggle.jsx
import { Sun, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <div
      role="group"
      aria-label="Toggle color theme"
      className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:shadow-sm"
    >
      {/* The switch itself (Radix renders a <button role="switch">) */}
      <Switch
        id="theme-switch"
        checked={isDark}
        onCheckedChange={toggle}
        className="shrink-0"
      />

      {/* Label toggles the switch via htmlFor (no nested <button>) */}
      <label
        htmlFor="theme-switch"
        className="flex cursor-pointer select-none items-center gap-2"
        title="Toggle dark mode"
      >
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        <span className="hidden sm:inline">{isDark ? "Dark" : "Light"}</span>
      </label>
    </div>
  );
}
