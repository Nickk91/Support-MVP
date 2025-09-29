import { Sun, Moon } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:shadow-sm"
      onClick={toggle}
    >
      <div className="relative h-5 w-9 flex items-center">
        {/* optional: a mini switch visual */}
        <Switch checked={isDark} onCheckedChange={toggle} />
      </div>
      <span className="hidden sm:inline" onClick={toggle}>
        {isDark ? "Dark" : "Light"}
      </span>
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
    </button>
  );
}
