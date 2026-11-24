import "server-only";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  ATLAS_URI: z.string().optional(),
  MONGODB_URI: z.string().optional(),
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 characters"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 characters"),
  JWT_ISSUER: z.string().min(1).default("gymgenie"),
  JWT_AUDIENCE: z.string().min(1).default("gymgenie-web"),
  GROQ_API_KEY: z.string().optional().default(""),
  GROQ_MODEL: z.string().min(1).default("llama-3.3-70b-versatile"),
});

export type ServerEnv = z.infer<typeof envSchema> & {
  DATABASE_URI: string;
};

let cachedEnv: ServerEnv | null = null;

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid server environment configuration: ${issues}`);
  }

  const rawUri =
    result.data.ATLAS_URI?.trim() ||
    result.data.MONGODB_URI?.trim() ||
    source.ATLAS_URI?.trim() ||
    source.MONGODB_URI?.trim() ||
    "";

  if (
    rawUri &&
    !rawUri.startsWith("mongodb://") &&
    !rawUri.startsWith("mongodb+srv://")
  ) {
    throw new Error(
      "Invalid server environment configuration: ATLAS_URI / MONGODB_URI must start with mongodb:// or mongodb+srv://"
    );
  }

  return {
    ...result.data,
    DATABASE_URI: rawUri,
  };
}

export function getEnv(): ServerEnv {
  if (cachedEnv) {
    return cachedEnv;
  }
  cachedEnv = parseServerEnv(process.env);
  return cachedEnv;
}

export function resetEnvCache(): void {
  cachedEnv = null;
}

export function isProduction(): boolean {
  return (process.env.NODE_ENV ?? "development") === "production";
}
