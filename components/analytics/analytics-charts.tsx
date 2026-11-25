"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGsapChartReveal } from "@/components/animations/use-gsap-chart-reveal";
import { BENTO_SERIES_COLORS } from "@/lib/chart-palette";
import { formatDuration } from "@/lib/utils";
import type {
  DailyActivityPoint,
  ExerciseAnalyticsItem,
  MonthlyActivityPoint,
} from "@/types/dto";

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

const AXIS_TICK_PRIMARY = {
  fill: "#9CA3AF",
  fontSize: 11,
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
};

const AXIS_TICK_MUTED = {
  fill: "#717987",
  fontSize: 11,
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
};

export function DailyVolumeBarChart({ data }: { data: DailyActivityPoint[] }) {
  const revealKey = React.useMemo(
    () => `${data.length}-${data.map((d) => d.reps).join(",")}`,
    [data]
  );
  const chartRef = useGsapChartReveal("bar", revealKey);

  return (
    <div ref={chartRef} className="h-[288px] w-full">
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
            tick={AXIS_TICK_PRIMARY}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={AXIS_TICK_MUTED}
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
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
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

export function ExerciseDistributionDonut({
  data,
}: {
  data: ExerciseAnalyticsItem[];
}) {
  const revealKey = React.useMemo(
    () => data.map((d) => `${d.exercise}:${d.sessions}`).join("|"),
    [data]
  );
  const chartRef = useGsapChartReveal("donut", revealKey);

  return (
    <div ref={chartRef} className="h-[176px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="sessions"
            nameKey="label"
            innerRadius={52}
            outerRadius={76}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {data.map((entry, idx) => (
              <Cell
                key={entry.exercise}
                fill={BENTO_SERIES_COLORS[idx % BENTO_SERIES_COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={{ color: "#F4F6F8" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MonthlyDurationAreaChart({
  data,
}: {
  data: MonthlyActivityPoint[];
}) {
  const revealKey = React.useMemo(
    () => data.map((d) => `${d.month}:${d.durationSeconds}`).join("|"),
    [data]
  );
  const chartRef = useGsapChartReveal("area", revealKey);

  return (
    <div ref={chartRef} className="h-[244px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
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
            tick={AXIS_TICK_PRIMARY}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK_MUTED}
          />
          <Tooltip
            formatter={(value: number) => [
              formatDuration(value),
              "Active duration",
            ]}
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={{ color: "#38BDF8" }}
          />
          <Area
            type="monotone"
            dataKey="durationSeconds"
            stroke="#38BDF8"
            strokeWidth={2}
            fill="rgba(56,189,248,0.12)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ExerciseProgressionLineChart({
  data,
}: {
  data: Array<{ date: string; reps: number; durationSeconds: number }>;
}) {
  const revealKey = React.useMemo(
    () => data.map((d) => `${d.date}:${d.reps}`).join("|"),
    [data]
  );
  const chartRef = useGsapChartReveal("line", revealKey);

  return (
    <div ref={chartRef} className="h-[244px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.07)"
          />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tick={AXIS_TICK_PRIMARY}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tick={AXIS_TICK_MUTED}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            itemStyle={{ color: "#C6FF4D" }}
          />
          <Line
            type="monotone"
            dataKey="reps"
            stroke="#C6FF4D"
            strokeWidth={2}
            dot={{ r: 3.5, fill: "#C6FF4D", stroke: "#08090B", strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: "#C6FF4D" }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
