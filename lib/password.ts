import "server-only";
import crypto from "node:crypto";

const ARGON2_MEMORY_KIB = 65536; // 64 MiB (OWASP recommended)
const ARGON2_PASSES = 3;
const ARGON2_PARALLELISM = 1;
const ARGON2_TAG_LENGTH = 32;
const SALT_LENGTH = 16;

// Precomputed valid dummy hash used to equalize response time on unknown accounts
let cachedDummyHash: string | null = null;

function runArgon2id(
  password: string,
  salt: Buffer,
  memory: number,
  passes: number,
  parallelism: number,
  tagLength: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const argon2Fn = (
      crypto as unknown as {
        argon2?: (
          algorithm: "argon2id",
          params: {
            message: string;
            nonce: Buffer;
            memory: number;
            passes: number;
            parallelism: number;
            tagLength: number;
          },
          cb: (err: Error | null, derivedKey: Buffer) => void
        ) => void;
      }
    ).argon2;

    if (typeof argon2Fn !== "function") {
      reject(new Error("Node runtime does not support crypto.argon2"));
      return;
    }

    argon2Fn(
      "argon2id",
      {
        message: password,
        nonce: salt,
        memory,
        passes,
        parallelism,
        tagLength,
      },
      (err, derivedKey) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(derivedKey);
      }
    );
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derived = await runArgon2id(
    password,
    salt,
    ARGON2_MEMORY_KIB,
    ARGON2_PASSES,
    ARGON2_PARALLELISM,
    ARGON2_TAG_LENGTH
  );

  const saltB64 = salt.toString("base64").replace(/=+$/, "");
  const hashB64 = derived.toString("base64").replace(/=+$/, "");
  return `$argon2id$v=19$m=${ARGON2_MEMORY_KIB},t=${ARGON2_PASSES},p=${ARGON2_PARALLELISM}$${saltB64}$${hashB64}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split("$");
  // Expected: ["", "argon2id", "v=19", "m=...,t=...,p=...", "<salt>", "<hash>"]
  if (parts.length !== 6 || parts[1] !== "argon2id") {
    return false;
  }

  const paramPart = parts[3];
  const saltPart = parts[4];
  const hashPart = parts[5];
  if (!paramPart || !saltPart || !hashPart) {
    return false;
  }

  const paramMap = new Map<string, number>();
  for (const pair of paramPart.split(",")) {
    const [k, v] = pair.split("=");
    if (k && v) {
      const parsed = Number.parseInt(v, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        paramMap.set(k, parsed);
      }
    }
  }

  const memory = paramMap.get("m");
  const passes = paramMap.get("t");
  const parallelism = paramMap.get("p");
  if (!memory || !passes || !parallelism) {
    return false;
  }

  try {
    const salt = Buffer.from(saltPart, "base64");
    const expected = Buffer.from(hashPart, "base64");
    if (salt.length < 8 || expected.length < 16) {
      return false;
    }

    const derived = await runArgon2id(
      password,
      salt,
      memory,
      passes,
      parallelism,
      expected.length
    );

    if (derived.length !== expected.length) {
      return false;
    }
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export async function verifyDummyPassword(password: string): Promise<void> {
  if (!cachedDummyHash) {
    cachedDummyHash = await hashPassword("gymgenie-dummy-timing-guard-2026");
  }
  await verifyPassword(password, cachedDummyHash);
}
