import type {
  ExerciseDetector,
  ExerciseFrameResult,
  PoseLandmark,
  ShoulderPressMetrics,
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
const RIGHT_SHOULDER = 12;
const LEFT_ELBOW = 13;
const RIGHT_ELBOW = 14;
const LEFT_WRIST = 15;
const RIGHT_WRIST = 16;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;

const REQUIRED_INDICES = [
  LEFT_SHOULDER,
  RIGHT_SHOULDER,
  LEFT_ELBOW,
  RIGHT_ELBOW,
  LEFT_WRIST,
  RIGHT_WRIST,
  LEFT_HIP,
  RIGHT_HIP,
] as const;

/**
 * Exact behavioral port of detectors/shoulder_press.py (ShoulderPressDetector).
 */
export class ShoulderPressDetector
  implements ExerciseDetector<ShoulderPressMetrics>
{
  public static readonly DOWN_THRESHOLD = 90;
  public static readonly UP_THRESHOLD = 150;
  public static readonly MIN_VISIBILITY = 0.7;

  public readonly exercise = "shoulder_press" as const;
  private reps = 0;
  private stage: "up" | "down" | null = null;

  public reset(): void {
    this.reps = 0;
    this.stage = null;
  }

  public process(
    landmarks: PoseLandmark[]
  ): ExerciseFrameResult<ShoulderPressMetrics> {
    if (!hasRequiredLandmarks(landmarks, REQUIRED_INDICES)) {
      return {
        exercise: this.exercise,
        repCount: this.reps,
        phase: "unknown",
        stage: this.stage,
        metrics: {
          elbowAngle: 0,
          extensionStatus: "LOW",
          backArchStatus: "GOOD",
        },
        legacyMetrics: {
          reps: this.reps,
          elbow_angle: 0,
          extension_status: "LOW",
          back_arch_status: "GOOD",
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

    const elbowAngle = calculateAngle(
      getPoint(landmarks, shoulderIdx),
      getPoint(landmarks, elbowIdx),
      getPoint(landmarks, wristIdx)
    );

    const shoulderLm = getLandmark(landmarks, shoulderIdx)!;
    const elbowLm = getLandmark(landmarks, elbowIdx)!;
    const wristLm = getLandmark(landmarks, wristIdx)!;
    const hipLm = getLandmark(landmarks, hipIdx)!;

    // Preserves strict > 0.7 from detectors/shoulder_press.py lines 47-51
    const keyLandmarksVisible =
      getVisibility(shoulderLm) > ShoulderPressDetector.MIN_VISIBILITY &&
      getVisibility(elbowLm) > ShoulderPressDetector.MIN_VISIBILITY &&
      getVisibility(wristLm) > ShoulderPressDetector.MIN_VISIBILITY;

    let repCompleted = false;
    if (keyLandmarksVisible) {
      if (elbowAngle < ShoulderPressDetector.DOWN_THRESHOLD) {
        this.stage = "down";
      } else if (
        elbowAngle > ShoulderPressDetector.UP_THRESHOLD &&
        this.stage === "down"
      ) {
        this.stage = "up";
        this.reps += 1;
        repCompleted = true;
      }
    }

    let extensionStatus: ShoulderPressMetrics["extensionStatus"];
    if (elbowAngle > 160) {
      extensionStatus = "FULL";
    } else if (elbowAngle > 140) {
      extensionStatus = "PARTIAL";
    } else {
      extensionStatus = "LOW";
    }

    const dx = shoulderLm.x - hipLm.x;
    const dy = shoulderLm.y - hipLm.y;
    const backAngle = calculateVerticalDeviationDegrees(dx, dy);
    const backArchStatus: ShoulderPressMetrics["backArchStatus"] =
      backAngle > 15 ? "ARCHED" : "GOOD";

    const intElbow = truncAngle(elbowAngle);
    const formIssues: string[] = [];
    if (keyLandmarksVisible && backArchStatus === "ARCHED") {
      // Resolves GAP-01 so coaching receives the actual "ARCHED" status emitted by ShoulderPressDetector
      formIssues.push(
        "Lower back is arching during the press — brace your core and stay stacked."
      );
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
        extensionStatus,
        backArchStatus,
      },
      legacyMetrics: {
        reps: this.reps,
        elbow_angle: intElbow,
        extension_status: extensionStatus,
        back_arch_status: backArchStatus,
      },
      formIssues,
      repCompleted,
      landmarksValid: keyLandmarksVisible,
    };
  }
}
