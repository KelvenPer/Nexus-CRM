"use client";

import React, { useEffect, useRef } from "react";
import { Chart, ChartConfiguration, BarController, BarElement, LinearScale, Title, CategoryScale, Tooltip, Legend, ChartDataset } from "chart.js";

Chart.register(BarController, BarElement, LinearScale, CategoryScale, Title, Tooltip, Legend);

type Props = {
  data: { labels: string[]; datasets: ChartDataset<"bar", number[]>[] };
  height?: number;
};

export default function BarChart({ data, height = 240 }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const config: ChartConfiguration = {
      type: "bar",
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: "rgba(0,0,0,0.06)" } },
        },
      },
    };
    chartRef.current?.destroy();
    chartRef.current = new Chart(ctx, config);
    return () => chartRef.current?.destroy();
  }, [data]);

  return (
    <div style={{ height }}>
      <canvas ref={ref} aria-label="Bar chart" role="img" />
    </div>
  );
}

