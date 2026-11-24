import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { ExerciseType, PoseLandmark } from "@/types/exercise";
import { calculateAngle, calculateVerticalDeviationDegrees } from "@/services/exercise/angles";
import { createExerciseDetector } from "@/services/exercise/detector-factory";
import { SquatDetector } from "@/services/exercise/detectors/squat.detector";
import { PushUpDetector } from "@/services/exercise/detectors/pushup.detector";
import { BicepsCurlDetector } from "@/services/exercise/detectors/biceps-curl.detector";
import { ShoulderPressDetector } from "@/services/exercise/detectors/shoulder-press.detector";
import { LungeDetector } from "@/services/exercise/detectors/lunge.detector";

interface ParityStep {
  action: "frame" | "reset";
  label?: string;
  landmarks?: PoseLandmark[];
  expected?: Record<string, number | string>;
  expectedStage?: "up" | "down" | null;
}

const FIXTURE_PATH = path.join(
  process.cwd(),
  "tests",
  "fixtures",
  "python-detector-parity.json"
);

describe("Phase 7 — Safe Angle Math & Five Detector Python Parity", () => {
  describe("Safe geometry & NaN prevention", () => {
    it("computes right, straight, and zero angles accurately", () => {
      expect(calculateAngle({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(90, 5);
      expect(calculateAngle({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(180, 5);
      expect(calculateAngle({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0, 5);
    });

    it("handles zero-length vectors, NaN, Infinity, and missing points safely", () => {
      expect(calculateAngle({ x: 0.5, y: 0.5 }, { x: 0.5, y: 0.5 }, { x: 1, y: 1 })).toBe(0);
      expect(calculateAngle({ x: Number.NaN, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(0);
      expect(
        calculateAngle({ x: Number.POSITIVE_INFINITY, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })
      ).toBe(0);
      expect(calculateAngle(null, undefined, { x: 1, y: 0 })).toBe(0);
      expect(calculateVerticalDeviationDegrees(0.5, 0)).toBe(0);
      expect(calculateVerticalDeviationDegrees(Number.NaN, 1)).toBe(0);
    });

    it("never leaks NaN or increments reps on empty, missing, or corrupted landmarks", () => {
      const detectors = [
        new SquatDetector(),
        new PushUpDetector(),
        new BicepsCurlDetector(),
        new ShoulderPressDetector(),
        new LungeDetector(),
      ];

      const corrupted: PoseLandmark[] = Array.from({ length: 33 }, () => ({
        x: Number.NaN,
        y: Number.POSITIVE_INFINITY,
        visibility: Number.NaN,
      }));

      for (const detector of detectors) {
        const emptyResult = detector.process([]);
        expect(emptyResult.landmarksValid).toBe(false);
        expect(emptyResult.repCount).toBe(0);
        expect(emptyResult.repCompleted).toBe(false);

        const corruptResult = detector.process(corrupted);
        expect(corruptResult.landmarksValid).toBe(false);
        expect(corruptResult.repCount).toBe(0);
        for (const val of Object.values(corruptResult.metrics)) {
          if (typeof val === "number") {
            expect(Number.isFinite(val)).toBe(true);
          }
        }
      }
    });
  });

  describe("Exact Python reference fixture parity", () => {
    const raw = fs.readFileSync(FIXTURE_PATH, "utf-8");
    const fixtures = JSON.parse(raw) as Record<ExerciseType, ParityStep[]>;

    const exercises: ExerciseType[] = [
      "squats",
      "pushups",
      "biceps_curls",
      "shoulder_press",
      "lunges",
    ];

    for (const exercise of exercises) {
      it(`matches Python ${exercise} detector frame-by-frame`, () => {
        const detector = createExerciseDetector(exercise);
        const steps = fixtures[exercise];
        expect(steps.length).toBeGreaterThan(5);

        for (const step of steps) {
          if (step.action === "reset") {
            detector.reset();
            continue;
          }

          const result = detector.process(step.landmarks ?? []);
          expect(result.legacyMetrics, `${exercise}:${step.label}`).toEqual(
            step.expected
          );
          expect(result.stage, `${exercise}:${step.label} stage`).toBe(
            step.expectedStage
          );
        }
      });
    }
  });
});
