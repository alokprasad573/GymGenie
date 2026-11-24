import "server-only";
import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function normalizeOrigin(urlString: string): string | null {
  try {
    const parsed = new URL(urlString);
    return parsed.origin.toLowerCase();
  } catch {
    return null;
  }
}

export function assertSameOriginRequest(request: NextRequest): void {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    return;
  }

  const allowedOrigins = new Set<string>();
  const appUrl = process.env.APP_URL;
  if (appUrl) {
    const normalized = normalizeOrigin(appUrl);
    if (normalized) allowedOrigins.add(normalized);
  }

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (request.nextUrl.protocol.replace(":", "") || "http");

  if (host) {
    const hostOrigin = normalizeOrigin(`${proto}://${host}`);
    if (hostOrigin) allowedOrigins.add(hostOrigin);
  }

  if (request.nextUrl.origin && request.nextUrl.origin !== "null") {
    allowedOrigins.add(request.nextUrl.origin.toLowerCase());
  }

  const originHeader = request.headers.get("origin");
  const refererHeader = request.headers.get("referer");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite && fetchSite.toLowerCase() === "cross-site") {
    throw new AppError("CSRF_FAILED", "Cross-site mutation rejected", 403);
  }

  if (originHeader) {
    const normalized = normalizeOrigin(originHeader);
    if (!normalized || !allowedOrigins.has(normalized)) {
      throw new AppError("CSRF_FAILED", "Invalid request origin", 403);
    }
    return;
  }

  if (refererHeader) {
    const normalized = normalizeOrigin(refererHeader);
    if (!normalized || !allowedOrigins.has(normalized)) {
      throw new AppError("CSRF_FAILED", "Invalid request referer", 403);
    }
    return;
  }

  // Non-browser API test clients without Origin/Referer are allowed only when not cross-site;
  // browsers always attach Origin on POST/PATCH/DELETE.
  const hasAuthCookie = Boolean(
    request.cookies.get("gg_access") || request.cookies.get("gg_refresh")
  );
  if (hasAuthCookie && process.env.NODE_ENV === "production") {
    throw new AppError(
      "CSRF_FAILED",
      "Missing Origin header for authenticated request",
      403
    );
  }
}
