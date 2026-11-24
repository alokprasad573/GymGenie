"use client";

import * as React from "react";
import Link from "next/link";
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
import { PageChoreography } from "@/components/animations/page-choreography";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatePanel } from "@/components/ui/state-panel";
import { EXERCISE_ORDER, EXERCISES } from "@/config/exercises";
import { apiFetch, ClientRequestError } from "@/features/auth/auth-api-client";
import { formatDuration, formatNumber } from "@/lib/utils";
import type {
  DailyActivityPoint,
  ExerciseAnalyticsItem,
  MonthlyActivityPoint,
} from "@/types/dto";
import type { ExerciseType } from "@/types/exercise";

const DONUT_COLORS = [
  "#C6FF4D", // Electric lime (brand accent)
  "#4AD8B8", // Mineral teal
  "#60A5FA", // Slate sky blue
  "#F5B942", // Warm amber
  "#F0786C", // Soft coral
];

interface AnalyticsState {
  weekly: DailyActivityPoint[];
  monthly: MonthlyActivityPoint[];
  exercises: ExerciseAnalyticsItem[];
}

export function AnalyticsView() {
  const [days, setDays] = React.useState<string>("30");
  const [reloadCount, setReloadCount] = React.useState(0);
  const [selectedExercise, setSelectedExercise] =
    React.useState<ExerciseType>("squats");
  const [data, setData] = React.useState<AnalyticsState | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const handleDaysChange = React.useCallback((nextDays: string) => {
    setLoading(true);
    setError(null);
    setDays(nextDays);
  }, []);

  const handleRetry = React.useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadCount((count) => count + 1);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      try {
        const [weeklyRes, monthlyRes, exercisesRes] = await Promise.all([
          apiFetch<{ series: DailyActivityPoint[] }>(
            `/api/analytics/weekly?days=${days}`
          ),
          apiFetch<{ series: MonthlyActivityPoint[] }>(
            `/api/analytics/monthly?months=6`
          ),
          apiFetch<{ exercises: ExerciseAnalyticsItem[] }>(
            `/api/analytics/exercises?days=${days}`
          ),
        ]);
        if (cancelled) return;
        setData({
          weekly: weeklyRes.series,
          monthly: monthlyRes.series,
          exercises: exercisesRes.exercises,
        });
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ClientRequestError
            ? err.message
            : "Unable to load analytics data."
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [days, reloadCount]);

  const totalSessionsInWindow =
    data?.exercises.reduce((sum, item) => sum + item.sessions, 0) ?? 0;

  const totalRepsInWindow =
    data?.exercises.reduce((sum, item) => sum + item.totalReps, 0) ?? 0;

  const totalDurationInWindow =
    data?.weekly.reduce((sum, item) => sum + item.durationSeconds, 0) ?? 0;

  const distributionData = (data?.exercises ?? []).filter(
    (item) => item.sessions > 0
  );

  const topMovement = [...distributionData].sort(
    (a, b) => b.totalReps - a.totalReps
  )[0];

  const selectedExerciseData = data?.exercises.find(
    (item) => item.exercise === selectedExercise
  );

  return (
    <PageChoreography
      revealKey={`${days}-${loading ? "loading" : "ready"}`}
      className="space-y-6"
    >
      <div
        data-page-header
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-medium tracking-[-0.02em] text-ink-primary sm:text-[30px]">
            Performance analytics
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Volume, active duration, and rep progression computed from saved workouts
          </p>
        </div>

        <div className="w-full sm:w-44">
          <Select value={days} onValueChange={handleDaysChange}>
            <SelectTrigger aria-label="Analytics date range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-12">
          <Skeleton className="h-[340px] lg:col-span-8" />
          <Skeleton className="h-[340px] lg:col-span-4" />
          <Skeleton className="h-[320px] lg:col-span-6" />
          <Skeleton className="h-[320px] lg:col-span-6" />
        </div>
      ) : error ? (
        <StatePanel
          variant="error"
          title="Could not load analytics"
          description={error}
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={handleRetry}
            >
              Retry
            </Button>
          }
        />
      ) : totalSessionsInWindow === 0 ? (
        <StatePanel
          variant="empty"
          title="No analytics data in this date range"
          description="Complete at least one workout session to unlock weekly frequency, duration trends, and exercise progression."
          action={
            <Button asChild variant="primary">
              <Link href="/workout/setup">Start a workout</Link>
            </Button>
          }
        />
      ) : (
        <>
          {/* Summary KPI strip */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              data-stagger-item
              label="Total Workout Sessions"
              value={formatNumber(totalSessionsInWindow)}
              context={`Last ${days} days`}
            />
            <MetricCard
              data-stagger-item
              label="Total Tracked Reps Count"
              value={formatNumber(totalRepsInWindow)}
              context="Total tracked reps"
              accent
            />
            <MetricCard
              data-stagger-item
              label="Total Active time"
              value={formatDuration(totalDurationInWindow)}
              context="Tracked set duration"
            />
            <MetricCard
              data-stagger-item
              label="Top movement"
              value={topMovement ? EXERCISES[topMovement.exercise].shortLabel : "None"}
              context={
                topMovement
                  ? `${formatNumber(topMovement.totalReps)} reps logged`
                  : "No sessions yet"
              }
            />
          </div>

          {/* Row 1: Wide Weekly Frequency Bar + Narrow Exercise Distribution Donut */}
          <div data-scroll-reveal className="grid gap-4 lg:grid-cols-12">
            <Card className="min-w-0 lg:col-span-8">
              <CardHeader>
                <CardTitle>Daily workout volume</CardTitle>
                <CardDescription>
                  Total reps logged per UTC day over the last {days} days
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[288px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data?.weekly ?? []}
                      margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="rgba(255,255,255,0.06)"
                      />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#9AA49B", fontSize: 11 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        tick={{ fill: "#6C766E", fontSize: 11 }}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(255,255,255,0.04)" }}
                        contentStyle={{
                          backgroundColor: "#171E19",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#F5F7F2",
                        }}
                      />
                      <Bar
                        dataKey="reps"
                        fill="#C6FF4D"
                        radius={[3, 3, 0, 0]}
                        maxBarSize={32}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-0 lg:col-span-4">
              <CardHeader>
                <CardTitle>Exercise distribution</CardTitle>
                <CardDescription>Share of sessions by movement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="h-[176px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={distributionData}
                        dataKey="sessions"
                        nameKey="label"
                        innerRadius={52}
                        outerRadius={76}
                        paddingAngle={2}
                        stroke="none"
                      >
                        {distributionData.map((entry, idx) => (
                          <Cell
                            key={entry.exercise}
                            fill={DONUT_COLORS[idx % DONUT_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#171E19",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#F5F7F2",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5">
                  {distributionData.map((item, idx) => (
                    <div
                      key={item.exercise}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="flex min-w-0 items-center gap-2 text-ink-secondary">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              DONUT_COLORS[idx % DONUT_COLORS.length],
                          }}
                        />
                        <span className="truncate">{item.label}</span>
                      </span>
                      <span className="shrink-0 font-medium text-ink-primary tabular-nums">
                        {item.sessions} sessions · {formatNumber(item.totalReps)} reps
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: Varied proportions: 5-col Monthly Duration + 7-col Rep Progression */}
          <div data-scroll-reveal className="grid gap-4 lg:grid-cols-12">
            <Card className="min-w-0 lg:col-span-5">
              <CardHeader>
                <CardTitle>Monthly active duration</CardTitle>
                <CardDescription>
                  Total active seconds trained over the past 6 months
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={data?.monthly ?? []}
                      margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                    >
                      <CartesianGrid
                        vertical={false}
                        stroke="rgba(255,255,255,0.06)"
                      />
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#9AA49B", fontSize: 12 }}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "#6C766E", fontSize: 11 }}
                      />
                      <Tooltip
                        formatter={(value: number) => [
                          formatDuration(value),
                          "Active duration",
                        ]}
                        contentStyle={{
                          backgroundColor: "#171E19",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "8px",
                          fontSize: "12px",
                          color: "#F5F7F2",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="durationSeconds"
                        stroke="#C6FF4D"
                        strokeWidth={2}
                        fill="rgba(198,255,77,0.12)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="min-w-0 lg:col-span-7">
              <CardHeader className="flex-col items-stretch justify-between gap-3 space-y-0 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <CardTitle>Exercise rep progression</CardTitle>
                  <CardDescription>
                    Best single session:{" "}
                    <span className="font-medium text-ink-primary tabular-nums">
                      {selectedExerciseData?.bestSessionReps ?? 0} reps
                    </span>
                  </CardDescription>
                </div>
                <div className="w-full sm:w-44">
                  <Select
                    value={selectedExercise}
                    onValueChange={(v) => setSelectedExercise(v as ExerciseType)}
                  >
                    <SelectTrigger aria-label="Select exercise progression">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXERCISE_ORDER.map((id) => (
                        <SelectItem key={id} value={id}>
                          {EXERCISES[id].shortLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                {!selectedExerciseData ||
                  selectedExerciseData.progression.length === 0 ? (
                  <div className="flex h-[240px] items-center justify-center text-sm text-ink-secondary">
                    No {EXERCISES[selectedExercise].shortLabel.toLowerCase()}{" "}
                    sessions logged in this range
                  </div>
                ) : (
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={selectedExerciseData.progression}
                        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                      >
                        <CartesianGrid
                          vertical={false}
                          stroke="rgba(255,255,255,0.06)"
                        />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tick={{ fill: "#9AA49B", fontSize: 11 }}
                        />
                        <YAxis
                          tickLine={false}
                          axisLine={false}
                          allowDecimals={false}
                          tick={{ fill: "#6C766E", fontSize: 11 }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#171E19",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "8px",
                            fontSize: "12px",
                            color: "#F5F7F2",
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="reps"
                          stroke="#C6FF4D"
                          strokeWidth={2}
                          dot={{ r: 3.5, fill: "#C6FF4D" }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </PageChoreography>
  );
}
