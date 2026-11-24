"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

function getSafeRedirect(nextParam: string | null): string {
  if (!nextParam || !nextParam.startsWith("/") || nextParam.startsWith("//")) {
    return "/dashboard";
  }
  return nextParam;
}

function LoginFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await apiFetch(
        "/api/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ identifier, password }),
        },
        { retryOnUnauthorized: false }
      );
      const destination = getSafeRedirect(searchParams.get("next"));
      router.push(destination);
      router.refresh();
    } catch (err) {
      if (err instanceof ClientRequestError) {
        setError(err.message);
      } else {
        setError("Unable to sign in right now. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sign in to GymGenie</CardTitle>
        <CardDescription>
          Enter your email or username and password to resume training.
        </CardDescription>
      </CardHeader>
      <CardContent>
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
            <Label htmlFor="identifier">Email or username</Label>
            <Input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="athlete@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-ink-secondary transition-colors hover:text-ink-primary"
              >
                Forgot password
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-secondary">
          New to GymGenie?{" "}
          <Link
            href="/register"
            className="font-medium text-ink-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <Card>
          <CardContent className="p-6 text-sm text-ink-secondary">
            Loading sign-in form...
          </CardContent>
        </Card>
      }
    >
      <LoginFormInner />
    </React.Suspense>
  );
}
