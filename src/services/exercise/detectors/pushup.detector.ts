import type {
  ExerciseDetector,
  ExerciseFrameResult,
  PoseLandmark,
  PushUpMetrics,
} from "@/types/exercise";
import {
  calculateAngle,
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
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;

const REQUIRED_INDICES = [
  LEFT_SHOULDER,
  LEFT_ELBOW,
  LEFT_WRIST,
  RIGHT_SHOULDER,
  RIGHT_ELBOW,
  RIGHT_WRIST,
  LEFT_HIP,
  RIGHT_HIP,
  LEFT_ANKLE,
  RIGHT_ANKLE,
] as const;

/**
 * Exact behavioral port of detectors/pushups.py (PushUpDetector).
 */
export class PushUpDetector implements ExerciseDetector<PushUpMetrics> {
  public static readonly DOWN_THRESHOLD = 90;
  public static readonly UP_THRESHOLD = 160;
  public static readonly MIN_VISIBILITY = 0.7;
  public static readonly HIP_SAG_TOLERANCE = 0.08;

  public readonly exercise = "pushups" as const;
  private reps = 0;
  private stage: "up" | "down" | null = null;

  public reset(): void {
    this.reps = 0;
    this.stage = null;
  }

  public process(landmarks: PoseLandmark[]): ExerciseFrameResult<PushUpMetrics> {
    if (!hasRequiredLandmarks(landmarks, REQUIRED_INDICES)) {
      return {
        exercise: this.exercise,
        repCount: this.reps,
        phase: "unknown",
        stage: this.stage,
        metrics: {
          elbowAngle: 0,
          bodyAlignment: "Poor Form",
          hipStatus: "LEVEL",
        },
        legacyMetrics: {
          reps: this.reps,
          elbow_angle: 0,
          body_alignment: "Poor Form",
          hip_status: "LEVEL",
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
    const hipIdx = useLeft ? LEFT_HIP : RIGHT_HIP;
    const ankleIdx = useLeft ? LEFT_ANKLE : RIGHT_ANKLE;

    const elbowAngle = calculateAngle(
      getPoint(landmarks, shoulderIdx),
      getPoint(landmarks, elbowIdx),
      getPoint(landmarks, wristIdx)
    );

    const bodyAngle = calculateAngle(
      getPoint(landmarks, shoulderIdx),
      getPoint(landmarks, hipIdx),
      getPoint(landmarks, ankleIdx)
    );

    const shoulderLm = getLandmark(landmarks, shoulderIdx)!;
    const ankleLm = getLandmark(landmarks, ankleIdx)!;
    const hipLm = getLandmark(landmarks, hipIdx)!;

    const expectedHipY = (shoulderLm.y + ankleLm.y) / 2;
    const hipDeviation = hipLm.y - expectedHipY;

    // Preserves strict > 0.7 from detectors/pushups.py line 64
    const keyLandmarksVisible =
      getVisibility(shoulderLm) > PushUpDetector.MIN_VISIBILITY &&
      getVisibility(getLandmark(landmarks, elbowIdx)) > PushUpDetector.MIN_VISIBILITY &&
      getVisibility(getLandmark(landmarks, wristIdx)) > PushUpDetector.MIN_VISIBILITY &&
      getVisibility(hipLm) > PushUpDetector.MIN_VISIBILITY;

    let repCompleted = false;
    if (keyLandmarksVisible) {
      if (elbowAngle < PushUpDetector.DOWN_THRESHOLD) {
        this.stage = "down";
      }
      if (elbowAngle > PushUpDetector.UP_THRESHOLD && this.stage === "down") {
        this.stage = "up";
        this.reps += 1;
        repCompleted = true;
      }
    }

    let bodyAlignment: PushUpMetrics["bodyAlignment"];
    if (bodyAngle > 160) {
      bodyAlignment = "Straight";
    } else if (bodyAngle > 140) {
      bodyAlignment = "Slight Bend";
    } else {
      bodyAlignment = "Poor Form";
    }

    let hipStatus: PushUpMetrics["hipStatus"];
    if (Math.abs(hipDeviation) <= PushUpDetector.HIP_SAG_TOLERANCE) {
      hipStatus = "LEVEL";
    } else if (hipDeviation > PushUpDetector.HIP_SAG_TOLERANCE) {
      hipStatus = "SAGGING";
    } else {
      hipStatus = "PIKED UP";
    }

    const intElbow = truncAngle(elbowAngle);
    const formIssues: string[] = [];
    if (keyLandmarksVisible) {
      if (bodyAlignment === "Poor Form") {
        formIssues.push("Body is not straight — brace your core into a solid plank.");
      }
      if (hipStatus === "SAGGING") {
        formIssues.push("Hips are sagging — lift your hips in line with your shoulders.");
      } else if (hipStatus === "PIKED UP") {
        formIssues.push("Hips are too high — lower them to form a straight line.");
      }
    }

    const phase =
      this.stage === "down"
        ? "down"
        : this.stage === "up"
          ? "up"
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
        bodyAlignment,
        hipStatus,
      },
      legacyMetrics: {
        reps: this.reps,
        elbow_angle: intElbow,
        body_alignment: bodyAlignment,
        hip_status: hipStatus,
      },
      formIssues,
      repCompleted,
      landmarksValid: keyLandmarksVisible,
    };
  }
}
