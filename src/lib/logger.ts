import "server-only";

export type LogLevel = "debug" | "info" | "warn" | "error";

const REDACTED_KEYS = new Set([
  "password",
  "passwordhash",
  "currentpassword",
  "newpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "resettoken",
  "tokenhash",
  "authorization",
  "cookie",
  "set-cookie",
  "secret",
  "jwt_access_secret",
  "jwt_refresh_secret",
  "groq_api_key",
  "mongodb_uri",
  "atlas_uri",
  "database_uri",
  "apikey",
  "api_key",
]);

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[MAX_DEPTH]";
  if (value === null || value === undefined) return value;
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
    };
  }
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => sanitizeValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (REDACTED_KEYS.has(key.toLowerCase())) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = sanitizeValue(val, depth + 1);
      }
    }
    return out;
  }
  return value;
}

export function formatLogEntry(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): string {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: sanitizeValue(meta) } : {}),
  };
  return JSON.stringify(payload);
}

function emit(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (process.env.NODE_ENV === "test" && level === "debug") {
    return;
  }
  const line = formatLogEntry(level, message, meta);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => emit("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => emit("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => emit("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => emit("error", message, meta),
};
