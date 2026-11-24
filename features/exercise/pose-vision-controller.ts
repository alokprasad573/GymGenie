"use client";

import { MEDIAPIPE_CONFIG } from "@/config/exercises";
import type { PoseLandmark } from "@/types/exercise";
import {
  acquireCameraStream,
  mapCameraError,
  stopMediaStream,
  type CameraErrorInfo,
} from "@/features/exercise/camera-controller";
import {
  extractMediaPipePoseLandmarks,
  type MediaPipePoseLandmarkerResultLike,
} from "@/features/exercise/mediapipe-landmarks";

export interface PoseLandmarkerLike {
  detectForVideo(
    video: HTMLVideoElement,
    timestampMs: number
  ): MediaPipePoseLandmarkerResultLike;
  close(): void;
}

export interface VisionControllerCallbacks {
  onLandmarks: (landmarks: PoseLandmark[] | null, timestampMs: number) => void;
  onError: (error: CameraErrorInfo) => void;
  onFpsUpdate?: (fps: number) => void;
}

export interface PoseVisionControllerOptions {
  minFrameIntervalMs?: number;
  loadLandmarker?: () => Promise<PoseLandmarkerLike>;
}

export async function createMediaPipePoseLandmarker(): Promise<PoseLandmarkerLike> {
  const vision = await import("@mediapipe/tasks-vision");
  const wasmFileset = await vision.FilesetResolver.forVisionTasks(
    MEDIAPIPE_CONFIG.wasmBasePath
  );

  const buildOptions = (delegate: "GPU" | "CPU") => ({
    baseOptions: {
      modelAssetPath: MEDIAPIPE_CONFIG.modelAssetPath,
      delegate,
    },
    runningMode: "VIDEO" as const,
    numPoses: 1,
    minPoseDetectionConfidence: MEDIAPIPE_CONFIG.minPoseDetectionConfidence,
    minPosePresenceConfidence: MEDIAPIPE_CONFIG.minPosePresenceConfidence,
    minTrackingConfidence: MEDIAPIPE_CONFIG.minTrackingConfidence,
    outputSegmentationMasks: false,
  });

  try {
    return await vision.PoseLandmarker.createFromOptions(
      wasmFileset,
      buildOptions("GPU")
    );
  } catch (gpuError) {
    try {
      return await vision.PoseLandmarker.createFromOptions(
        wasmFileset,
        buildOptions("CPU")
      );
    } catch {
      throw gpuError;
    }
  }
}

function waitForVideoMetadata(
  videoElement: HTMLVideoElement,
  timeoutMs = 10_000
): Promise<void> {
  if (
    videoElement.readyState >= 1 &&
    videoElement.videoWidth > 0 &&
    videoElement.videoHeight > 0
  ) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      videoElement.removeEventListener("loadedmetadata", onLoaded);
      videoElement.removeEventListener("error", onError);
      window.clearTimeout(timer);
    };

    const onLoaded = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };

    const onError = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Video stream failed to load metadata"));
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    }, timeoutMs);

    videoElement.addEventListener("loadedmetadata", onLoaded, { once: true });
    videoElement.addEventListener("error", onError, { once: true });
  });
}

export class PoseVisionController {
  private stream: MediaStream | null = null;
  private landmarker: PoseLandmarkerLike | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private rafId: number | null = null;
  private disposed = false;
  private running = false;
  private processingFrame = false;
  private initNonce = 0;
  private lastTimestampMs = 0;
  private lastInferenceAt = 0;
  private lastVideoTime = -1;
  private frameCounter = 0;
  private fpsWindowStart = 0;
  private readonly minFrameIntervalMs: number;
  private readonly loadLandmarkerFn: () => Promise<PoseLandmarkerLike>;
  private readonly callbacks: VisionControllerCallbacks;
  private visibilityListener: (() => void) | null = null;
  private pageHideListener: (() => void) | null = null;

  constructor(
    callbacks: VisionControllerCallbacks,
    options: PoseVisionControllerOptions = {}
  ) {
    this.callbacks = callbacks;
    this.minFrameIntervalMs = options.minFrameIntervalMs ?? 33; // ~30fps cap
    this.loadLandmarkerFn =
      options.loadLandmarker ?? createMediaPipePoseLandmarker;
  }

