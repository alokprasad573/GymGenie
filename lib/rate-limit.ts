import "server-only";
import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors";

interface RateLimitEntry {
  timestamps: number[];
}

const MAX_STORE_KEYS = 5_000;
const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  bucket: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "127.0.0.1";
}

export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  now = Date.now()
): RateLimitResult {
  const fullKey = `${config.bucket}:${key}`;
  const cutoff = now - config.windowMs;

  if (store.size > MAX_STORE_KEYS) {
    for (const [entryKey, entry] of store.entries()) {
      const fresh = entry.timestamps.filter((t) => t > cutoff);
      if (fresh.length === 0) {
        store.delete(entryKey);
      } else {
        entry.timestamps = fresh;
      }
    }
  }

  const existing = store.get(fullKey);
  const recent = existing
    ? existing.timestamps.filter((t) => t > cutoff)
    : [];

  if (recent.length >= config.limit) {
    const oldest = recent[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldest + config.windowMs - now) / 1000)
    );
    store.set(fullKey, { timestamps: recent });
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds,
    };
  }

  recent.push(now);
  store.set(fullKey, { timestamps: recent });
  return {
    allowed: true,
    remaining: Math.max(0, config.limit - recent.length),
    retryAfterSeconds: 0,
  };
}

export function enforceRateLimit(
  key: string,
  config: RateLimitConfig,
  now = Date.now()
): RateLimitResult {
  const result = checkRateLimit(key, config, now);
  if (!result.allowed) {
    throw new AppError(
      "RATE_LIMITED",
      `Too many requests. Try again in ${result.retryAfterSeconds} seconds.`,
      429
    );
  }
  return result;
}

export function resetRateLimitStore(): void {
  store.clear();
}
