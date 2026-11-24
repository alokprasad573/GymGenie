import "server-only";
import mongoose from "mongoose";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose | null> | null;
  lastAttempt: number;
  available: boolean | null;
}

declare global {
  var __gymgenieMongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache = globalThis.__gymgenieMongooseCache ?? {
  conn: null,
  promise: null,
  lastAttempt: 0,
  available: null,
};

if (!globalThis.__gymgenieMongooseCache) {
  globalThis.__gymgenieMongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose | null> {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  const now = Date.now();
  if (cached.available === false && now - cached.lastAttempt < 30_000) {
    return null;
  }

  if (!cached.promise) {
    cached.lastAttempt = now;
    let uri: string;
    try {
      const env = getEnv();
      uri = env.DATABASE_URI || env.ATLAS_URI || env.MONGODB_URI || "";
    } catch {
      cached.available = false;
      return null;
    }

    if (!uri) {
      cached.available = false;
      logger.warn("Neither ATLAS_URI nor MONGODB_URI configured; using in-memory store");
      return null;
    }

    const isLocalUri =
      uri.includes("localhost") || uri.includes("127.0.0.1");

    cached.promise = mongoose
      .connect(uri, {
        bufferCommands: false,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: isLocalUri ? 800 : 5_000,
        connectTimeoutMS: isLocalUri ? 800 : 5_000,
        socketTimeoutMS: 15_000,
      })
      .then((instance) => {
        cached.available = true;
        logger.info("Connected to MongoDB");
        return instance;
      })
      .catch((error: unknown) => {
        cached.promise = null;
        cached.available = false;
        logger.warn(
          "MongoDB connection unavailable; using in-memory store for session",
          {
            error: error instanceof Error ? error.message : "Unknown error",
          }
        );
        return null;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export function isMongoConnected(): boolean {
  return mongoose.connection.readyState === 1;
}
