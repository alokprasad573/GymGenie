"use client";

import * as React from "react";
import Link from "next/link";
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
import { StatePanel } from "@/components/ui/state-panel";
import { EXERCISES } from "@/config/exercises";
import { formatDuration, formatNumber, formatShortDate } from "@/lib/utils";
import type { AnalyticsOverview } from "@/types/dto";

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
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-medium tracking-[-0.02em] text-ink-primary sm:text-[30px]">
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

  return (
    <PageChoreography className="space-y-6">
      {/* Header */}
      <div
        data-page-header
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-medium tracking-[-0.02em] text-ink-primary sm:text-[30px]">
            Training overview
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {overview.favoriteExercise
              ? `Signed in as ${userName} · Most trained: ${overview.favoriteExercise.label}`
              : `Signed in as ${userName} · Ready for your first tracked session`}
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

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          data-stagger-item
          label="Total workouts"
          value={formatNumber(overview.totalWorkouts)}
          context={`${formatNumber(overview.completedWorkouts)} completed in last 365 days`}
        />
        <MetricCard
          data-stagger-item
          label="Total reps"
          value={formatNumber(overview.totalReps)}
          context={`Across ${formatNumber(overview.totalSets)} logged sets`}
          accent
        />
        <MetricCard
          data-stagger-item
          label="Active duration"
          value={formatDuration(overview.totalDurationSeconds)}
          context="Monotonic active set time"
        />
        <MetricCard
          data-stagger-item
          label="Current streak"
          value={`${overview.currentStreakDays}d`}
          context="Consecutive UTC training days"
        />
      </div>

      {overview.totalWorkouts === 0 ? (
        <div data-scroll-reveal>
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
        </div>
      ) : (
        <div data-scroll-reveal className="grid gap-4 lg:grid-cols-12">
          {/* Primary chart (2/3 width) */}
          <Card className="min-w-0 lg:col-span-8">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <div className="min-w-0">
                <CardTitle>Weekly rep volume</CardTitle>
                <CardDescription>
                  Total persisted reps per UTC day over the last 7 days
                </CardDescription>
              </div>
              <span className="shrink-0 text-xs font-medium text-ink-muted tabular-nums">
                7-day window
              </span>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={overview.weeklyActivity}
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
                      tick={{ fill: "#9AA49B", fontSize: 12 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      tick={{ fill: "#6C766E", fontSize: 12 }}
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
                    <Bar dataKey="reps" radius={[4, 4, 0, 0]} maxBarSize={44}>
                      {overview.weeklyActivity.map((entry) => (
                        <Cell
                          key={entry.date}
                          fill={
                            entry.reps === maxWeeklyReps && entry.reps > 0
                              ? "#C6FF4D"
                              : "#2B362E"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Narrower recent sessions list (1/3 width) */}
          <Card className="min-w-0 lg:col-span-4">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
              <div className="min-w-0">
                <CardTitle>Recent workouts</CardTitle>
                <CardDescription>Latest logged sessions</CardDescription>
              </div>
              <Link
                href="/history"
                className="inline-flex min-h-9 shrink-0 items-center rounded-[6px] px-2 text-xs text-ink-secondary transition-colors hover:bg-elevated hover:text-ink-primary"
              >
                All history
              </Link>
            </CardHeader>
            <CardContent className="space-y-2 pt-2">
              {overview.recentWorkouts.map((workout) => (
                <Link
                  key={workout.id}
                  href={`/history/${workout.id}`}
                  className="flex items-center justify-between gap-3 rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-canvas px-4 py-3 transition-colors duration-150 hover:border-[rgba(255,255,255,0.14)] hover:bg-elevated"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-primary">
                      {EXERCISES[workout.exerciseName].shortLabel}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      {formatShortDate(workout.startedAt)} ·{" "}
                      {formatDuration(workout.durationSeconds)}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-medium text-ink-primary tabular-nums">
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
    </PageChoreography>
  );
}
