"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { translate, type I18nKey } from "@/lib/i18n";
import { profile } from "@/lib/profile";
import { getStorage, type Settings } from "@/lib/storage";

interface AppContextValue {
  settings: Settings;
  ready: boolean;
  /** Resolved theme (system preference applied). */
  isDark: boolean;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  t: (key: I18nKey, vars?: Record<string, string | number>) => string;
}

const defaultSettings: Settings = {
  theme: "dark",
  lang: profile.lang,
  dailyGoalMinutes: profile.dailyGoalMinutes,
  updatedAt: new Date(0).toISOString(),
};

const AppContext = createContext<AppContextValue | null>(null);

/** Applies the theme class on <html>. Mirrored to localStorage so the next page load paints correctly. */
function applyTheme(theme: Settings["theme"]): boolean {
  const dark =
    theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem("ph-theme", theme);
  } catch {
    // Storage may be blocked (private mode); the theme still applies for this page.
  }
  return dark;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [ready, setReady] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    getStorage()
      .getSettings()
      .then((saved) => {
        if (saved) setSettings(saved);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    setIsDark(applyTheme(settings.theme));
    document.documentElement.lang = settings.lang;
  }, [settings.theme, settings.lang]);

  const updateSettings = useCallback(async (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch, updatedAt: new Date().toISOString() };
    setSettings(next);
    await getStorage().saveSettings(next);
  }, [settings]);

  const t = useCallback(
    (key: I18nKey, vars?: Record<string, string | number>) => translate(settings.lang, key, vars),
    [settings.lang],
  );

  return (
    <AppContext.Provider value={{ settings, ready, isDark, updateSettings, t }}>{children}</AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}
