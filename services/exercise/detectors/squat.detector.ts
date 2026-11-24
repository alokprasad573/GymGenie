import type {
  ExerciseDetector,
  ExerciseFrameResult,
  PoseLandmark,
  SquatMetrics,
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
 * Exact behavioral port of detectors/squats.py (SquatDetector).
 */
export class SquatDetector implements ExerciseDetector<SquatMetrics> {
  public static readonly DOWN_THRESHOLD = 100;
  public static readonly UP_THRESHOLD = 160;
  public static readonly MIN_VISIBILITY = 0.7;

  public readonly exercise = "squats" as const;
  private reps = 0;
  private stage: "up" | "down" | null = null;

  public reset(): void {
    this.reps = 0;
    this.stage = null;
  }

  public process(landmarks: PoseLandmark[]): ExerciseFrameResult<SquatMetrics> {
    if (!hasRequiredLandmarks(landmarks, REQUIRED_INDICES)) {
      return {
        exercise: this.exercise,
        repCount: this.reps,
        phase: "unknown",
        stage: this.stage,
        metrics: {
          kneeAngle: 0,
          backAngle: 0,
          depthStatus: "N/A",
        },
        legacyMetrics: {
          reps: this.reps,
          knee_angle: 0,
          back_angle: 0,
          depth_status: "N/A",
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

    const leftVis = getVisibility(getLandmark(landmarks, LEFT_KNEE));
    const rightVis = getVisibility(getLandmark(landmarks, RIGHT_KNEE));

    const useLeft = leftVis >= rightVis;
    const kneeAngle = useLeft ? leftKneeAngle : rightKneeAngle;
    const hipIdx = useLeft ? LEFT_HIP : RIGHT_HIP;
    const kneeIdx = useLeft ? LEFT_KNEE : RIGHT_KNEE;
    const ankleIdx = useLeft ? LEFT_ANKLE : RIGHT_ANKLE;
    const shoulderIdx = useLeft ? LEFT_SHOULDER : RIGHT_SHOULDER;

    const backAngle = calculateAngle(
      getPoint(landmarks, shoulderIdx),
      getPoint(landmarks, hipIdx),
      getPoint(landmarks, kneeIdx)
    );

    // Preserves inclusive >= 0.7 from detectors/squats.py line 54
    const keyLandmarkVisible =
      getVisibility(getLandmark(landmarks, hipIdx)) >= SquatDetector.MIN_VISIBILITY &&
      getVisibility(getLandmark(landmarks, kneeIdx)) >= SquatDetector.MIN_VISIBILITY &&
      getVisibility(getLandmark(landmarks, ankleIdx)) >= SquatDetector.MIN_VISIBILITY;

    let repCompleted = false;
    if (keyLandmarkVisible) {
      if (kneeAngle < SquatDetector.DOWN_THRESHOLD) {
        this.stage = "down";
      }
      // Preserves inclusive >= 160 from detectors/squats.py line 60
      if (kneeAngle >= SquatDetector.UP_THRESHOLD && this.stage === "down") {
        this.stage = "up";
        this.reps += 1;
        repCompleted = true;
      }
    }

    let depthStatus: SquatMetrics["depthStatus"];
    if (this.stage === "down") {
      depthStatus =
        kneeAngle <= SquatDetector.DOWN_THRESHOLD ? "GOOD DEPTH" : "TOO HIGH";
    } else if (this.stage === "up") {
      depthStatus = "STANDING";
    } else {
      depthStatus = "N/A";
    }

    const intKnee = truncAngle(kneeAngle);
    const intBack = truncAngle(backAngle);

    const formIssues: string[] = [];
    if (depthStatus === "TOO HIGH") {
      formIssues.push(
        "Squat is not deep enough — bend your knees further to reach parallel."
      );
    }
    if (keyLandmarkVisible && intBack < 130) {
      formIssues.push("Leaning too far forward — keep your chest upright.");
    }

    const phase =
      this.stage === "down"
        ? "down"
        : this.stage === "up"
          ? "up"
          : keyLandmarkVisible
            ? "transition"
            : "unknown";

    return {
      exercise: this.exercise,
      repCount: this.reps,
      phase,
      stage: this.stage,
      metrics: {
        kneeAngle: intKnee,
        backAngle: intBack,
        depthStatus,
      },
      legacyMetrics: {
        reps: this.reps,
        knee_angle: intKnee,
        back_angle: intBack,
        depth_status: depthStatus,
      },
      formIssues,
      repCompleted,
      landmarksValid: keyLandmarkVisible,
    };
  }
}
