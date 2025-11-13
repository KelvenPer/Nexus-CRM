"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type HC = boolean;
type HCContextValue = { highContrast: HC; toggleHighContrast: () => void; setHighContrast: (v: HC) => void };

const HCContext = createContext<HCContextValue | undefined>(undefined);
const STORAGE_KEY = "nexus_ui_high_contrast";

export function HighContrastProvider({ children }: { children: React.ReactNode }) {
  const [highContrast, setHighContrastState] = useState<HC>(() => {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw === "1" || raw === "0") return raw === "1";
      if (window.matchMedia && window.matchMedia("(prefers-contrast: more)").matches) return true;
    } catch {}
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, highContrast ? "1" : "0");
      } catch {}
    }
    const root = typeof document !== "undefined" ? document.documentElement : null;
    root?.classList.toggle("high-contrast", !!highContrast);
  }, [highContrast]);

  const setHighContrast = useCallback((v: HC) => setHighContrastState(v), []);
  const toggleHighContrast = useCallback(() => setHighContrastState((v) => !v), []);
  const value = useMemo(() => ({ highContrast, toggleHighContrast, setHighContrast }), [highContrast, toggleHighContrast, setHighContrast]);
  return <HCContext.Provider value={value}>{children}</HCContext.Provider>;
}

export function useHighContrast() {
  const ctx = useContext(HCContext);
  if (!ctx) throw new Error("useHighContrast must be used within HighContrastProvider");
  return ctx;
}

