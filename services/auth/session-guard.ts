import "server-only";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME } from "@/lib/cookies";
import { AppError } from "@/lib/errors";
import { verifyAccessToken, type AccessTokenClaims } from "@/lib/jwt";
import { mongoUserRepository, type PublicUser } from "@/repositories/user.repository";

export interface AuthenticatedContext {
  userId: string;
  role: AccessTokenClaims["role"];
  sessionId: string;
}

export async function requireApiAuth(
  request: NextRequest
): Promise<AuthenticatedContext> {
  const token = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (!token) {
    throw new AppError("UNAUTHORIZED", "Authentication required", 401);
  }

  try {
    const claims = await verifyAccessToken(token);
    return {
      userId: claims.sub,
      role: claims.role,
      sessionId: claims.sid,
    };
  } catch {
    throw new AppError("UNAUTHORIZED", "Invalid or expired session", 401);
  }
}

export async function getServerAuthContext(): Promise<AuthenticatedContext | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const claims = await verifyAccessToken(token);
    return {
      userId: claims.sub,
      role: claims.role,
      sessionId: claims.sid,
    };
  } catch {
    return null;
  }
}

export async function getServerSessionUser(): Promise<PublicUser | null> {
  const auth = await getServerAuthContext();
  if (!auth) return null;
  try {
    return await mongoUserRepository.findById(auth.userId);
  } catch {
    return null;
  }
}
