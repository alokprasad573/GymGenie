"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import type { ExerciseType } from "@/types/exercise";
import { StaticPoseWireframe } from "@/components/three/pose-rig-data";
import { useReducedMotion } from "@/components/animations/use-reduced-motion";
import { cn } from "@/lib/utils";

const LazyPoseRigCanvas = dynamic(
  () =>
    import("@/components/three/pose-rig-canvas").then((m) => m.PoseRigCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center rounded-[8px] bg-canvas">
        <span className="text-xs text-ink-muted">Loading pose rig</span>
      </div>
    ),
  }
);

let cachedWebglSupport: boolean | null = null;

function noopSubscribe(): () => void {
  return () => {};
}

function detectWebGLSupport(): boolean {
  if (cachedWebglSupport !== null) return cachedWebglSupport;
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    cachedWebglSupport = Boolean(gl);
  } catch {
    cachedWebglSupport = false;
  }
  return cachedWebglSupport;
}

export interface ExerciseRigPreviewProps {
  exercise: ExerciseType;
  interactive?: boolean;
  compact?: boolean;
  /** Renders the static SVG fallback while webcam capture is active */
  paused?: boolean;
  className?: string;
}

/**
 * Client-only 3D exercise biomechanics preview with auto-fit framing and
 * zero-cost static SVG fallback for SSR, reduced motion, and non-WebGL devices.
 */
export function ExerciseRigPreview({
  exercise,
  interactive = true,
  compact = false,
  paused = false,
  className,
}: ExerciseRigPreviewProps) {
  const reducedMotion = useReducedMotion();
  const webglSupported = React.useSyncExternalStore(
    noopSubscribe,
    detectWebGLSupport,
    () => false
  );
  const canRender3D = !reducedMotion && !paused && webglSupported;

  return (
    <div
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden rounded-[8px] bg-canvas",
        className
      )}
    >
      {canRender3D ? (
        <LazyPoseRigCanvas
          exercise={exercise}
          interactive={interactive}
          compact={compact}
        />
      ) : (
        <StaticPoseWireframe exercise={exercise} />
      )}
    </div>
  );
}
