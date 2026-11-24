import type {
  BicepsCurlMetrics,
  ExerciseDetector,
  ExerciseFrameResult,
  PoseLandmark,
} from "@/types/exercise";
import {
  calculateAngle,
  calculateVerticalDeviationDegrees,
  getLandmark,
  getPoint,
  getVisibility,
  hasRequiredLandmarks,
  truncAngle,
} from "@/services/exercise/angles";

const LEFT_SHOULDER = 11;
const LEFT_ELBOW = 13;
const LEFT_WRIST = 15;
const RIGHT_SHOULDER = 12;
const RIGHT_ELBOW = 14;
const RIGHT_WRIST = 16;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

const REQUIRED_INDICES = [
  LEFT_SHOULDER,
  LEFT_ELBOW,
  LEFT_WRIST,
  RIGHT_SHOULDER,
  RIGHT_ELBOW,
  RIGHT_WRIST,
  LEFT_HIP,
  RIGHT_HIP,
] as const;

/**
 * Exact behavioral port of detectors/bieceps_curl.py (BicepsCurlDetector).
 */
export class BicepsCurlDetector implements ExerciseDetector<BicepsCurlMetrics> {
  public static readonly UP_THRESHOLD = 50;
  public static readonly DOWN_THRESHOLD = 160;
  public static readonly MIN_VISIBILITY = 0.7;
  public static readonly ELBOW_DRIFT_TOLERANCE = 0.06;
  public static readonly SWING_THRESHOLD = 15;

  public readonly exercise = "biceps_curls" as const;
  private reps = 0;
  private stage: "up" | "down" | null = null;

  public reset(): void {
    this.reps = 0;
    this.stage = null;
  }

  public process(
    landmarks: PoseLandmark[]
  ): ExerciseFrameResult<BicepsCurlMetrics> {
    if (!hasRequiredLandmarks(landmarks, REQUIRED_INDICES)) {
      return {
        exercise: this.exercise,
        repCount: this.reps,
        phase: "unknown",
        stage: this.stage,
        metrics: {
          elbowAngle: 0,
          shoulderStatus: "STABLE",
          swingStatus: "NO SWING",
        },
        legacyMetrics: {
          reps: this.reps,
          elbow_angle: 0,
          shoulder_status: "STABLE",
          swing_status: "NO SWING",
        },
        formIssues: [],
        repCompleted: false,
        landmarksValid: false,
      };
    }

    const leftVis = getVisibility(getLandmark(landmarks, LEFT_ELBOW));
    const rightVis = getVisibility(getLandmark(landmarks, RIGHT_ELBOW));
    const useLeft = leftVis >= rightVis;

    const shoulderIdx = useLeft ? LEFT_SHOULDER : RIGHT_SHOULDER;
    const elbowIdx = useLeft ? LEFT_ELBOW : RIGHT_ELBOW;
    const wristIdx = useLeft ? LEFT_WRIST : RIGHT_WRIST;

    const elbowAngle = calculateAngle(
      getPoint(landmarks, shoulderIdx),
      getPoint(landmarks, elbowIdx),
      getPoint(landmarks, wristIdx)
    );

    const shoulderLm = getLandmark(landmarks, shoulderIdx)!;
    const elbowLm = getLandmark(landmarks, elbowIdx)!;
    const wristLm = getLandmark(landmarks, wristIdx)!;

    // Preserves strict > 0.7 from detectors/bieceps_curl.py line 49
    const keyLandmarksVisible =
      getVisibility(shoulderLm) > BicepsCurlDetector.MIN_VISIBILITY &&
      getVisibility(elbowLm) > BicepsCurlDetector.MIN_VISIBILITY &&
      getVisibility(wristLm) > BicepsCurlDetector.MIN_VISIBILITY;

    let repCompleted = false;
    if (keyLandmarksVisible) {
      if (elbowAngle < BicepsCurlDetector.UP_THRESHOLD) {
        this.stage = "up";
      }
      if (elbowAngle > BicepsCurlDetector.DOWN_THRESHOLD && this.stage === "up") {
        this.stage = "down";
        this.reps += 1;
        repCompleted = true;
      }
    }

    const elbowDrift = Math.abs(elbowLm.x - shoulderLm.x);
    const shoulderStatus: BicepsCurlMetrics["shoulderStatus"] =
      elbowDrift <= BicepsCurlDetector.ELBOW_DRIFT_TOLERANCE
        ? "STABLE"
        : "ELBOW DRIFTING";

    const leftShoulder = getLandmark(landmarks, LEFT_SHOULDER)!;
    const rightShoulder = getLandmark(landmarks, RIGHT_SHOULDER)!;
    const leftHip = getLandmark(landmarks, LEFT_HIP)!;
    const rightHip = getLandmark(landmarks, RIGHT_HIP)!;

    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const shoulderMidY = (leftShoulder.y + rightShoulder.y) / 2;
    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const hipMidY = (leftHip.y + rightHip.y) / 2;

    const dx = shoulderMidX - hipMidX;
    const dy = shoulderMidY - hipMidY;
    const torsoAngleFromVertical = calculateVerticalDeviationDegrees(dx, dy);

    const swingStatus: BicepsCurlMetrics["swingStatus"] =
      torsoAngleFromVertical <= BicepsCurlDetector.SWING_THRESHOLD
        ? "NO SWING"
        : "SWINGING";

    const intElbow = truncAngle(elbowAngle);
    const formIssues: string[] = [];
    if (keyLandmarksVisible) {
      if (swingStatus === "SWINGING") {
        formIssues.push("Torso is swinging — keep your upper body still.");
      }
      if (shoulderStatus === "ELBOW DRIFTING") {
        formIssues.push("Elbow is drifting away from your side — pin it close to your torso.");
      }
    }

    const phase =
      this.stage === "up"
        ? "up"
        : this.stage === "down"
          ? "down"
          : keyLandmarksVisible
            ? "transition"
            : "unknown";

    return {
      exercise: this.exercise,
      repCount: this.reps,
      phase,
      stage: this.stage,
      metrics: {
        elbowAngle: intElbow,
        shoulderStatus,
        swingStatus,
      },
      legacyMetrics: {
        reps: this.reps,
        elbow_angle: intElbow,
        shoulder_status: shoulderStatus,
        swing_status: swingStatus,
      },
      formIssues,
      repCompleted,
      landmarksValid: keyLandmarksVisible,
    };
  }
}
