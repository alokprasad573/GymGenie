import "server-only";
import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/lib/env";
import type { UserRole } from "@/models/User";

export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

const JWT_ALGORITHM = "HS256";
const ALLOWED_ALGORITHMS = [JWT_ALGORITHM];

export interface AccessTokenClaims {
  sub: string;
  role: UserRole;
  sid: string;
  typ: "access";
  jti: string;
}

export interface RefreshTokenClaims {
  sub: string;
  sid: string;
  typ: "refresh";
  jti: string;
}

function encodeSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export function hashOpaqueToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function generateRandomToken(byteLength = 32): string {
  return crypto.randomBytes(byteLength).toString("base64url");
}

export async function signAccessToken(payload: {
  userId: string;
  role: UserRole;
  sessionId: string;
}): Promise<string> {
  const env = getEnv();
  const jti = crypto.randomUUID();

  return new SignJWT({
    role: payload.role,
    sid: payload.sessionId,
    typ: "access",
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM, typ: "JWT" })
    .setSubject(payload.userId)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(encodeSecret(env.JWT_ACCESS_SECRET));
}

export async function signRefreshToken(payload: {
  userId: string;
  sessionId: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const env = getEnv();
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000);

  const token = await new SignJWT({
    sid: payload.sessionId,
    typ: "refresh",
  })
    .setProtectedHeader({ alg: JWT_ALGORITHM, typ: "JWT" })
    .setSubject(payload.userId)
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${REFRESH_TOKEN_TTL_SECONDS}s`)
    .sign(encodeSecret(env.JWT_REFRESH_SECRET));

  return { token, expiresAt };
}

export async function verifyAccessToken(
  token: string
): Promise<AccessTokenClaims> {
  const env = getEnv();
  const { payload } = await jwtVerify(
    token,
    encodeSecret(env.JWT_ACCESS_SECRET),
    {
      algorithms: ALLOWED_ALGORITHMS,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    }
  );

  if (
    typeof payload.sub !== "string" ||
    !payload.sub ||
    payload.typ !== "access" ||
    typeof payload.sid !== "string" ||
    typeof payload.jti !== "string" ||
    (payload.role !== "USER" && payload.role !== "ADMIN")
  ) {
    throw new Error("Invalid access token claims");
  }

  return {
    sub: payload.sub,
    role: payload.role,
    sid: payload.sid,
    typ: "access",
    jti: payload.jti,
  };
}

export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenClaims> {
  const env = getEnv();
  const { payload } = await jwtVerify(
    token,
    encodeSecret(env.JWT_REFRESH_SECRET),
    {
      algorithms: ALLOWED_ALGORITHMS,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    }
  );

  if (
    typeof payload.sub !== "string" ||
    !payload.sub ||
    payload.typ !== "refresh" ||
    typeof payload.sid !== "string" ||
    typeof payload.jti !== "string"
  ) {
    throw new Error("Invalid refresh token claims");
  }

  return {
    sub: payload.sub,
    sid: payload.sid,
    typ: "refresh",
    jti: payload.jti,
  };
}
