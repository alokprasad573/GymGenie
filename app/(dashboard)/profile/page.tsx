import { redirect } from "next/navigation";
import { ProfileView } from "@/components/profile/profile-view";
import { getServerSessionUser } from "@/services/auth/session-guard";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getServerSessionUser();
  if (!user) {
    redirect("/login");
  }

  return <ProfileView initialUser={user} />;
}
