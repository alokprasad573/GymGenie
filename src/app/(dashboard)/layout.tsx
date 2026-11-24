import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getServerSessionUser } from "@/services/auth/session-guard";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerSessionUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <AppShell
      user={{
        id: user.id,
        username: user.username,
        displayUsername: user.displayUsername,
        email: user.email,
        name: user.name,
      }}
    >
      {children}
    </AppShell>
  );
}
