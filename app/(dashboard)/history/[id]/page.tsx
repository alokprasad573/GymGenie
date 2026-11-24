import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/ui/state-panel";
import { WorkoutDetailView } from "@/components/workout/workout-detail-view";
import { getServerSessionUser } from "@/services/auth/session-guard";
import { workoutService } from "@/services/workout/workout.service";
import type { WorkoutDTO } from "@/repositories/workout.repository";

export const dynamic = "force-dynamic";

export default async function WorkoutDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getServerSessionUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  let workout: WorkoutDTO | null = null;
  try {
    workout = await workoutService.getWorkout(user.id, id);
  } catch {
    workout = null;
  }

  if (!workout) {
    return (
      <StatePanel
        variant="error"
        title="Workout not found"
        description="This workout record either does not exist or belongs to another account."
        action={
          <Button asChild variant="secondary">
            <Link href="/history">Return to history</Link>
          </Button>
        }
      />
    );
  }

  return <WorkoutDetailView initialWorkout={workout} />;
}
