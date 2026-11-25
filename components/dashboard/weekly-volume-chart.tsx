"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGsapChartReveal } from "@/components/animations/use-gsap-chart-reveal";
import type { DailyActivityPoint } from "@/types/dto";

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "#16191F",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "10px",
  fontSize: "12px",
  color: "#F4F6F8",
  fontFamily:
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
};

const TOOLTIP_LABEL_STYLE: React.CSSProperties = {
  color: "#F4F6F8",
  marginBottom: "4px",
};

interface WeeklyVolumeChartProps {
  data: DailyActivityPoint[];
  maxWeeklyReps?: number;
}

export function WeeklyVolumeChart({ data }: WeeklyVolumeChartProps) {
  const revealKey = React.useMemo(
    () => data.map((d) => `${d.date}:${d.reps}`).join("|"),
    [data]
  );
  const chartRef = useGsapChartReveal("bar", revealKey);

  return (
    <div ref={chartRef} className="h-[268px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.07)"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{
              fill: "#9CA3AF",
              fontSize: 11,
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
            }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={{
              fill: "#717987",
              fontSize: 11,
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
            }}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={{ color: "#C6FF4D" }}
          />
          <Bar
            dataKey="reps"
            fill="#C6FF4D"
            radius={[5, 5, 0, 0]}
            maxBarSize={42}
            isAnimationActive={false}
          >
            {data.map((entry) => (
              <Cell
                key={entry.date}
                fill={entry.reps > 0 ? "#C6FF4D" : "transparent"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
