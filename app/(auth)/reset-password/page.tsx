"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
import { apiFetch, ClientRequestError } from "@/features/auth/auth-api-client";

function ResetPasswordInner() {
  const searchParams = useSearchParams();
  const [token, setToken] = React.useState(searchParams.get("token") ?? "");
  const [newPassword, setNewPassword] = React.useState("");
  const [success, setSuccess] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const result = await apiFetch<{ message: string }>(
        "/api/auth/reset-password",
        {
          method: "POST",
          body: JSON.stringify({ token, newPassword }),
        },
        { retryOnUnauthorized: false }
      );
      setSuccess(result.message);
    } catch (err) {
      if (err instanceof ClientRequestError) {
        setError(err.message);
      } else {
        setError("Unable to reset password right now.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card graphGrid>
      <CardHeader>
        <span className="font-mono text-[11px] text-accent">
          Password update
        </span>
        <CardTitle className="text-xl">Set a new password</CardTitle>
        <CardDescription>
          Paste your single-use reset token and choose a new password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="space-y-4">
            <div
              role="status"
              className="rounded-[8px] border border-accent/30 bg-accent/10 px-3.5 py-3 text-sm text-ink-primary"
            >
              {success}
            </div>
            <Button asChild variant="primary" className="w-full">
              <Link href="/login">Continue to sign in</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {error ? (
              <div
                role="alert"
                className="rounded-[8px] border border-status-danger/35 bg-[#2B1517]/60 px-3 py-2.5 text-sm text-[#FCA5A5]"
              >
                {error}
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="token">Reset token</Label>
              <Input
                id="token"
                name="token"
                type="text"
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste reset token"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                name="newPassword"
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
              variant="primary"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? "Updating password..." : "Update password"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <React.Suspense
      fallback={
        <Card>
          <CardContent className="p-6 text-sm text-ink-secondary">
            Loading reset form...
          </CardContent>
        </Card>
      }
    >
      <ResetPasswordInner />
    </React.Suspense>
  );
}
