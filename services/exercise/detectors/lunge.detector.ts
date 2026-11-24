import type {
  ExerciseDetector,
  ExerciseFrameResult,
  LungeMetrics,
  PoseLandmark,
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
const RIGHT_SHOULDER = 12;
const LEFT_HIP = 23;
const RIGHT_HIP = 24;
const LEFT_KNEE = 25;
const RIGHT_KNEE = 26;
const LEFT_ANKLE = 27;
const RIGHT_ANKLE = 28;

const REQUIRED_INDICES = [
  LEFT_SHOULDER,
  RIGHT_SHOULDER,
  LEFT_HIP,
  RIGHT_HIP,
  LEFT_KNEE,
  RIGHT_KNEE,
  LEFT_ANKLE,
  RIGHT_ANKLE,
] as const;

/**
 * Exact behavioral port of detectors/lunges.py (LungesDetector).
 */
export class LungeDetector implements ExerciseDetector<LungeMetrics> {
  public static readonly DOWN_THRESHOLD = 100;
  public static readonly UP_THRESHOLD = 160;
  public static readonly MIN_VISIBILITY = 0.7;
  public static readonly BALANCE_TOLERANCE = 0.1;

  public readonly exercise = "lunges" as const;
  private reps = 0;
  private stage: "up" | "down" | null = null;

  public reset(): void {
    this.reps = 0;
    this.stage = null;
  }

  public process(landmarks: PoseLandmark[]): ExerciseFrameResult<LungeMetrics> {
    if (!hasRequiredLandmarks(landmarks, REQUIRED_INDICES)) {
      return {
        exercise: this.exercise,
        repCount: this.reps,
        phase: "unknown",
        stage: this.stage,
        metrics: {
          frontKneeAngle: 0,
          torsoAngle: 0,
          balanceStatus: "BALANCED",
        },
        legacyMetrics: {
          reps: this.reps,
          front_knee_angle: 0,
          torso_angle: 0,
          balance_status: "BALANCED",
        },
        formIssues: [],
        repCompleted: false,
        landmarksValid: false,
      };
    }

    const leftKneeAngle = calculateAngle(
      getPoint(landmarks, LEFT_HIP),
      getPoint(landmarks, LEFT_KNEE),
      getPoint(landmarks, LEFT_ANKLE)
    );
    const rightKneeAngle = calculateAngle(
      getPoint(landmarks, RIGHT_HIP),
      getPoint(landmarks, RIGHT_KNEE),
      getPoint(landmarks, RIGHT_ANKLE)
    );

    // Preserves detectors/lunges.py line 39: leading leg is whichever knee is more bent
    const useLeft = leftKneeAngle <= rightKneeAngle;
    const frontKneeAngle = useLeft ? leftKneeAngle : rightKneeAngle;
    const frontHipIdx = useLeft ? LEFT_HIP : RIGHT_HIP;
    const frontKneeIdx = useLeft ? LEFT_KNEE : RIGHT_KNEE;
    const frontAnkleIdx = useLeft ? LEFT_ANKLE : RIGHT_ANKLE;
    const shoulderIdxForTorso = useLeft ? LEFT_SHOULDER : RIGHT_SHOULDER;

    // Preserves strict > 0.7 from detectors/lunges.py line 52
    const keyLandmarksVisible =
      getVisibility(getLandmark(landmarks, frontHipIdx)) > LungeDetector.MIN_VISIBILITY &&
      getVisibility(getLandmark(landmarks, frontKneeIdx)) > LungeDetector.MIN_VISIBILITY &&
      getVisibility(getLandmark(landmarks, frontAnkleIdx)) > LungeDetector.MIN_VISIBILITY;

    let repCompleted = false;
    if (keyLandmarksVisible) {
      if (frontKneeAngle < LungeDetector.DOWN_THRESHOLD) {
        this.stage = "down";
      }
      if (frontKneeAngle > LungeDetector.UP_THRESHOLD && this.stage === "down") {
        this.stage = "up";
        this.reps += 1;
        repCompleted = true;
      }
    }

    const torsoAngle = calculateAngle(
      getPoint(landmarks, shoulderIdxForTorso),
      getPoint(landmarks, frontHipIdx),
      getPoint(landmarks, frontKneeIdx)
    );

    const leftShoulder = getLandmark(landmarks, LEFT_SHOULDER)!;
    const rightShoulder = getLandmark(landmarks, RIGHT_SHOULDER)!;
    const leftHip = getLandmark(landmarks, LEFT_HIP)!;
    const rightHip = getLandmark(landmarks, RIGHT_HIP)!;

    const shoulderMidX = (leftShoulder.x + rightShoulder.x) / 2;
    const hipMidX = (leftHip.x + rightHip.x) / 2;
    const lateralOffset = Math.abs(shoulderMidX - hipMidX);

    const balanceStatus: LungeMetrics["balanceStatus"] =
      lateralOffset <= LungeDetector.BALANCE_TOLERANCE
        ? "BALANCED"
        : "OFF BALANCE";

    const intFrontKnee = truncAngle(frontKneeAngle);
    const intTorso = truncAngle(torsoAngle);
    const formIssues: string[] = [];
    if (keyLandmarksVisible && balanceStatus === "OFF BALANCE") {
      formIssues.push(
        "Losing lateral balance during the lunge — keep feet hip-width apart."
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
        frontKneeAngle: intFrontKnee,
        torsoAngle: intTorso,
        balanceStatus,
      },
      legacyMetrics: {
        reps: this.reps,
        front_knee_angle: intFrontKnee,
        torso_angle: intTorso,
        balance_status: balanceStatus,
      },
      formIssues,
      repCompleted,
      landmarksValid: keyLandmarksVisible,
    };
  }
}
