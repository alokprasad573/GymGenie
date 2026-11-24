import fs from "node:fs";
import path from "node:path";
import { apiSuccess, createRequestId } from "@/lib/errors";
import { isMongoConnected } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const requestId = createRequestId();
  const modelPath = path.join(
    process.cwd(),
    "public",
    "models",
    "pose_landmarker_full.task"
  );
  const poseModelPresent = fs.existsSync(modelPath);
  const databaseConnected = isMongoConnected();

  return apiSuccess(
    {
      status: "ok",
      service: "gymgenie",
      timestamp: new Date().toISOString(),
      poseModelPresent,
      databaseConfigured: Boolean(
        process.env.ATLAS_URI || process.env.MONGODB_URI
      ),
      databaseConnected,
      databaseMode: databaseConnected ? "mongodb" : "in-memory",
      aiCoachingConfigured: Boolean(process.env.GROQ_API_KEY),
    },
    200,
    requestId
  );
}
