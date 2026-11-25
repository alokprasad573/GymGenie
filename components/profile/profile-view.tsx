"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { PageChoreography } from "@/components/animations/page-choreography";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { apiFetch, ClientRequestError } from "@/features/auth/auth-api-client";
import type { PublicUser } from "@/types/dto";

interface ProfileViewProps {
  initialUser: PublicUser;
}

export function ProfileView({ initialUser }: ProfileViewProps) {
  const router = useRouter();
  const { pushToast } = useToast();

  const [name, setName] = React.useState(initialUser.name ?? "");
  const [username, setUsername] = React.useState(
    initialUser.displayUsername || initialUser.username
  );
  const [avatarUrl, setAvatarUrl] = React.useState(initialUser.avatarUrl ?? "");
  const [enableVoice, setEnableVoice] = React.useState(
    initialUser.preferences.enableVoice
  );
  const [enableAiCoaching, setEnableAiCoaching] = React.useState(
    initialUser.preferences.enableAiCoaching
  );
  const [defaultRestSeconds, setDefaultRestSeconds] = React.useState(
    initialUser.preferences.defaultRestSeconds
  );
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [profileError, setProfileError] = React.useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [savingPassword, setSavingPassword] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);

  async function handleSaveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingProfile(true);
    setProfileError(null);

    try {
      await apiFetch<{ user: PublicUser }>("/api/users/me", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          username: username.trim(),
          avatarUrl: avatarUrl.trim(),
          preferences: {
            enableVoice,
            enableAiCoaching,
            defaultRestSeconds,
          },
        }),
      });
      pushToast({
        title: "Profile updated",
        description: "Your account and workout defaults have been saved.",
        variant: "success",
      });
      router.refresh();
    } catch (err) {
      setProfileError(
        err instanceof ClientRequestError
          ? err.message
          : "Unable to save profile changes."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordError(null);

    try {
      await apiFetch("/api/users/me/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      pushToast({
        title: "Password updated",
        description: "All other active sessions have been signed out.",
        variant: "success",
      });
    } catch (err) {
      setPasswordError(
        err instanceof ClientRequestError
          ? err.message
          : "Unable to update password."
      );
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <PageChoreography className="space-y-4">
      {/* Header Bento Cell */}
      <div className="bento-cell  flex flex-wrap items-end justify-between gap-4 p-5 sm:p-6">
        <div>
          <h1 className="mt-1 text-2xl font-medium tracking-[-0.025em] text-ink-primary sm:text-[30px]">
            Profile and settings
          </h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Manage your account details, default training preferences, and password security
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full sm:w-auto"
          onClick={() => void handleLogout()}
        >
          <LogOut className="h-4 w-4" strokeWidth={1.5} />
          Sign out
        </Button>
      </div>

      {/* Compact Account Summary Bento Strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="bento-cell px-4 py-3.5">
          <span className="block  text-[11px] text-ink-muted">
            Username
          </span>
          <span className="mt-1 block truncate  text-sm font-medium text-ink-primary">
            @{initialUser.displayUsername || initialUser.username}
          </span>
        </div>
        <div className="bento-cell px-4 py-3.5">
          <span className="block  text-[11px] text-ink-muted">
            Default rest
          </span>
          <span className="mt-1 block  text-sm font-medium text-accent tabular-nums">
            {defaultRestSeconds}s
          </span>
        </div>
        <div className="bento-cell flex items-center justify-between gap-2 px-4 py-3.5">
          <div>
            <span className="block  text-[11px] text-ink-muted">
              Active modules
            </span>
            <span className="mt-1 block text-xs text-ink-secondary">
              {enableVoice ? "Voice on" : "Voice off"} ·{" "}
              {enableAiCoaching ? "AI coach on" : "Local cues"}
            </span>
          </div>
          <Badge variant="neutral">Local vision</Badge>
        </div>
      </div>

      {/* 7/5 Asymmetric Bento Settings Grid */}
      <div className="grid gap-4 lg:grid-cols-12">
        <Card className="min-w-0 lg:col-span-7">
          <CardHeader>
            <CardTitle>Account and workout defaults</CardTitle>
            <CardDescription className="break-all  text-xs">
              Email: {initialUser.email}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {profileError ? (
                <div
                  role="alert"
                  className="rounded-[10px] border border-status-danger/35 bg-[#2B1517]/70 px-3 py-2.5 text-sm text-[#FCA5A5]"
                >
                  {profileError}
                </div>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="profileName">Display name</Label>
                  <Input
                    id="profileName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Rivera"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="profileUsername">Username</Label>
                  <Input
                    id="profileUsername"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="profileAvatar">
                  Avatar URL (HTTPS or relative path)
                </Label>
                <Input
                  id="profileAvatar"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="defaultRest">
                  Default rest duration (seconds)
                </Label>
                <Input
                  id="defaultRest"
                  type="number"
                  min={0}
                  max={600}
                  step={5}
                  value={defaultRestSeconds}
                  onChange={(e) =>
                    setDefaultRestSeconds(
                      Math.max(0, Number.parseInt(e.target.value, 10) || 0)
                    )
                  }
                  className="w-full  tabular-nums sm:max-w-40"
                />
              </div>

              <div className="space-y-2.5 border-t border-[rgba(255,255,255,0.06)] pt-4">
                <div className="bento-well flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink-primary">
                      Enable voice feedback by default
                    </p>
                    <p className="text-xs text-ink-secondary">
                      Uses browser SpeechSynthesis during live workouts
                    </p>
                  </div>
                  <Switch
                    aria-label="Enable voice feedback by default"
                    checked={enableVoice}
                    onCheckedChange={setEnableVoice}
                  />
                </div>

                <div className="bento-well flex items-center justify-between gap-4 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink-primary">
                      Enable AI coaching by default
                    </p>
                    <p className="text-xs text-ink-secondary">
                      Requests event-driven form cues from server-side Groq
                    </p>
                  </div>
                  <Switch
                    aria-label="Enable AI coaching by default"
                    checked={enableAiCoaching}
                    onCheckedChange={setEnableAiCoaching}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full sm:w-auto"
                disabled={savingProfile}
              >
                {savingProfile ? "Saving changes..." : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="min-w-0 lg:col-span-5">
          <CardHeader>
            <CardTitle>Change password</CardTitle>
            <CardDescription>
              Updating your password revokes all other active refresh sessions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {passwordError ? (
                <div
                  role="alert"
                  className="rounded-[10px] border border-status-danger/35 bg-[#2B1517]/70 px-3 py-2.5 text-sm text-[#FCA5A5]"
                >
                  {passwordError}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Current password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters with letters and numbers"
                />
              </div>

              <Button
                type="submit"
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={savingPassword}
              >
                {savingPassword ? "Updating password..." : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageChoreography>
  );
}
