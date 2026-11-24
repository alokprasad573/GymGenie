"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { PageChoreography } from "@/components/animations/page-choreography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatePanel } from "@/components/ui/state-panel";
import { useToast } from "@/components/ui/toast";
import { EXERCISE_ORDER, EXERCISES } from "@/config/exercises";
import { apiFetch, ClientRequestError } from "@/features/auth/auth-api-client";
import { formatDuration, formatShortDate } from "@/lib/utils";
import type { PaginatedWorkouts, WorkoutDTO } from "@/types/dto";

interface HistoryViewProps {
  initialData: PaginatedWorkouts | null;
  initialError?: string | null;
}

export function HistoryView({ initialData, initialError }: HistoryViewProps) {
  const { pushToast } = useToast();
  const [data, setData] = React.useState<PaginatedWorkouts | null>(initialData);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(initialError ?? null);
  const [page, setPage] = React.useState(1);
  const [exerciseFilter, setExerciseFilter] = React.useState<string>("all");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [rangeFilter, setRangeFilter] = React.useState<string>("all");
  const [pendingDelete, setPendingDelete] = React.useState<WorkoutDTO | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const isFirstRender = React.useRef(true);

  const loadWorkouts = React.useCallback(
    async (
      nextPage: number,
      ex: string,
      status: string,
      range: string
    ) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(nextPage),
          limit: "10",
        });
        if (ex !== "all") params.set("exercise", ex);
        if (status !== "all") params.set("status", status);
        if (range !== "all") {
          const days = Number.parseInt(range, 10);
          if (Number.isFinite(days)) {
            const from = new Date(Date.now() - days * 86_400_000);
            params.set("from", from.toISOString());
          }
        }
        const result = await apiFetch<PaginatedWorkouts>(
          `/api/workouts?${params.toString()}`
        );
        setData(result);
      } catch (err) {
        setError(
          err instanceof ClientRequestError
            ? err.message
            : "Could not load workout history."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    void loadWorkouts(page, exerciseFilter, statusFilter, rangeFilter);
  }, [page, exerciseFilter, statusFilter, rangeFilter, loadWorkouts]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/workouts/${pendingDelete.id}`, {
        method: "DELETE",
      });
      pushToast({ title: "Workout removed", variant: "success" });
      setPendingDelete(null);
      await loadWorkouts(page, exerciseFilter, statusFilter, rangeFilter);
    } catch (err) {
      pushToast({
        title: "Delete failed",
        description:
          err instanceof ClientRequestError
            ? err.message
            : "Unable to delete workout.",
        variant: "error",
      });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <PageChoreography
      revealKey={`${page}-${exerciseFilter}-${statusFilter}-${rangeFilter}-${loading ? "loading" : "ready"}`}
      className="space-y-6"
    >
      <div
        data-page-header
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-medium tracking-[-0.02em] text-ink-primary sm:text-[30px]">
            Workout history
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Filter persisted sessions by movement, status, or date and inspect set logs
          </p>
        </div>
        <Button asChild variant="primary" className="w-full sm:w-auto">
          <Link href="/workout/setup">Start workout</Link>
        </Button>
      </div>

      {/* Filters */}
      <div data-page-header className="grid gap-3 sm:grid-cols-3 lg:max-w-2xl">
        <Select
          value={exerciseFilter}
          onValueChange={(v) => {
            setPage(1);
            setExerciseFilter(v);
          }}
        >
          <SelectTrigger aria-label="Filter by exercise">
            <SelectValue placeholder="All exercises" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All exercises</SelectItem>
            {EXERCISE_ORDER.map((id) => (
              <SelectItem key={id} value={id}>
                {EXERCISES[id].shortLabel}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setPage(1);
            setStatusFilter(v);
          }}
        >
          <SelectTrigger aria-label="Filter by status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="INTERRUPTED">Interrupted</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={rangeFilter}
          onValueChange={(v) => {
            setPage(1);
            setRangeFilter(v);
          }}
        >
          <SelectTrigger aria-label="Filter by date range">
            <SelectValue placeholder="All time" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : error ? (
        <StatePanel
          variant="error"
          title="Could not load workouts"
          description={error}
          action={
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                void loadWorkouts(page, exerciseFilter, statusFilter, rangeFilter)
              }
            >
              Retry
            </Button>
          }
        />
      ) : !data || data.items.length === 0 ? (
        <StatePanel
          variant="empty"
          title="No workouts match these filters"
          description="Complete a workout session or widen your exercise and date filters to view past logs."
          action={
            <Button asChild variant="primary">
              <Link href="/workout/setup">Start a workout</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Card data-stagger-item className="overflow-hidden">
            <CardContent className="p-0">
              {/* Column headers on tablet & desktop */}
              <div
                aria-hidden="true"
                className="hidden border-b border-[rgba(255,255,255,0.08)] px-5 py-3.5 text-xs font-medium text-ink-muted md:grid md:grid-cols-[minmax(0,2fr)_minmax(0,1.25fr)_72px_72px_92px_116px_112px] md:items-center md:gap-3"
              >
                <span>Exercise</span>
                <span>Date</span>
                <span className="text-right">Reps</span>
                <span className="text-right">Sets</span>
                <span className="text-right">Duration</span>
                <span>Status</span>
                <span className="text-right">Actions</span>
              </div>

              <ul
                aria-label="Workout sessions"
                className="divide-y divide-[rgba(255,255,255,0.06)]"
              >
                {data.items.map((w) => (
                  <li
                    key={w.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2.5 px-4 py-4 text-sm transition-colors hover:bg-elevated/60 md:grid-cols-[minmax(0,2fr)_minmax(0,1.25fr)_72px_72px_92px_116px_112px] md:gap-3 md:px-5 md:py-3.5"
                  >
                    {/* Exercise */}
                    <div className="min-w-0 md:order-1">
                      <Link
                        href={`/history/${w.id}`}
                        className="font-medium text-ink-primary transition-colors hover:text-accent"
                      >
                        {EXERCISES[w.exerciseName].label}
                      </Link>
                    </div>

                    {/* Status (top-right on mobile, 6th column on tablet/desktop) */}
                    <div className="shrink-0 justify-self-end md:order-6 md:justify-self-start">
                      <Badge
                        variant={
                          w.status === "COMPLETED" ? "accent" : "warning"
                        }
                      >
                        {w.status === "COMPLETED"
                          ? "Completed"
                          : "Interrupted"}
                      </Badge>
                    </div>

                    {/* Date */}
                    <div className="col-span-2 text-xs text-ink-secondary md:order-2 md:col-span-1 md:text-sm">
                      {formatShortDate(w.startedAt)}
                    </div>

                    {/* Reps / Sets / Duration (compact 3-col strip on mobile, individual columns on md+) */}
                    <div className="col-span-2 grid grid-cols-3 gap-2 rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-canvas px-3 py-2 text-xs md:contents md:rounded-none md:border-0 md:bg-transparent md:p-0 md:text-sm">
                      <div className="md:order-3 md:text-right">
                        <span className="block text-[11px] text-ink-muted md:hidden">
                          Reps
                        </span>
                        <span className="font-medium text-ink-primary tabular-nums">
                          {w.totalReps}
                        </span>
                      </div>
                      <div className="md:order-4 md:text-right">
                        <span className="block text-[11px] text-ink-muted md:hidden">
                          Sets
                        </span>
                        <span className="font-medium text-ink-secondary tabular-nums">
                          {w.totalSets}/{w.targetSets}
                        </span>
                      </div>
                      <div className="md:order-5 md:text-right">
                        <span className="block text-[11px] text-ink-muted md:hidden">
                          Duration
                        </span>
                        <span className="font-medium text-ink-secondary tabular-nums">
                          {formatDuration(w.durationSeconds)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-between gap-2 pt-0.5 md:order-7 md:col-span-1 md:justify-end md:pt-0">
                      <Link
                        href={`/history/${w.id}`}
                        className="inline-flex min-h-9 items-center rounded-[6px] px-2.5 text-xs font-medium text-ink-secondary transition-colors hover:bg-elevated hover:text-ink-primary md:px-2"
                      >
                        Details
                      </Link>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${EXERCISES[w.exerciseName].shortLabel} workout`}
                        onClick={() => setPendingDelete(w)}
                        className="text-ink-muted hover:text-status-danger"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Pagination */}
          <div
            data-stagger-item
            className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-secondary"
          >
            <span className="font-medium tabular-nums">
              Page {data.page} of {Math.max(1, data.totalPages)} · {data.total}{" "}
              sessions
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={data.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={data.page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        </>
      )}

      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workout session?</DialogTitle>
            <DialogDescription>
              This permanently removes this{" "}
              {pendingDelete
                ? EXERCISES[pendingDelete.exerciseName].shortLabel.toLowerCase()
                : ""}{" "}
              record and updates your analytics totals.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void confirmDelete()}
            >
              {deleting ? "Deleting..." : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageChoreography>
  );
}
