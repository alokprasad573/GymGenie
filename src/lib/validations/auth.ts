import { z } from "zod";

const usernameRegex = /^[a-zA-Z0-9_.-]+$/;

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password cannot exceed 128 characters")
  .refine(
    (val) => /[a-zA-Z]/.test(val) && /\d/.test(val),
    "Password must include at least one letter and one number"
  );

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username cannot exceed 32 characters")
  .regex(
    usernameRegex,
    "Username may only contain letters, numbers, underscores, dots, and hyphens"
  );

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address")
  .max(254, "Email address is too long");

export const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().max(80, "Name cannot exceed 80 characters").optional(),
});

export const loginSchema = z
  .object({
    identifier: z.string().trim().min(1, "Email or username is required").max(254).optional(),
    email: z.string().trim().min(1).max(254).optional(),
    password: z.string().min(1, "Password is required").max(128),
  })
  .refine((data) => Boolean(data.identifier || data.email), {
    message: "Email or username is required",
    path: ["identifier"],
  })
  .transform((data) => ({
    identifier: (data.identifier ?? data.email ?? "").trim().toLowerCase(),
    password: data.password,
  }));

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32, "Invalid reset token").max(256),
  newPassword: passwordSchema,
});

const safeAvatarUrlSchema = z
  .string()
  .trim()
  .max(512)
  .refine(
    (val) =>
      val === "" ||
      val.startsWith("https://") ||
      val.startsWith("/"),
    "Avatar URL must be an HTTPS URL or relative path"
  );

export const updateProfileSchema = z
  .object({
    name: z.string().trim().max(80).optional(),
    username: usernameSchema.optional(),
    avatarUrl: safeAvatarUrlSchema.optional(),
    preferences: z
      .object({
        enableVoice: z.boolean().optional(),
        enableAiCoaching: z.boolean().optional(),
        defaultRestSeconds: z.number().int().min(0).max(600).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required").max(128),
  newPassword: passwordSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
