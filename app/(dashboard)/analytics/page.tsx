import { redirect } from "next/navigation";
import {
  AnalyticsView,
  type AnalyticsDataSnapshot,
} from "@/components/analytics/analytics-view";
import { getServerSessionUser } from "@/services/auth/session-guard";
import { analyticsService } from "@/services/analytics/analytics.service";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getServerSessionUser();
  if (!user) {
    redirect("/login");
  }

  let initialData: AnalyticsDataSnapshot | null = null;
  let initialError: string | null = null;

  try {
    const [weeklyRes, monthlyRes, exercisesRes] = await Promise.all([
      analyticsService.getWeekly(user.id, 30),
      analyticsService.getMonthly(user.id, 6),
      analyticsService.getExercises(user.id, 30),
    ]);

    initialData = {
      weekly: weeklyRes.series,
      monthly: monthlyRes.series,
      exercises: exercisesRes.exercises,
    };
  } catch {
    initialError = "Unable to load analytics data right now.";
  }

  return (
    <AnalyticsView initialData={initialData} initialError={initialError} />
  );
}
