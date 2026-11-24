import "server-only";
import crypto from "node:crypto";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  generateRandomToken,
  hashOpaqueToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "@/lib/jwt";
import {
  hashPassword,
  verifyDummyPassword,
  verifyPassword,
} from "@/lib/password";
import {
  mongoUserRepository,
  type PublicUser,
  type UserRepository,
} from "@/repositories/user.repository";
import {
  mongoSessionRepository,
  type SessionRepository,
} from "@/repositories/session.repository";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from "@/lib/validations/auth";

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: PublicUser;
  tokens: AuthTokenPair;
}

export interface AuthServiceDependencies {
  userRepo: UserRepository;
  sessionRepo: SessionRepository;
}

const PASSWORD_RESET_TTL_MS = 30 * 60 * 1000; // 30 minutes

export function createAuthService(deps: AuthServiceDependencies) {
  const { userRepo, sessionRepo } = deps;

  async function issueSessionTokens(
    user: PublicUser,
    sessionId: string = crypto.randomUUID()
  ): Promise<{ tokens: AuthTokenPair; sessionRecordId: string }> {
    const accessToken = await signAccessToken({
      userId: user.id,
      role: user.role,
      sessionId,
    });
    const { token: refreshToken, expiresAt } = await signRefreshToken({
      userId: user.id,
      sessionId,
    });

    const tokenHash = hashOpaqueToken(refreshToken);
    const sessionRecord = await sessionRepo.createSession({
      userId: user.id,
      sessionId,
      tokenHash,
      expiresAt,
    });

    return {
      tokens: { accessToken, refreshToken },
      sessionRecordId: sessionRecord.id,
    };
  }

  return {
    async register(input: RegisterInput): Promise<AuthResult> {
      const normalizedEmail = input.email.trim().toLowerCase();
      const normalizedUsername = input.username.trim().toLowerCase();

      const { emailExists, usernameExists } =
        await userRepo.existsByEmailOrUsername(
          normalizedEmail,
          normalizedUsername
        );

      if (emailExists) {
        throw new AppError(
          "CONFLICT",
          "An account with this email already exists",
          409
        );
      }
      if (usernameExists) {
        throw new AppError(
          "CONFLICT",
          "This username is already taken",
          409
        );
      }

      const passwordHash = await hashPassword(input.password);
      const user = await userRepo.createUser({
        username: normalizedUsername,
        displayUsername: input.username.trim(),
        email: normalizedEmail,
        passwordHash,
        name: input.name,
      });

      const { tokens } = await issueSessionTokens(user);
      logger.info("User registered", { userId: user.id });
      return { user, tokens };
    },

    async login(input: LoginInput): Promise<AuthResult> {
      const found = await userRepo.findByIdentifierWithPassword(input.identifier);
      if (!found) {
        await verifyDummyPassword(input.password);
        throw new AppError(
          "UNAUTHORIZED",
          "Invalid email, username, or password",
          401
        );
      }

      const valid = await verifyPassword(input.password, found.passwordHash);
      if (!valid) {
        throw new AppError(
          "UNAUTHORIZED",
          "Invalid email, username, or password",
          401
        );
      }

      const { passwordHash: _ignored, ...publicUser } = found;
      const { tokens } = await issueSessionTokens(publicUser);
      logger.info("User logged in", { userId: publicUser.id });
      return { user: publicUser, tokens };
    },

    async refresh(rawRefreshToken: string): Promise<AuthResult> {
      if (!rawRefreshToken) {
        throw new AppError("UNAUTHORIZED", "Refresh token missing", 401);
      }

      let claims;
      try {
        claims = await verifyRefreshToken(rawRefreshToken);
      } catch {
        throw new AppError("UNAUTHORIZED", "Invalid or expired refresh token", 401);
      }

      const now = new Date();
      const tokenHash = hashOpaqueToken(rawRefreshToken);

      const claimed = await sessionRepo.claimActiveSessionForRotation(
        tokenHash,
        now
      );

      if (!claimed) {
        // Distinguish between unknown/expired token vs. replay/reuse of rotated or revoked token
        const existing = await sessionRepo.findByTokenHash(tokenHash);
        if (existing && (existing.rotatedAt || existing.revokedAt)) {
          await sessionRepo.revokeSessionFamily(existing.sessionId, now);
          logger.warn("Refresh token reuse detected — session family revoked", {
            userId: existing.userId,
            sessionId: existing.sessionId,
          });
          throw new AppError(
            "UNAUTHORIZED",
            "Session invalidated for security. Please sign in again.",
            401
          );
        }
        throw new AppError("UNAUTHORIZED", "Invalid or expired refresh session", 401);
      }

      if (claimed.userId !== claims.sub || claimed.sessionId !== claims.sid) {
        await sessionRepo.revokeSessionFamily(claimed.sessionId, now);
        throw new AppError("UNAUTHORIZED", "Session mismatch", 401);
      }

      const user = await userRepo.findById(claimed.userId);
      if (!user) {
        await sessionRepo.revokeSessionFamily(claimed.sessionId, now);
        throw new AppError("UNAUTHORIZED", "Account no longer available", 401);
      }

      const { tokens, sessionRecordId } = await issueSessionTokens(
        user,
        claimed.sessionId
      );
      await sessionRepo.linkReplacement(claimed.id, sessionRecordId);

      return { user, tokens };
    },

    async logout(rawRefreshToken?: string): Promise<void> {
      if (!rawRefreshToken) return;
      const tokenHash = hashOpaqueToken(rawRefreshToken);
      await sessionRepo.revokeSessionByTokenHash(tokenHash, new Date());
    },

    async requestPasswordReset(email: string): Promise<{ resetDispatched: boolean }> {
      const user = await userRepo.findByEmail(email);
      if (!user) {
        return { resetDispatched: false };
      }

      const rawToken = generateRandomToken(32);
      const tokenHash = hashOpaqueToken(rawToken);
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MS);

      await userRepo.setPasswordResetToken(user.id, tokenHash, expiresAt);
      logger.info("Password reset token issued", {
        userId: user.id,
        expiresAt: expiresAt.toISOString(),
      });

      return { resetDispatched: true };
    },

    async resetPassword(token: string, newPassword: string): Promise<void> {
      const tokenHash = hashOpaqueToken(token);
      const user = await userRepo.findByValidResetTokenHash(tokenHash);
      if (!user) {
        throw new AppError(
          "BAD_REQUEST",
          "Reset token is invalid or has expired",
          400
        );
      }

      const newHash = await hashPassword(newPassword);
      await userRepo.updatePasswordHash(user.id, newHash);
      await sessionRepo.revokeAllForUser(user.id, new Date());
      logger.info("Password reset completed and sessions revoked", {
        userId: user.id,
      });
    },

    async changePassword(
      userId: string,
      input: ChangePasswordInput
    ): Promise<AuthResult> {
      const existing = await userRepo.findByIdWithPassword(userId);
      if (!existing) {
        throw new AppError("UNAUTHORIZED", "Account not found", 401);
      }

      const matches = await verifyPassword(
        input.currentPassword,
        existing.passwordHash
      );
      if (!matches) {
        throw new AppError(
          "UNAUTHORIZED",
          "Current password is incorrect",
          401
        );
      }

      const newHash = await hashPassword(input.newPassword);
      await userRepo.updatePasswordHash(userId, newHash);
      await sessionRepo.revokeAllForUser(userId, new Date());

      const { passwordHash: _ignored, ...publicUser } = existing;
      const { tokens } = await issueSessionTokens(publicUser);
      logger.info("User password changed and prior sessions revoked", {
        userId,
      });

      return { user: publicUser, tokens };
    },

    async getProfile(userId: string): Promise<PublicUser> {
      const user = await userRepo.findById(userId);
      if (!user) {
        throw new AppError("UNAUTHORIZED", "Account not found", 401);
      }
      return user;
    },

    async updateProfile(
      userId: string,
      input: UpdateProfileInput
    ): Promise<PublicUser> {
      if (input.username) {
        const current = await userRepo.findById(userId);
        if (!current) {
          throw new AppError("UNAUTHORIZED", "Account not found", 401);
        }
        const normalizedNext = input.username.trim().toLowerCase();
        if (normalizedNext !== current.username) {
          const { usernameExists } = await userRepo.existsByEmailOrUsername(
            "",
            normalizedNext
          );
          if (usernameExists) {
            throw new AppError("CONFLICT", "This username is already taken", 409);
          }
        }
      }

      const updated = await userRepo.updateProfile(userId, {
        name: input.name,
        username: input.username,
        displayUsername: input.username,
        avatarUrl: input.avatarUrl,
        preferences: input.preferences,
      });

      if (!updated) {
        throw new AppError("NOT_FOUND", "User not found", 404);
      }
      return updated;
    },
  };
}

export const authService = createAuthService({
  userRepo: mongoUserRepository,
  sessionRepo: mongoSessionRepository,
});
