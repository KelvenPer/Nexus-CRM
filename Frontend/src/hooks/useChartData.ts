"use client";

import { useMemo } from "react";
import { useChartTheme } from "@/hooks/useChartTheme";

export function useLineData(labels: string[], values: number[], label = "Serie") {
  const theme = useChartTheme();
  return useMemo(
    () => ({
      labels,
      datasets: [
        {
          label,
          data: values,
          fill: false,
          borderColor: theme.primary,
          backgroundColor: theme.primary,
          tension: 0.35,
        },
      ],
    }),
    [labels, values, label, theme.primary]
  );
}

export function useBarData(labels: string[], values: number[], label = "Serie") {
  const theme = useChartTheme();
  return useMemo(
    () => ({
      labels,
      datasets: [
        {
          label,
          data: values,
          backgroundColor: theme.primary,
          borderRadius: 6,
        },
      ],
    }),
    [labels, values, label, theme.primary]
  );
}

