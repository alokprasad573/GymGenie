import type { PoseLandmark } from "@/types/exercise";

export const MEDIAPIPE_POSE_LANDMARK_COUNT = 33;

export interface MediaPipeNormalizedLandmarkLike {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface MediaPipePoseLandmarkerResultLike {
  landmarks?: readonly (readonly MediaPipeNormalizedLandmarkLike[])[];
}

/**
 * Extracts and validates the primary person's 33 normalized MediaPipe landmarks.
 * Preserves all 33 real normalized `x`, `y`, `z`, and `visibility` values without
 * fabricating missing landmarks or rescaling coordinates.
 * Returns `null` when no complete, usable 33-landmark pose is present.
 */
export function extractMediaPipePoseLandmarks(
  result: MediaPipePoseLandmarkerResultLike | null | undefined
): PoseLandmark[] | null {
  const rawPose = result?.landmarks?.[0];
  if (!rawPose || rawPose.length < MEDIAPIPE_POSE_LANDMARK_COUNT) {
    return null;
  }

  const landmarks: PoseLandmark[] = new Array(MEDIAPIPE_POSE_LANDMARK_COUNT);
  let hasUsableLandmark = false;

  for (let i = 0; i < MEDIAPIPE_POSE_LANDMARK_COUNT; i++) {
    const lm = rawPose[i];
    if (!lm || !Number.isFinite(lm.x) || !Number.isFinite(lm.y)) {
      return null;
    }

    const visibility =
      typeof lm.visibility === "number" && Number.isFinite(lm.visibility)
        ? lm.visibility
        : 0;
    const z =
      typeof lm.z === "number" && Number.isFinite(lm.z) ? lm.z : undefined;

    if (visibility > 0) {
      hasUsableLandmark = true;
    }

    landmarks[i] =
      z !== undefined
        ? { x: lm.x, y: lm.y, z, visibility }
        : { x: lm.x, y: lm.y, visibility };
  }

  if (!hasUsableLandmark) {
    return null;
  }

  return landmarks;
}
