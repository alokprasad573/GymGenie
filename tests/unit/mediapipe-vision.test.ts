import { describe, expect, it, vi } from "vitest";
import { MEDIAPIPE_CONFIG } from "@/config/exercises";
import {
  extractMediaPipePoseLandmarks,
  MEDIAPIPE_POSE_LANDMARK_COUNT,
  type MediaPipeNormalizedLandmarkLike,
} from "@/features/exercise/mediapipe-landmarks";
import {
  createMediaPipePoseLandmarker,
  PoseVisionController,
  type PoseLandmarkerLike,
} from "@/features/exercise/pose-vision-controller";
import { SquatDetector } from "@/services/exercise/detectors/squat.detector";

const mockForVisionTasks = vi.fn();
const mockCreateFromOptions = vi.fn();

vi.mock("@mediapipe/tasks-vision", () => ({
  FilesetResolver: {
    forVisionTasks: (...args: unknown[]) => mockForVisionTasks(...args),
  },
  PoseLandmarker: {
    createFromOptions: (...args: unknown[]) => mockCreateFromOptions(...args),
  },
}));

function makeMediaPipePose(
  overrides: Record<number, Partial<MediaPipeNormalizedLandmarkLike>> = {}
): MediaPipeNormalizedLandmarkLike[] {
  return Array.from({ length: MEDIAPIPE_POSE_LANDMARK_COUNT }, (_, idx) => ({
    x: 0.5,
    y: 0.5,
    z: -0.05,
    visibility: 0.9,
    ...overrides[idx],
  }));
}

