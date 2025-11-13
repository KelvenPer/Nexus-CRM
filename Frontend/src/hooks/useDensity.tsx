"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Density = "comfortable" | "compact";

type DensityContextValue = {
  density: Density;
  toggleDensity: () => void;
  setDensity: (d: Density) => void;
};

const DensityContext = createContext<DensityContextValue | undefined>(undefined);

const STORAGE_KEY = "nexus_ui_density";

export function DensityProvider({ children }: { children: React.ReactNode }) {
  const [density, setDensityState] = useState<Density>(() => {
    if (typeof window === "undefined") return "comfortable";
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw === "compact" || raw === "comfortable" ? (raw as Density) : "comfortable";
    } catch {
      return "comfortable";
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(STORAGE_KEY, density);
      } catch {}
    }
    const root = typeof document !== "undefined" ? document.documentElement : null;
    root?.classList.toggle("density-compact", density === "compact");
  }, [density]);

  const setDensity = useCallback((d: Density) => setDensityState(d), []);
  const toggleDensity = useCallback(
    () => setDensityState((d) => (d === "compact" ? "comfortable" : "compact")),
    []
  );

  const value = useMemo(() => ({ density, toggleDensity, setDensity }), [density, toggleDensity, setDensity]);
  return <DensityContext.Provider value={value}>{children}</DensityContext.Provider>;
}

export function useDensity() {
  const ctx = useContext(DensityContext);
  if (!ctx) throw new Error("useDensity must be used within DensityProvider");
  return ctx;
}

