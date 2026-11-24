import { redirect } from "next/navigation";
import { WorkoutSetupView } from "@/components/workout/workout-setup-view";
import { getServerSessionUser } from "@/services/auth/session-guard";

export const dynamic = "force-dynamic";

export default async function WorkoutSetupPage() {
  const user = await getServerSessionUser();
  if (!user) {
    redirect("/login");
  }

  return <WorkoutSetupView initialPreferences={user.preferences} />;
}
