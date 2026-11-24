import "server-only";
import { NextResponse } from "next/server";
import { isProduction } from "@/lib/env";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
} from "@/lib/jwt";

export const ACCESS_COOKIE_NAME = "gg_access";
export const REFRESH_COOKIE_NAME = "gg_refresh";

export function setAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string }
): void {
  const secure = isProduction();

  response.cookies.set(ACCESS_COOKIE_NAME, tokens.accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });

  response.cookies.set(REFRESH_COOKIE_NAME, tokens.refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/api/auth",
    maxAge: REFRESH_TOKEN_TTL_SECONDS,
  });
}

export function clearAuthCookies(response: NextResponse): void {
  const secure = isProduction();

  response.cookies.set(ACCESS_COOKIE_NAME, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set(REFRESH_COOKIE_NAME, "", {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: "/api/auth",
    maxAge: 0,
  });
}
