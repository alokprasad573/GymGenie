"use client";

import * as React from "react";
import Link from "next/link";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState("");
  const [submittedMessage, setSubmittedMessage] = React.useState<string | null>(
    null
  );
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmittedMessage(null);
    setSubmitting(true);

    try {
      const result = await apiFetch<{ message: string }>(
        "/api/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({ email }),
        },
        { retryOnUnauthorized: false }
      );
      setSubmittedMessage(result.message);
    } catch (err) {
      if (err instanceof ClientRequestError) {
        setError(err.message);
      } else {
        setError("Unable to process your request right now.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <span className="font-mono text-[11px] text-accent">
          Account recovery
        </span>
        <CardTitle className="text-xl">Reset your password</CardTitle>
        <CardDescription>
          Enter your account email to request a single-use password reset token.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {submittedMessage ? (
          <div className="space-y-4">
            <div
              role="status"
              className="rounded-[8px] border border-accent/30 bg-accent/10 px-3.5 py-3 text-sm text-ink-primary"
            >
              {submittedMessage}
            </div>
            <div className="flex items-center justify-between text-sm">
              <Link
                href="/reset-password"
                className="text-accent underline-offset-4 hover:underline"
              >
                Have a reset token? Set new password
              </Link>
              <Link
                href="/login"
                className="text-ink-secondary hover:text-ink-primary"
              >
                Sign in
              </Link>
            </div>
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
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="athlete@example.com"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? "Sending request..." : "Request password reset"}
            </Button>

            <p className="text-center text-sm text-ink-secondary">
              <Link href="/login" className="hover:text-ink-primary">
                Return to sign in
              </Link>
            </p>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
