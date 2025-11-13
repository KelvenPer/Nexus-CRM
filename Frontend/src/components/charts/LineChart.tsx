"use client";

import React, { useEffect, useRef } from "react";
import { Chart, ChartConfiguration, LineController, LineElement, PointElement, LinearScale, Title, CategoryScale, Filler, Tooltip, Legend } from "chart.js";

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Title, Filler, Tooltip, Legend);

type Props = {
  data: { labels: string[]; datasets: any[] };
  height?: number;
};

export default function LineChart({ data, height = 240 }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    const ctx = ref.current?.getContext("2d");
    if (!ctx) return;
    const config: ChartConfiguration = {
      type: "line",
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
  }, [JSON.stringify(data)]);

  return (
    <div style={{ height }}>
      <canvas ref={ref} aria-label="Line chart" role="img" />
    </div>
  );
}

