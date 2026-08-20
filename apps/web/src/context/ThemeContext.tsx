import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Theme } from "@life-mmp/shared";
import { useOrg } from "./OrgContext";

export type Mode = "light" | "dark";

interface ThemeState {
  theme: Theme;
  mode: Mode;
  /** Persists to the organization (Settings screen, Org Admin only) -- not a personal preference. */
  setTheme: (t: Theme) => Promise<void>;
  setMode: (m: Mode) => void;
}

const ThemeContext = createContext<ThemeState | null>(null);

const MODE_KEY = "life-mmp:mode";

function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Theme is the church's brand, set once by its Org Admin (Settings) and
  // seen the same way by everyone in that org -- not a per-user pick. A
  // Platform Administrator has no organization, so they just get the
  // platform default; there's nowhere in their UI to change it.
  const { org, update } = useOrg();
  const theme: Theme = org?.theme ?? Theme.GROWTH;

  const [mode, setMode] = useState<Mode>(
    () => (localStorage.getItem(MODE_KEY) as Mode | null) ?? (systemPrefersDark() ? "dark" : "light"),
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme.toLowerCase());
  }, [theme]);

  useEffect(() => {
    document.documentElement.setAttribute("data-mode", mode);
    localStorage.setItem(MODE_KEY, mode);
  }, [mode]);

  const setTheme = useCallback(
    async (t: Theme) => {
      await update({ theme: t });
    },
    [update],
  );

  const value = useMemo(() => ({ theme, mode, setTheme, setMode }), [theme, mode, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