  public async initialize(
    videoElement: HTMLVideoElement,
    deviceId?: string
  ): Promise<boolean> {
    const currentNonce = ++this.initNonce;
    this.disposed = false;
    this.stopLoop();
    this.detachStream();
    this.closeLandmarker();
    this.lastTimestampMs = 0;
    this.lastInferenceAt = 0;
    this.lastVideoTime = -1;

    this.videoElement = videoElement;

    // 1. Request webcam access with structured permission and device error handling
    let stream: MediaStream;
    try {
      stream = await acquireCameraStream(deviceId);
    } catch (err) {
      if (this.disposed || currentNonce !== this.initNonce) return false;
      this.callbacks.onError(mapCameraError(err));
      return false;
    }

    if (this.disposed || currentNonce !== this.initNonce) {
      stopMediaStream(stream);
      return false;
    }

    this.stream = stream;
    for (const track of stream.getVideoTracks()) {
      track.onended = () => {
        if (!this.disposed && currentNonce === this.initNonce) {
          this.stopLoop();
          this.callbacks.onError({
            code: "DEVICE_DISCONNECTED",
            title: "Camera disconnected",
            guidance: "Reconnect your camera or select another video device.",
          });
        }
      };
    }

    // 2. Attach stream, wait for video metadata, and begin playback
    videoElement.srcObject = stream;
    videoElement.muted = true;
    videoElement.playsInline = true;

    try {
      await waitForVideoMetadata(videoElement);
      if (this.disposed || currentNonce !== this.initNonce) {
        this.detachStream();
        return false;
      }
      await videoElement.play();
    } catch (err) {
      if (this.disposed || currentNonce !== this.initNonce) {
        this.detachStream();
        return false;
      }
      this.detachStream();
      this.callbacks.onError(mapCameraError(err));
      return false;
    }

    // 3. Initialize MediaPipe Tasks Vision PoseLandmarker (GPU with CPU fallback)
    try {
      const lm = await this.loadLandmarkerFn();
      if (this.disposed || currentNonce !== this.initNonce) {
        try {
          lm.close();
        } catch {
          // Ignore close errors for superseded initialization
        }
        return false;
      }
      this.landmarker = lm;
    } catch (err) {
      if (this.disposed || currentNonce !== this.initNonce) return false;
      this.detachStream();
      const detail =
        err instanceof Error && err.message ? ` (${err.message})` : "";
      this.callbacks.onError({
        code: "UNKNOWN",
        title: "Pose model failed to load",
        guidance: `Could not initialize MediaPipe Pose Landmarker${detail}. Verify access to the Tasks Vision WASM runtime and ${MEDIAPIPE_CONFIG.modelAssetPath}, then click Retry camera.`,
      });
      return false;
    }

    this.attachLifecycleHandlers();
    this.startLoop();
    return true;
  }

  public startLoop(): void {
    if (this.disposed || this.running) return;
    this.running = true;
    this.fpsWindowStart = performance.now();
    this.frameCounter = 0;

    const loopNonce = this.initNonce;

    const tick = (now: number) => {
      if (this.disposed || !this.running || loopNonce !== this.initNonce) {
        return;
      }
      this.rafId = window.requestAnimationFrame(tick);

      if (typeof document !== "undefined" && document.hidden) {
        return;
      }

      if (this.processingFrame) {
        return;
      }

      if (
        this.minFrameIntervalMs > 0 &&
        this.lastInferenceAt > 0 &&
        now >= this.lastInferenceAt &&
        now - this.lastInferenceAt < this.minFrameIntervalMs
      ) {
        return;
      }

      const video = this.videoElement;
      const landmarker = this.landmarker;
      if (
        !video ||
        !landmarker ||
        video.readyState < 2 ||
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        return;
      }

      // Skip duplicate decoded frames on live streams where currentTime advances per frame
      if (video.currentTime > 0 && video.currentTime === this.lastVideoTime) {
        return;
      }

      this.processingFrame = true;
      this.lastInferenceAt = Math.max(this.lastInferenceAt, now);
      if (video.currentTime > 0) {
        this.lastVideoTime = video.currentTime;
      }

      // MediaPipe VIDEO mode requires strictly monotonically increasing integer timestamps
      const monotonicTs = Math.max(this.lastTimestampMs + 1, Math.round(now));
      this.lastTimestampMs = monotonicTs;

      try {
        const result = landmarker.detectForVideo(video, monotonicTs);
        const landmarks = extractMediaPipePoseLandmarks(result);
        this.callbacks.onLandmarks(landmarks, monotonicTs);

        this.frameCounter += 1;
        if (now - this.fpsWindowStart >= 1000) {
          const fps = Math.round(
            (this.frameCounter * 1000) / Math.max(1, now - this.fpsWindowStart)
          );
          this.callbacks.onFpsUpdate?.(fps);
          this.frameCounter = 0;
          this.fpsWindowStart = now;
        }
      } catch {
        // Skip single-frame inference errors without terminating the workout session
      } finally {
        this.processingFrame = false;
      }
    };

    this.rafId = window.requestAnimationFrame(tick);
  }

  public stopLoop(): void {
    this.running = false;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private attachLifecycleHandlers(): void {
    if (typeof document !== "undefined" && !this.visibilityListener) {
      this.visibilityListener = () => {
        if (this.disposed) return;
        if (document.hidden) {
          this.stopLoop();
        } else if (this.stream && this.landmarker) {
          this.startLoop();
        }
      };
      document.addEventListener("visibilitychange", this.visibilityListener);
    }

    if (typeof window !== "undefined" && !this.pageHideListener) {
      this.pageHideListener = () => {
        this.dispose();
      };
      window.addEventListener("pagehide", this.pageHideListener);
    }
  }

  private detachStream(): void {
    if (this.stream) {
      stopMediaStream(this.stream);
      this.stream = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  private closeLandmarker(): void {
    if (!this.landmarker) return;
    const lm = this.landmarker;
    this.landmarker = null;
    try {
      lm.close();
    } catch {
      // Ignore disposal errors from already-closed landmarker instances
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.initNonce += 1;
    this.stopLoop();
    this.detachStream();

    if (typeof document !== "undefined" && this.visibilityListener) {
      document.removeEventListener("visibilitychange", this.visibilityListener);
      this.visibilityListener = null;
    }

    if (typeof window !== "undefined" && this.pageHideListener) {
      window.removeEventListener("pagehide", this.pageHideListener);
      this.pageHideListener = null;
    }

    this.closeLandmarker();
    this.videoElement = null;
  }
}
