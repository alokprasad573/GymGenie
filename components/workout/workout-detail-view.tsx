"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
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
import { useToast } from "@/components/ui/toast";
import { EXERCISES } from "@/config/exercises";
import { apiFetch, ClientRequestError } from "@/features/auth/auth-api-client";
import { formatDuration, formatShortDate } from "@/lib/utils";
import type { WorkoutDTO } from "@/types/dto";

interface WorkoutDetailViewProps {
  initialWorkout: WorkoutDTO;
}

export function WorkoutDetailView({ initialWorkout }: WorkoutDetailViewProps) {
  const router = useRouter();
  const { pushToast } = useToast();
  const [workout, setWorkout] = React.useState(initialWorkout);
  const [notes, setNotes] = React.useState(initialWorkout.notes ?? "");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const def = EXERCISES[workout.exerciseName];

  async function handleSaveNotes(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await apiFetch<{ workout: WorkoutDTO }>(
        `/api/workouts/${workout.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ notes }),
        }
      );
      setWorkout(res.workout);
      pushToast({ title: "Notes saved", variant: "success" });
    } catch (err) {
      pushToast({
        title: "Save failed",
        description:
          err instanceof ClientRequestError ? err.message : "Could not update notes.",
        variant: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/workouts/${workout.id}`, { method: "DELETE" });
      pushToast({ title: "Workout deleted", variant: "success" });
      router.push("/history");
      router.refresh();
    } catch {
      pushToast({
        title: "Delete failed",
        description: "Unable to delete workout right now.",
        variant: "error",
      });
      setDeleting(false);
    }
  }

  return (
    <PageChoreography className="space-y-6">
      <div
        data-page-header
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div className="min-w-0 space-y-1">
          <Link
            href="/history"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-[6px] text-xs text-ink-secondary transition-colors hover:text-ink-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            Back to history
          </Link>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-medium tracking-[-0.02em] text-ink-primary">
              {def.label}
            </h1>
            <Badge
              variant={workout.status === "COMPLETED" ? "accent" : "warning"}
            >
              {workout.status === "COMPLETED" ? "Completed" : "Interrupted"}
            </Badge>
          </div>
          <p className="text-sm text-ink-secondary">
            Logged on {formatShortDate(workout.startedAt)}
          </p>
        </div>

        <Button
          type="button"
          variant="destructive"
          className="w-full sm:w-auto"
          disabled={deleting}
          onClick={() => void handleDelete()}
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.5} />
          {deleting ? "Deleting..." : "Delete workout"}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          data-stagger-item
          label="Total reps"
          value={workout.totalReps}
          context={`Target ${workout.targetReps} reps per set`}
          accent
        />
        <MetricCard
          data-stagger-item
          label="Sets logged"
          value={`${workout.totalSets} / ${workout.targetSets}`}
          context="Completed or partial sets"
        />
        <MetricCard
          data-stagger-item
          label="Active duration"
          value={formatDuration(workout.durationSeconds)}
          context="Excludes pauses and rest"
        />
      </div>

      <div data-scroll-reveal className="grid gap-6 lg:grid-cols-12">
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Set breakdown</CardTitle>
            <CardDescription>
              Per-set reps and active durations captured during this session
            </CardDescription>
          </CardHeader>
          <CardContent>
            {workout.sets.length === 0 ? (
              <p className="text-sm text-ink-secondary">
                No individual set rows recorded for this session.
              </p>
            ) : (
              <div className="divide-y divide-[rgba(255,255,255,0.06)] rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-canvas">
                {workout.sets.map((s) => (
                  <div
                    key={s.setNumber}
                    className="flex items-center justify-between px-4 py-3 text-sm"
                  >
                    <span className="text-ink-secondary">Set {s.setNumber}</span>
                    <div className="flex items-center gap-6 font-medium tabular-nums">
                      <span className="text-ink-primary">{s.reps} reps</span>
                      <span className="text-ink-muted">
                        {s.durationSeconds !== undefined
                          ? formatDuration(s.durationSeconds)
                          : "-"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-5">
          {workout.exerciseMetrics &&
            Object.keys(workout.exerciseMetrics).length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Final detector snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {Object.entries(workout.exerciseMetrics).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.06)] py-2 text-sm last:border-b-0"
                  >
                    <span className="min-w-0 break-words text-ink-secondary">
                      {k}
                    </span>
                    <span className="shrink-0 font-medium text-ink-primary tabular-nums">
                      {String(v)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Session notes</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveNotes} className="space-y-3">
                <textarea
                  suppressHydrationWarning
                  rows={4}
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes on depth, tempo, or resistance..."
                  className="w-full rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-canvas p-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-accent focus:outline-none"
                />
                <Button type="submit" variant="secondary" disabled={saving}>
                  {saving ? "Saving..." : "Save notes"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageChoreography>
  );
}
