"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);

    try {
      await apiFetch(
        "/api/auth/register",
        {
          method: "POST",
          body: JSON.stringify({
            name: name.trim() || undefined,
            username: username.trim(),
            email: email.trim(),
            password,
          }),
        },
        { retryOnUnauthorized: false }
      );
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof ClientRequestError) {
        setError(err.message);
        if (err.details) setFieldErrors(err.details);
      } else {
        setError("Unable to create your account right now. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Track workout sessions, pose metrics, and progression across devices.
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
            <Label htmlFor="name">Name (optional)</Label>
            <Input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Rivera"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="alex_fit"
            />
            {fieldErrors.username?.[0] ? (
              <p className="text-xs text-status-danger">{fieldErrors.username[0]}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@example.com"
            />
            {fieldErrors.email?.[0] ? (
              <p className="text-xs text-status-danger">{fieldErrors.email[0]}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters with letters and numbers"
            />
            {fieldErrors.password?.[0] ? (
              <p className="text-xs text-status-danger">{fieldErrors.password[0]}</p>
            ) : null}
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? "Creating account..." : "Create account"}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-ink-secondary">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-ink-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
