"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { PageChoreography } from "@/components/animations/page-choreography";
import { BENTO_SERIES_COLORS } from "@/lib/chart-palette";
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

const LazyDailyVolumeBarChart = dynamic(
  () =>
    import("@/components/analytics/analytics-charts").then(
      (m) => m.DailyVolumeBarChart
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[288px] w-full rounded-[10px]" />,
  }
);

const LazyExerciseDistributionDonut = dynamic(
  () =>
    import("@/components/analytics/analytics-charts").then(
      (m) => m.ExerciseDistributionDonut
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[176px] w-full rounded-[10px]" />,
  }
);

const LazyMonthlyDurationAreaChart = dynamic(
  () =>
    import("@/components/analytics/analytics-charts").then(
      (m) => m.MonthlyDurationAreaChart
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[244px] w-full rounded-[10px]" />,
  }
);

const LazyExerciseProgressionLineChart = dynamic(
  () =>
    import("@/components/analytics/analytics-charts").then(
      (m) => m.ExerciseProgressionLineChart
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[244px] w-full rounded-[10px]" />,
  }
);

export interface AnalyticsDataSnapshot {
  weekly: DailyActivityPoint[];
  monthly: MonthlyActivityPoint[];
  exercises: ExerciseAnalyticsItem[];
}

interface AnalyticsViewProps {
  initialData?: AnalyticsDataSnapshot | null;
  initialError?: string | null;
}

export function AnalyticsView({
  initialData = null,
  initialError = null,
}: AnalyticsViewProps) {
  const [days, setDays] = React.useState<string>("30");
  const [reloadCount, setReloadCount] = React.useState(0);
  const [selectedExercise, setSelectedExercise] =
    React.useState<ExerciseType>("squats");
  const [data, setData] = React.useState<AnalyticsDataSnapshot | null>(
    initialData
  );
  const [loading, setLoading] = React.useState(
    !initialData && !initialError
  );
  const [error, setError] = React.useState<string | null>(initialError);
  const skipInitialFetchRef = React.useRef(
    Boolean(initialData || initialError)
  );

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
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

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
    <PageChoreography className="space-y-4">
      {/* Header Bento Cell */}
      <div className="bento-cell flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
        <div>
          <h1 className="mt-1 text-2xl font-medium tracking-[-0.025em] text-ink-primary sm:text-[30px]">
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
          <Skeleton className="h-[340px] rounded-[16px] lg:col-span-8" />
          <Skeleton className="h-[340px] rounded-[16px] lg:col-span-4" />
          <Skeleton className="h-[320px] rounded-[16px] lg:col-span-5" />
          <Skeleton className="h-[320px] rounded-[16px] lg:col-span-7" />
        </div>
      ) : error ? (
        <StatePanel
          variant="error"
          title="Could not load analytics"
          description={error}
          action={
            <Button type="button" variant="secondary" onClick={handleRetry}>
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
          {/* Summary Bento KPI strip */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              indexLabel="01"
              label="Total workout sessions"
              value={formatNumber(totalSessionsInWindow)}
              context={`Last ${days} days`}
            />
            <MetricCard
              indexLabel="02"
              label="Total tracked reps"
              value={formatNumber(totalRepsInWindow)}
              context="Persisted rep count"
              accent
            />
            <MetricCard
              indexLabel="03"
              label="Total active time"
              value={formatDuration(totalDurationInWindow)}
              context="Tracked set duration"
            />
            <MetricCard
              indexLabel="04"
              label="Top movement"
              value={
                topMovement ? EXERCISES[topMovement.exercise].shortLabel : "None"
              }
              context={
                topMovement
                  ? `${formatNumber(topMovement.totalReps)} reps logged`
                  : "No sessions yet"
              }
            />
          </div>

          {/* Row 1: Wide Daily Volume Bar (8 cols) + Exercise Distribution (4 cols) */}
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="min-w-0 lg:col-span-8">
              <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle>Daily workout volume</CardTitle>
                  <CardDescription>
                    Total reps logged per UTC day over the last {days} days
                  </CardDescription>
                </div>
                <span className="rounded-[6px] border border-[rgba(255,255,255,0.08)] bg-canvas px-2.5 py-1  text-[11px] text-ink-secondary tabular-nums">
                  {days}d series
                </span>
              </CardHeader>
              <CardContent className="pt-2">
                <LazyDailyVolumeBarChart data={data?.weekly ?? []} />
              </CardContent>
            </Card>

            <Card className="min-w-0 lg:col-span-4">
              <CardHeader>
                <CardTitle>Exercise distribution</CardTitle>
                <CardDescription>Share of sessions by movement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <LazyExerciseDistributionDonut data={distributionData} />
                <div className="space-y-2 border-t border-[rgba(255,255,255,0.06)] pt-3">
                  {distributionData.map((item, idx) => {
                    const sharePct = Math.round(
                      (item.sessions / Math.max(1, totalSessionsInWindow)) * 100
                    );
                    const color =
                      BENTO_SERIES_COLORS[idx % BENTO_SERIES_COLORS.length];
                    return (
                      <div key={item.exercise} className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <span className="flex min-w-0 items-center gap-2 text-ink-secondary">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="truncate">{item.label}</span>
                          </span>
                          <span className="shrink-0  text-md font-medium text-ink-primary tabular-nums">
                            {item.sessions} session · {formatNumber(item.totalReps)} reps
                          </span>
                        </div>
                        <div
                          aria-hidden="true"
                          className="h-1 w-full overflow-hidden rounded-full bg-canvas"
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(4, sharePct)}%`,
                              backgroundColor: color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Row 2: 5-col Monthly Duration + 7-col Rep Progression */}
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="min-w-0 lg:col-span-5">
              <CardHeader>
                <CardTitle>Monthly active duration</CardTitle>
                <CardDescription>
                  Total active seconds trained over the past 6 months
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <LazyMonthlyDurationAreaChart data={data?.monthly ?? []} />
              </CardContent>
            </Card>

            <Card className="min-w-0 lg:col-span-7">
              <CardHeader className="flex-col items-stretch justify-between gap-3 space-y-0 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <CardTitle>Exercise rep progression</CardTitle>
                  <CardDescription>
                    Best single session:{" "}
                    <span className=" font-medium text-accent tabular-nums">
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
                  <div className="bento-well flex h-[244px] items-center justify-center text-sm text-ink-secondary">
                    No {EXERCISES[selectedExercise].shortLabel.toLowerCase()}{" "}
                    sessions logged in this range
                  </div>
                ) : (
                  <LazyExerciseProgressionLineChart
                    data={selectedExerciseData.progression}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </PageChoreography>
  );
}