describe("MediaPipe Tasks Vision PoseLandmarker Integration", () => {
  describe("Landmark extraction & normalization preservation", () => {
    it("preserves all 33 real normalized landmarks verbatim and feeds SquatDetector", () => {
      const rawDown = makeMediaPipePose({
        11: { x: 0.5, y: 0.25, z: -0.1, visibility: 0.92 },
        12: { x: 0.5, y: 0.25, z: -0.1, visibility: 0.85 },
        23: { x: 0.5, y: 0.5, z: -0.02, visibility: 0.95 },
        24: { x: 0.5, y: 0.5, z: -0.02, visibility: 0.88 },
        25: { x: 0.7, y: 0.5, z: 0.04, visibility: 0.93 },
        26: { x: 0.7, y: 0.5, z: 0.04, visibility: 0.84 },
        27: { x: 0.7, y: 0.8, z: 0.01, visibility: 0.91 },
        28: { x: 0.7, y: 0.8, z: 0.01, visibility: 0.82 },
      });

      const extractedDown = extractMediaPipePoseLandmarks({
        landmarks: [rawDown],
      });
      expect(extractedDown).toHaveLength(33);
      // Verify coordinates and visibility are preserved without rescaling
      expect(extractedDown?.[25]).toEqual({
        x: 0.7,
        y: 0.5,
        z: 0.04,
        visibility: 0.93,
      });

      const detector = new SquatDetector();
      const downResult = detector.process(extractedDown!);
      expect(downResult.landmarksValid).toBe(true);
      expect(downResult.stage).toBe("down");
      expect(downResult.repCount).toBe(0);

      const rawUp = makeMediaPipePose({
        11: { x: 0.5, y: 0.2, visibility: 0.94 },
        12: { x: 0.5, y: 0.2, visibility: 0.86 },
        23: { x: 0.5, y: 0.45, visibility: 0.95 },
        24: { x: 0.5, y: 0.45, visibility: 0.88 },
        25: { x: 0.5, y: 0.65, visibility: 0.93 },
        26: { x: 0.5, y: 0.65, visibility: 0.85 },
        27: { x: 0.5, y: 0.85, visibility: 0.92 },
        28: { x: 0.5, y: 0.85, visibility: 0.84 },
      });

      const extractedUp = extractMediaPipePoseLandmarks({
        landmarks: [rawUp],
      });
      const upResult = detector.process(extractedUp!);
      expect(upResult.repCompleted).toBe(true);
      expect(upResult.repCount).toBe(1);
      expect(upResult.stage).toBe("up");
    });

    it("returns null on empty results, partial landmark arrays, non-finite coordinates, or zero-visibility poses", () => {
      expect(extractMediaPipePoseLandmarks(null)).toBeNull();
      expect(extractMediaPipePoseLandmarks({ landmarks: [] })).toBeNull();

      // Fewer than 33 landmarks must NOT fabricate missing entries
      const partial = makeMediaPipePose().slice(0, 17);
      expect(
        extractMediaPipePoseLandmarks({ landmarks: [partial] })
      ).toBeNull();

      // Corrupted non-finite coordinate
      const nonFinite = makeMediaPipePose({ 11: { x: Number.NaN, y: 0.3 } });
      expect(
        extractMediaPipePoseLandmarks({ landmarks: [nonFinite] })
      ).toBeNull();

      // Zero visibility across all 33 landmarks
      const invisible = Array.from({ length: 33 }, () => ({
        x: 0.5,
        y: 0.5,
        visibility: 0,
      }));
      expect(
        extractMediaPipePoseLandmarks({ landmarks: [invisible] })
      ).toBeNull();
    });
  });

  describe("PoseLandmarker factory (GPU first with CPU fallback)", () => {
    it("initializes VIDEO mode with configured model asset and falls back from GPU to CPU", async () => {
      mockForVisionTasks.mockReset();
      mockCreateFromOptions.mockReset();

      const fakeFileset = { wasmLoaderPath: "wasm-loader" };
      const fakeCpuLandmarker: PoseLandmarkerLike = {
        detectForVideo: vi.fn(),
        close: vi.fn(),
      };

      mockForVisionTasks.mockResolvedValue(fakeFileset);
      mockCreateFromOptions
        .mockRejectedValueOnce(new Error("WebGL delegate unavailable"))
        .mockResolvedValueOnce(fakeCpuLandmarker);

      const landmarker = await createMediaPipePoseLandmarker();
      expect(landmarker).toBe(fakeCpuLandmarker);
      expect(mockForVisionTasks).toHaveBeenCalledWith(
        MEDIAPIPE_CONFIG.wasmBasePath
      );
      expect(mockCreateFromOptions).toHaveBeenCalledTimes(2);
      expect(mockCreateFromOptions).toHaveBeenNthCalledWith(
        1,
        fakeFileset,
        expect.objectContaining({
          baseOptions: {
            modelAssetPath: "/models/pose_landmarker_full.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: MEDIAPIPE_CONFIG.minPoseDetectionConfidence,
          minPosePresenceConfidence: MEDIAPIPE_CONFIG.minPosePresenceConfidence,
          minTrackingConfidence: MEDIAPIPE_CONFIG.minTrackingConfidence,
          outputSegmentationMasks: false,
        })
      );
      expect(mockCreateFromOptions).toHaveBeenNthCalledWith(
        2,
        fakeFileset,
        expect.objectContaining({
          baseOptions: {
            modelAssetPath: "/models/pose_landmarker_full.task",
            delegate: "CPU",
          },
          runningMode: "VIDEO",
        })
      );
    });
  });

  describe("PoseVisionController lifecycle, timestamps, deduplication, and cleanup", () => {
    function setupMockCameraAndRaf() {
      const stopTrack = vi.fn();
      const fakeStream = {
        getTracks: () => [{ stop: stopTrack }],
        getVideoTracks: () => [{ stop: stopTrack, onended: null }],
      } as unknown as MediaStream;

      Object.defineProperty(navigator, "mediaDevices", {
        configurable: true,
        value: {
          getUserMedia: vi.fn().mockResolvedValue(fakeStream),
        },
      });

      const rafCallbacks: FrameRequestCallback[] = [];
      const rafSpy = vi
        .spyOn(window, "requestAnimationFrame")
        .mockImplementation((cb) => {
          rafCallbacks.push(cb);
          return rafCallbacks.length;
        });
      const cancelSpy = vi
        .spyOn(window, "cancelAnimationFrame")
        .mockImplementation(() => {});

      return { stopTrack, rafCallbacks, rafSpy, cancelSpy };
    }

    function createReadyVideo() {
      const video = document.createElement("video");
      Object.defineProperty(video, "readyState", {
        value: 4,
        configurable: true,
      });
      Object.defineProperty(video, "videoWidth", {
        value: 640,
        configurable: true,
      });
      Object.defineProperty(video, "videoHeight", {
        value: 480,
        configurable: true,
      });
      let currentTimeVal = 0;
      Object.defineProperty(video, "currentTime", {
        get: () => currentTimeVal,
        set: (v: number) => {
          currentTimeVal = v;
        },
        configurable: true,
      });
      video.play = vi.fn().mockResolvedValue(undefined);
      return video;
    }

    it("enforces strictly increasing timestamps, skips duplicate video frames, handles inference errors, and closes resources on reinit and dispose", async () => {
      const { stopTrack, rafCallbacks, rafSpy, cancelSpy } =
        setupMockCameraAndRaf();

      const detectForVideoA = vi
        .fn()
        .mockReturnValueOnce({ landmarks: [makeMediaPipePose()] })
        .mockReturnValueOnce({ landmarks: [] })
        .mockImplementationOnce(() => {
          throw new Error("Transient inference failure");
        });
      const closeA = vi.fn();

      const detectForVideoB = vi
        .fn()
        .mockReturnValue({ landmarks: [makeMediaPipePose()] });
      const closeB = vi.fn();

      const loadLandmarker = vi
        .fn<() => Promise<PoseLandmarkerLike>>()
        .mockResolvedValueOnce({
          detectForVideo: detectForVideoA,
          close: closeA,
        })
        .mockResolvedValueOnce({
          detectForVideo: detectForVideoB,
          close: closeB,
        });

      const onLandmarks = vi.fn();
      const onError = vi.fn();
      const onFpsUpdate = vi.fn();

      const controller = new PoseVisionController(
        { onLandmarks, onError, onFpsUpdate },
        { minFrameIntervalMs: 0, loadLandmarker }
      );

      const video = createReadyVideo();
      const ok = await controller.initialize(video);
      expect(ok).toBe(true);
      expect(onError).not.toHaveBeenCalled();

      // Frame 1 at currentTime = 1.0, rAF timestamp = 100
      video.currentTime = 1.0;
      rafCallbacks[0]?.(100);
      expect(detectForVideoA).toHaveBeenCalledTimes(1);
      expect(onLandmarks).toHaveBeenCalledTimes(1);
      expect(onLandmarks.mock.calls[0]?.[0]).toHaveLength(33);
      const ts1 = detectForVideoA.mock.calls[0]?.[1] as number;

      // Duplicate video frame (same currentTime = 1.0) should be skipped
      rafCallbacks[1]?.(130);
      expect(detectForVideoA).toHaveBeenCalledTimes(1);

      // Frame 2 with non-increasing rAF timestamp (90 < 100) must still pass strictly increasing timestamp
      video.currentTime = 1.033;
      rafCallbacks[2]?.(90);
      expect(detectForVideoA).toHaveBeenCalledTimes(2);
      const ts2 = detectForVideoA.mock.calls[1]?.[1] as number;
      expect(ts2).toBeGreaterThan(ts1);
      // Empty landmarks result delivers null (no pose detected)
      expect(onLandmarks).toHaveBeenCalledTimes(2);
      expect(onLandmarks.mock.calls[1]?.[0]).toBeNull();

      // Frame 3 throws transiently — must not crash or trigger fatal onError
      video.currentTime = 1.066;
      rafCallbacks[3]?.(1200);
      expect(detectForVideoA).toHaveBeenCalledTimes(3);
      expect(onError).not.toHaveBeenCalled();

      // Reinitialization must close prior landmarker and release prior camera tracks
      const reinitOk = await controller.initialize(video, "camera-2");
      expect(reinitOk).toBe(true);
      expect(closeA).toHaveBeenCalledTimes(1);
      expect(stopTrack).toHaveBeenCalledTimes(1);

      // Final disposal closes active landmarker, stops tracks, and cancels rAF
      controller.dispose();
      expect(closeB).toHaveBeenCalledTimes(1);
      expect(stopTrack).toHaveBeenCalledTimes(2);
      expect(cancelSpy).toHaveBeenCalled();

      rafSpy.mockRestore();
      cancelSpy.mockRestore();
    });

    it("releases camera stream and reports clear error when model loading fails", async () => {
      const { stopTrack, rafSpy, cancelSpy } = setupMockCameraAndRaf();

      const onLandmarks = vi.fn();
      const onError = vi.fn();
      const controller = new PoseVisionController(
        { onLandmarks, onError },
        {
          loadLandmarker: async () => {
            throw new Error("WASM fetch failed");
          },
        }
      );

      const video = createReadyVideo();
      const ok = await controller.initialize(video);
      expect(ok).toBe(false);
      expect(stopTrack).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Pose model failed to load",
        })
      );

      rafSpy.mockRestore();
      cancelSpy.mockRestore();
    });
  });
});
