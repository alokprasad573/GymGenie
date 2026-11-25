"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowRight, Dumbbell } from "lucide-react";
import { PageChoreography } from "@/components/animations/page-choreography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MetricCard } from "@/components/ui/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatePanel } from "@/components/ui/state-panel";
import { EXERCISE_ORDER, EXERCISES } from "@/config/exercises";
import { formatDuration, formatNumber, formatShortDate } from "@/lib/utils";
import type { AnalyticsOverview } from "@/types/dto";

const LazyWeeklyVolumeChart = dynamic(
  () =>
    import("@/components/dashboard/weekly-volume-chart").then(
      (m) => m.WeeklyVolumeChart
    ),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[268px] w-full rounded-[10px]" />,
  }
);

interface DashboardViewProps {
  userName: string;
  overview: AnalyticsOverview | null;
  loadError?: string | null;
}

export function DashboardView({
  userName,
  overview,
  loadError,
}: DashboardViewProps) {
  if (loadError || !overview) {
    return (
      <div className="space-y-4">
        <div className="bento-cell  flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div>
            <h1 className="mt-1 text-2xl font-medium tracking-[-0.02em] text-ink-primary sm:text-[28px]">
              Training overview
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Account: {userName}
            </p>
          </div>
          <Button asChild variant="primary">
            <Link href="/workout/setup">
              Start workout
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
          </Button>
        </div>

        <StatePanel
          variant="error"
          title="Could not load training metrics"
          description={
            loadError ??
            "Verify your database connection and refresh the page to view persisted workout history."
          }
          action={
            <Button asChild variant="secondary">
              <Link href="/workout/setup">Configure a workout anyway</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const maxWeeklyReps = Math.max(
    1,
    ...overview.weeklyActivity.map((d) => d.reps)
  );
  const weeklyTotalReps = overview.weeklyActivity.reduce(
    (sum, d) => sum + d.reps,
    0
  );
  const weeklyActiveDays = overview.weeklyActivity.filter(
    (d) => d.workouts > 0
  ).length;
  const peakDay = overview.weeklyActivity.reduce(
    (best, item) => (item.reps > best.reps ? item : best),
    overview.weeklyActivity[0] ?? {
      date: "",
      label: "-",
      workouts: 0,
      reps: 0,
      durationSeconds: 0,
    }
  );

  return (
    <PageChoreography className="space-y-4">
      {/* Header Bento Cell */}
      <div className="bento-cell  flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
        <div className="min-w-0">
          <h1 className="mt-1 text-2xl font-medium tracking-[-0.025em] text-ink-primary sm:text-[30px]">
            Training overview
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {overview.favoriteExercise
              ? `Welcome back ${userName} · Most trained: ${overview.favoriteExercise.label}`
              : `Welcome ${userName} · Ready for your first tracked session`}
          </p>
        </div>

        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
          <Button asChild variant="secondary" className="flex-1 sm:flex-initial">
            <Link href="/analytics">View analytics</Link>
          </Button>
          <Button asChild variant="primary" className="flex-1 sm:flex-initial">
            <Link href="/workout/setup">
              <Dumbbell className="h-4 w-4" strokeWidth={1.5} />
              Start workout
            </Link>
          </Button>
        </div>
      </div>

      {/* 4-Column Bento KPI Strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          indexLabel="01"
          label="Total workouts"
          value={formatNumber(overview.totalWorkouts)}
          context={`${formatNumber(overview.completedWorkouts)} completed in last 365 days`}
        />
        <MetricCard
          indexLabel="02"
          label="Total reps"
          value={formatNumber(overview.totalReps)}
          context={`Across ${formatNumber(overview.totalSets)} logged sets`}
          accent
        />
        <MetricCard
          indexLabel="03"
          label="Active duration"
          value={formatDuration(overview.totalDurationSeconds)}
          context="Monotonic active set time"
        />
        <MetricCard
          indexLabel="04"
          label="Current streak"
          value={`${overview.currentStreakDays}d`}
          context="Consecutive UTC training days"
        />
      </div>

      {overview.totalWorkouts === 0 ? (
        <StatePanel
          variant="empty"
          title="No persisted workouts yet"
          description="Choose one of the five supported exercises, calibrate your camera angle, and complete a set to start building your training log."
          action={
            <Button asChild variant="primary">
              <Link href="/workout/setup">
                Configure first workout
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Primary Bento Graph (8 cols) */}
          <Card className="flex min-w-0 flex-col justify-between lg:col-span-8">
            <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0">
              <div className="min-w-0">
                <CardTitle>Weekly rep volume</CardTitle>
                <CardDescription>
                  Total persisted reps per UTC day over the last 7 days
                </CardDescription>
              </div>
              <span className="rounded-[6px] border border-[rgba(255,255,255,0.08)] bg-canvas px-2.5 py-1  text-[11px] text-ink-secondary tabular-nums">
                7-day window
              </span>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
              <LazyWeeklyVolumeChart
                data={overview.weeklyActivity}
                maxWeeklyReps={maxWeeklyReps}
              />

              <div className="grid grid-cols-3 gap-2.5 border-t border-[rgba(255,255,255,0.07)] pt-3.5">
                <div className="bento-well px-3 py-2">
                  <span className="block text-[11px] text-ink-muted">
                    7-day reps
                  </span>
                  <span className="mt-0.5 block  text-sm font-medium text-ink-primary tabular-nums">
                    {formatNumber(weeklyTotalReps)}
                  </span>
                </div>
                <div className="bento-well px-3 py-2">
                  <span className="block text-[11px] text-ink-muted">
                    Peak day
                  </span>
                  <span className="mt-0.5 block  text-sm font-medium text-accent tabular-nums">
                    {peakDay.reps > 0 ? `${peakDay.label} · ${peakDay.reps}` : "-"}
                  </span>
                </div>
                <div className="bento-well px-3 py-2">
                  <span className="block text-[11px] text-ink-muted">
                    Active days
                  </span>
                  <span className="mt-0.5 block  text-sm font-medium text-ink-primary tabular-nums">
                    {weeklyActiveDays} / 7
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Narrower Recent Sessions Bento Cell (4 cols) */}
          <Card className="min-w-0 lg:col-span-4">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <div className="min-w-0">
                <CardTitle>Recent workouts</CardTitle>
                <CardDescription>Latest logged sessions</CardDescription>
              </div>
              <Link
                href="/history"
                className="inline-flex min-h-8 shrink-0 items-center rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-canvas px-2.5 text-xs text-ink-secondary transition-colors hover:border-[rgba(255,255,255,0.16)] hover:text-ink-primary"
              >
                All history
              </Link>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {overview.recentWorkouts.map((workout) => (
                <Link
                  key={workout.id}
                  href={`/history/${workout.id}`}
                  className="bento-well flex items-center justify-between gap-3 px-3.5 py-3 transition-colors duration-150 hover:border-[rgba(255,255,255,0.16)] hover:bg-elevated"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-primary">
                      {EXERCISES[workout.exerciseName].shortLabel}
                    </p>
                    <p className="mt-0.5  text-[11px] text-ink-muted tabular-nums">
                      {formatShortDate(workout.startedAt)} ·{" "}
                      {formatDuration(workout.durationSeconds)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className=" text-sm font-medium text-ink-primary tabular-nums">
                      {workout.totalReps} reps
                    </span>
                    <Badge
                      variant={
                        workout.status === "COMPLETED" ? "accent" : "warning"
                      }
                    >
                      {workout.status === "COMPLETED"
                        ? "Completed"
                        : "Interrupted"}
                    </Badge>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick-Launch Calibrated Detectors Bento Strip */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-3">
          <div>
            <CardTitle className="text-sm">Calibrated detectors</CardTitle>
            <CardDescription className="text-xs">
              Jump into workout setup for any supported biomechanics model
            </CardDescription>
          </div>
          <Link
            href="/workout/setup"
            className="inline-flex min-h-8 items-center gap-1 rounded-[8px] px-2 text-xs text-ink-secondary transition-colors hover:bg-elevated hover:text-ink-primary"
          >
            Configure session
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
          </Link>
        </CardHeader>
        <CardContent className="grid gap-2.5 pt-0 sm:grid-cols-2 lg:grid-cols-5">
          {EXERCISE_ORDER.map((id) => {
            const ex = EXERCISES[id];
            return (
              <Link
                key={id}
                href="/workout/setup"
                className="bento-well text-sm flex flex-col justify-between gap-2 px-3.5 py-3 transition-colors duration-150 hover:border-accent/35 hover:bg-elevated"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink-primary">
                    {ex.shortLabel}
                  </span>
                  <span className="shrink-0  text-accent tabular-nums">
                    {ex.thresholds.primaryTrigger}°/{ex.thresholds.returnTrigger}°
                  </span>
                </div>
                <span className="truncate text-xs text-ink-muted">
                  {ex.muscleGroup}
                </span>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </PageChoreography>
  );
}
