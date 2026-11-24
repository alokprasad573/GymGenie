import type { PoseLandmark } from "@/types/exercise";

export interface Point2D {
  x: number;
  y: number;
}

export function isValidPoint(point: Point2D | null | undefined): point is Point2D {
  return (
    point !== null &&
    point !== undefined &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}

export function getLandmark(
  landmarks: readonly PoseLandmark[] | null | undefined,
  index: number
): PoseLandmark | null {
  if (!landmarks || index < 0 || index >= landmarks.length) {
    return null;
  }
  const lm = landmarks[index];
  if (!lm || !Number.isFinite(lm.x) || !Number.isFinite(lm.y)) {
    return null;
  }
  return lm;
}

export function getVisibility(landmark: PoseLandmark | null | undefined): number {
  if (!landmark || typeof landmark.visibility !== "number" || !Number.isFinite(landmark.visibility)) {
    return 0;
  }
  return landmark.visibility;
}

export function getPoint(
  landmarks: readonly PoseLandmark[] | null | undefined,
  index: number
): Point2D | null {
  const lm = getLandmark(landmarks, index);
  if (!lm) return null;
  return { x: lm.x, y: lm.y };
}

/**
 * Computes interior angle at vertex B in degrees [0, 180], preserving
 * core/base_exercise.py BaseExercise.calculate_angle(a, b, c) with safe guards.
 */
export function calculateAngle(
  a: Point2D | null | undefined,
  b: Point2D | null | undefined,
  c: Point2D | null | undefined
): number {
  if (!isValidPoint(a) || !isValidPoint(b) || !isValidPoint(c)) {
    return 0.0;
  }

  const ax = a.x - b.x;
  const ay = a.y - b.y;
  const cx = c.x - b.x;
  const cy = c.y - b.y;

  const dot = ax * cx + ay * cy;
  const magA = Math.sqrt(ax * ax + ay * ay);
  const magC = Math.sqrt(cx * cx + cy * cy);
  const denom = magA * magC;

  if (denom === 0 || !Number.isFinite(denom)) {
    return 0.0;
  }

  const cosAngle = Math.max(-1.0, Math.min(1.0, dot / denom));
  const degrees = Math.acos(cosAngle) * (180 / Math.PI);
  return Number.isFinite(degrees) ? degrees : 0.0;
}

/**
 * Computes angle from vertical axis in degrees, matching
 * math.degrees(math.atan2(abs(dx), abs(dy))) if dy != 0 else 0.0.
 */
export function calculateVerticalDeviationDegrees(dx: number, dy: number): number {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || dy === 0) {
    return 0.0;
  }
  const degrees = Math.atan2(Math.abs(dx), Math.abs(dy)) * (180 / Math.PI);
  return Number.isFinite(degrees) ? degrees : 0.0;
}

export function truncAngle(angle: number): number {
  return Number.isFinite(angle) ? Math.trunc(angle) : 0;
}

export function hasRequiredLandmarks(
  landmarks: readonly PoseLandmark[] | null | undefined,
  indices: readonly number[]
): boolean {
  if (!landmarks) return false;
  for (const idx of indices) {
    if (!getLandmark(landmarks, idx)) {
      return false;
    }
  }
  return true;
}
