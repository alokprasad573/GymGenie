import { redirect } from "next/navigation";
import { HistoryView } from "@/components/workout/history-view";
import { getServerSessionUser } from "@/services/auth/session-guard";
import { workoutService } from "@/services/workout/workout.service";
import type { PaginatedWorkouts } from "@/repositories/workout.repository";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await getServerSessionUser();
  if (!user) {
    redirect("/login");
  }

  let initialData: PaginatedWorkouts | null = null;
  let initialError: string | null = null;

  try {
    initialData = await workoutService.listWorkouts(user.id, {
      page: 1,
      limit: 10,
    });
  } catch {
    initialError = "Unable to connect to workout storage right now.";
  }

  return <HistoryView initialData={initialData} initialError={initialError} />;
}
