"use client";

export type CameraErrorCode =
  | "UNSUPPORTED_BROWSER"
  | "PERMISSION_DENIED"
  | "NO_CAMERA"
  | "DEVICE_BUSY"
  | "DEVICE_DISCONNECTED"
  | "UNKNOWN";

export interface CameraErrorInfo {
  code: CameraErrorCode;
  title: string;
  guidance: string;
}

export interface VideoDeviceOption {
  deviceId: string;
  label: string;
}

export function mapCameraError(error: unknown): CameraErrorInfo {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== "function"
  ) {
    return {
      code: "UNSUPPORTED_BROWSER",
      title: "Camera API unavailable",
      guidance:
        "Use a modern browser over HTTPS or localhost to enable real-time pose tracking.",
    };
  }

  const name =
    error instanceof DOMException || error instanceof Error ? error.name : "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return {
      code: "PERMISSION_DENIED",
      title: "Camera permission denied",
      guidance:
        "Allow camera access in your browser site settings, then click Retry camera.",
    };
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return {
      code: "NO_CAMERA",
      title: "No camera detected",
      guidance:
        "Connect a webcam or check that your device camera is enabled in system settings.",
    };
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return {
      code: "DEVICE_BUSY",
      title: "Camera is already in use",
      guidance:
        "Close other apps or browser tabs using your camera, then try again.",
    };
  }
  if (name === "AbortError") {
    return {
      code: "DEVICE_DISCONNECTED",
      title: "Camera connection interrupted",
      guidance: "Reconnect your camera and click Retry camera to continue.",
    };
  }

  return {
    code: "UNKNOWN",
    title: "Could not initialize camera",
    guidance:
      error instanceof Error && error.message
        ? error.message
        : "Check camera permissions and hardware, then retry.",
  };
}

export async function enumerateVideoDevices(): Promise<VideoDeviceOption[]> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.enumerateDevices !== "function"
  ) {
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices
      .filter((d) => d.kind === "videoinput")
      .map((d, index) => ({
        deviceId: d.deviceId,
        label: d.label.trim() || `Camera ${index + 1}`,
      }));
  } catch {
    return [];
  }
}

export async function acquireCameraStream(
  deviceId?: string
): Promise<MediaStream> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    typeof navigator.mediaDevices.getUserMedia !== "function"
  ) {
    throw new Error("Camera API unavailable in this browser");
  }

  const videoConstraints: MediaTrackConstraints = {
    width: { ideal: 1280, max: 1920 },
    height: { ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 30 },
    ...(deviceId
      ? { deviceId: { exact: deviceId } }
      : { facingMode: "user" }),
  };

  try {
    return await navigator.mediaDevices.getUserMedia({
      video: videoConstraints,
      audio: false,
    });
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === "OverconstrainedError" || err.name === "ConstraintNotSatisfiedError")
    ) {
      return navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId } : true,
        audio: false,
      });
    }
    throw err;
  }
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      // Ignore already-stopped track errors during cleanup
    }
  }
}
