import * as React from "react";
import { redirect } from "next/navigation";
import { LiveWorkoutSession } from "@/components/workout/live-workout-session";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerSessionUser } from "@/services/auth/session-guard";

export const dynamic = "force-dynamic";

export default async function WorkoutSessionPage() {
  const user = await getServerSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <React.Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="aspect-video w-full" />
        </div>
      }
    >
      <LiveWorkoutSession />
    </React.Suspense>
  );
}
