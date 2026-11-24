"use client";

import { MEDIAPIPE_CONFIG, POSE_CONNECTIONS } from "@/config/exercises";
import type { PoseLandmark } from "@/types/exercise";

export interface SkeletonRenderOptions {
  mirrored?: boolean;
  poseDetected: boolean;
  statusBanner?: string;
}

export function renderPoseOverlay(
  canvas: HTMLCanvasElement,
  landmarks: readonly PoseLandmark[] | null,
  options: SkeletonRenderOptions
): void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  if (!options.poseDetected || !landmarks || landmarks.length === 0) {
    ctx.fillStyle = "rgba(9, 11, 10, 0.72)";
    ctx.fillRect(16, 16, 260, 52);
    ctx.strokeStyle = "rgba(245, 185, 66, 0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, 260, 52);

    ctx.fillStyle = "#F5B942";
    ctx.font = "600 13px ui-sans-serif, system-ui, -apple-system, sans-serif";
    ctx.fillText("NO POSE DETECTED", 28, 38);
    ctx.fillStyle = "#9AA49B";
    ctx.font = "400 12px ui-sans-serif, system-ui, sans-serif";
    ctx.fillText("Step into frame facing the camera", 28, 56);
    return;
  }

  const mirrored = options.mirrored ?? true;
  const visThreshold = MEDIAPIPE_CONFIG.landmarkVisibilityThreshold;
  const mapX = (nx: number) => (mirrored ? (1 - nx) * width : nx * width);
  const mapY = (ny: number) => ny * height;

  // Bone segments
  ctx.strokeStyle = "#C6FF4D";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.beginPath();

  for (const [startIdx, endIdx] of POSE_CONNECTIONS) {
    const p1 = landmarks[startIdx];
    const p2 = landmarks[endIdx];
    if (
      p1 &&
      p2 &&
      (p1.visibility ?? 0) > visThreshold &&
      (p2.visibility ?? 0) > visThreshold &&
      Number.isFinite(p1.x) &&
      Number.isFinite(p1.y) &&
      Number.isFinite(p2.x) &&
      Number.isFinite(p2.y)
    ) {
      ctx.moveTo(mapX(p1.x), mapY(p1.y));
      ctx.lineTo(mapX(p2.x), mapY(p2.y));
    }
  }
  ctx.stroke();

  // Joint dots
  for (const lm of landmarks) {
    if (
      (lm.visibility ?? 0) > visThreshold &&
      Number.isFinite(lm.x) &&
      Number.isFinite(lm.y)
    ) {
      const cx = mapX(lm.x);
      const cy = mapY(lm.y);
      ctx.beginPath();
      ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#F5F7F2";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "#090B0A";
      ctx.stroke();
    }
  }

  // Bottom form status readout
  if (options.statusBanner) {
    const padX = 14;
    ctx.font = "600 12px ui-sans-serif, system-ui, -apple-system, sans-serif";
    const textWidth = ctx.measureText(options.statusBanner).width;
    const boxWidth = Math.min(width - 32, textWidth + padX * 2);
    const boxY = height - 46;

    ctx.fillStyle = "rgba(9, 11, 10, 0.78)";
    ctx.fillRect(16, boxY, boxWidth, 30);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
    ctx.lineWidth = 1;
    ctx.strokeRect(16, boxY, boxWidth, 30);

    ctx.fillStyle = "#F5F7F2";
    ctx.fillText(options.statusBanner, 16 + padX, boxY + 19);
  }
}
