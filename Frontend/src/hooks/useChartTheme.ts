"use client";

import { useMemo } from "react";

function readCssVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const val = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return val || fallback;
}

export function useChartTheme() {
  return useMemo(() => {
    const primary = readCssVar("--accent", "#10b981");
    const border = readCssVar("--card-border", "#e5e7eb");
    const text = readCssVar("--text", "#0f172a");
    const grid = readCssVar("--surface-soft", "#f1f5f9");
    return { primary, border, text, grid };
  }, []);
}

