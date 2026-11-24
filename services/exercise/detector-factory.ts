import type { ExerciseDetector, ExerciseType } from "@/types/exercise";
import { SquatDetector } from "@/services/exercise/detectors/squat.detector";
import { PushUpDetector } from "@/services/exercise/detectors/pushup.detector";
import { BicepsCurlDetector } from "@/services/exercise/detectors/biceps-curl.detector";
import { ShoulderPressDetector } from "@/services/exercise/detectors/shoulder-press.detector";
import { LungeDetector } from "@/services/exercise/detectors/lunge.detector";

export function createExerciseDetector(exercise: ExerciseType): ExerciseDetector {
  switch (exercise) {
    case "squats":
      return new SquatDetector();
    case "pushups":
      return new PushUpDetector();
    case "biceps_curls":
      return new BicepsCurlDetector();
    case "shoulder_press":
      return new ShoulderPressDetector();
    case "lunges":
      return new LungeDetector();
  }
}
