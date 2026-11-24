import { redirect } from "next/navigation";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import { getServerSessionUser } from "@/services/auth/session-guard";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getServerSessionUser();
  if (!user) {
    redirect("/login");
  }

  return <AnalyticsView />;
}
