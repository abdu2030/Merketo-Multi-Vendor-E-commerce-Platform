"use client";

import { Moon, Sun } from "@/components/imported/design-icons";
import { useTheme } from "./theme-provider";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const mode = isDark ? "Light mode" : "Dark mode";
  const action = `Switch to ${mode.toLowerCase()}`;

  return (
    <button
      aria-label={action}
      title={action}
      className="inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-2 rounded-full bg-fuchsia-50 px-3 text-fuchsia-800 ring-1 ring-inset ring-fuchsia-200 transition-colors hover:bg-fuchsia-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-800 dark:bg-slate-800 dark:text-fuchsia-300 dark:ring-slate-600 dark:hover:bg-slate-700 dark:focus-visible:outline-fuchsia-300"
      onClick={toggleTheme}
      type="button"
    >
      {isDark ? <Sun /> : <Moon />}
      {!compact && <span className="hidden text-sm font-bold sm:inline">{mode}</span>}
    </button>
  );
}
