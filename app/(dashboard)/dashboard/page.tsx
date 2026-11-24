import { redirect } from "next/navigation";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { getServerSessionUser } from "@/services/auth/session-guard";
import {
  analyticsService,
  type AnalyticsOverview,
} from "@/services/analytics/analytics.service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getServerSessionUser();
  if (!user) {
    redirect("/login");
  }

  let overview: AnalyticsOverview | null = null;
  let loadError: string | null = null;

  try {
    overview = await analyticsService.getOverview(user.id);
  } catch {
    loadError = "Unable to connect to workout storage right now.";
  }

  return (
    <DashboardView
      userName={user.name || user.displayUsername || user.username}
      overview={overview}
      loadError={loadError}
    />
  );
}
