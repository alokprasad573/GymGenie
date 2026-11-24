"use client";

import * as React from "react";
import type { ExerciseType } from "@/types/exercise";
import { cn } from "@/lib/utils";

export type Vec3 = [number, number, number];

/**
 * Overall visual scale factor (10% smaller than baseline 1.0) so the rig sits
 * comfortably inside every container with generous breathing room and zero clipping.
 */
export const RIG_OVERALL_SCALE = 0.9;

// 15-joint articulated biomechanical rig:
// 0: head, 1: neck, 2: L-shoulder, 3: R-shoulder, 4: L-elbow, 5: R-elbow,
// 6: L-wrist, 7: R-wrist, 8: pelvis, 9: L-hip, 10: R-hip,
// 11: L-knee, 12: R-knee, 13: L-ankle, 14: R-ankle
export const RIG_BONES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], // head -> neck
  [1, 2], // neck -> L-shoulder
  [1, 3], // neck -> R-shoulder
  [1, 8], // spine (neck -> pelvis)
  [2, 4], // L upper arm
  [4, 6], // L forearm
  [3, 5], // R upper arm
  [5, 7], // R forearm
  [8, 9], // pelvis -> L-hip
  [8, 10], // pelvis -> R-hip
  [9, 11], // L thigh
  [11, 13], // L shin
  [10, 12], // R thigh
  [12, 14], // R shin
];

export interface ExercisePoseProfile {
  /** Primary tracked joints highlighted in accent lime (#C6FF4D) */
  primaryJoints: ReadonlySet<number>;
  /** Keyframe A: starting / extended posture */
  start: ReadonlyArray<Vec3>;
  /** Keyframe B: peak flexion / overhead / lowered posture */
  peak: ReadonlyArray<Vec3>;
  /** Floor Y coordinate aligned strictly under lowest support contact */
  floorY: number;
  /** Floor reticle radius sized proportionally to the stance */
  floorRadius: number;
  /** Optimal viewing yaw (radians) showing joint angles clearly */
  baseYaw: number;
  /** Rep animation cadence (rad/s) */
  speed: number;
  /** Accessible description for screen readers */
  ariaDescription: string;
}

export interface ProfileBounds {
  center: Vec3;
  halfSize: Vec3;
  maxRadiusXZ: number;
  minY: number;
  maxY: number;
}

export const EXERCISE_RIG_PROFILES: Record<ExerciseType, ExercisePoseProfile> = {
  squats: {
    primaryJoints: new Set([9, 10, 11, 12]),
    floorY: -1.16,
    floorRadius: 0.92,
    baseYaw: 0.44,
    speed: 1.5,
    ariaDescription:
      "3D biomechanical squat rig highlighting hip and knee depth alignment",
    start: [
      [0, 1.38, 0], // 0 head
      [0, 1.14, 0], // 1 neck
      [-0.36, 1.08, 0], // 2 L shoulder
      [0.36, 1.08, 0], // 3 R shoulder
      [-0.5, 0.72, 0.14], // 4 L elbow
      [0.5, 0.72, 0.14], // 5 R elbow
      [-0.36, 0.84, 0.42], // 6 L wrist
      [0.36, 0.84, 0.42], // 7 R wrist
      [0, 0.36, -0.02], // 8 pelvis
      [-0.22, 0.32, -0.02], // 9 L hip
      [0.22, 0.32, -0.02], // 10 R hip
      [-0.27, -0.4, 0.06], // 11 L knee
      [0.27, -0.4, 0.06], // 12 R knee
      [-0.27, -1.12, 0], // 13 L ankle
      [0.27, -1.12, 0], // 14 R ankle
    ],
    peak: [
      [0, 0.92, 0.18],
      [0, 0.68, 0.15],
      [-0.36, 0.62, 0.14],
      [0.36, 0.62, 0.14],
      [-0.44, 0.5, 0.52],
      [0.44, 0.5, 0.52],
      [-0.32, 0.56, 0.86],
      [0.32, 0.56, 0.86],
      [0, -0.1, -0.28],
      [-0.24, -0.12, -0.28],
      [0.24, -0.12, -0.28],
      [-0.32, -0.42, 0.34],
      [0.32, -0.42, 0.34],
      [-0.27, -1.12, 0],
      [0.27, -1.12, 0],
    ],
  },
  pushups: {
    primaryJoints: new Set([2, 3, 4, 5, 9, 10]),
    floorY: -0.56,
    floorRadius: 1.18,
    baseYaw: 0.16,
    speed: 1.45,
    ariaDescription:
      "3D biomechanical push-up rig highlighting elbow flexion and plank alignment",
    start: [
      [-0.98, 0.46, 0], // 0 head
      [-0.76, 0.36, 0], // 1 neck
      [-0.7, 0.34, -0.24], // 2 L shoulder
      [-0.7, 0.34, 0.24], // 3 R shoulder
      [-0.7, -0.08, -0.28], // 4 L elbow
      [-0.7, -0.08, 0.28], // 5 R elbow
      [-0.7, -0.52, -0.26], // 6 L wrist
      [-0.7, -0.52, 0.26], // 7 R wrist
      [0.12, 0.04, 0], // 8 pelvis
      [0.12, 0.04, -0.16], // 9 L hip
      [0.12, 0.04, 0.16], // 10 R hip
      [0.6, -0.22, -0.14], // 11 L knee
      [0.6, -0.22, 0.14], // 12 R knee
      [1.06, -0.5, -0.12], // 13 L ankle
      [1.06, -0.5, 0.12], // 14 R ankle
    ],
    peak: [
      [-1.0, 0.0, 0],
      [-0.78, -0.1, 0],
      [-0.72, -0.12, -0.26],
      [-0.72, -0.12, 0.26],
      [-0.48, -0.14, -0.48],
      [-0.48, -0.14, 0.48],
      [-0.7, -0.52, -0.26],
      [-0.7, -0.52, 0.26],
      [0.12, -0.22, 0],
      [0.12, -0.22, -0.16],
      [0.12, -0.22, 0.16],
      [0.6, -0.36, -0.14],
      [0.6, -0.36, 0.14],
      [1.06, -0.5, -0.12],
      [1.06, -0.5, 0.12],
    ],
  },
  biceps_curls: {
    primaryJoints: new Set([2, 3, 4, 5, 6, 7]),
    floorY: -1.16,
    floorRadius: 0.86,
    baseYaw: -0.32,
    speed: 1.65,
    ariaDescription:
      "3D biomechanical biceps curl rig highlighting elbow flexion and shoulder stability",
    start: [
      [0, 1.38, 0],
      [0, 1.14, 0],
      [-0.38, 1.08, 0],
      [0.38, 1.08, 0],
      [-0.43, 0.58, 0.04],
      [0.43, 0.58, 0.04],
      [-0.45, 0.1, 0.1],
      [0.45, 0.1, 0.1],
      [0, 0.34, 0],
      [-0.22, 0.3, 0],
      [0.22, 0.3, 0],
      [-0.24, -0.4, 0.04],
      [0.24, -0.4, 0.04],
      [-0.24, -1.12, 0],
      [0.24, -1.12, 0],
    ],
    peak: [
      [0, 1.38, 0],
      [0, 1.14, 0],
      [-0.38, 1.08, 0],
      [0.38, 1.08, 0],
      [-0.41, 0.58, 0.08],
      [0.41, 0.58, 0.08],
      [-0.39, 0.96, 0.34],
      [0.39, 0.96, 0.34],
      [0, 0.34, 0],
      [-0.22, 0.3, 0],
      [0.22, 0.3, 0],
      [-0.24, -0.4, 0.04],
      [0.24, -0.4, 0.04],
      [-0.24, -1.12, 0],
      [0.24, -1.12, 0],
    ],
  },
  shoulder_press: {
    primaryJoints: new Set([2, 3, 4, 5, 6, 7]),
    floorY: -1.18,
    floorRadius: 0.9,
    baseYaw: 0.2,
    speed: 1.55,
    ariaDescription:
      "3D biomechanical shoulder press rig highlighting overhead elbow extension",
    start: [
      [0, 1.16, 0],
      [0, 0.94, 0],
      [-0.36, 0.88, 0],
      [0.36, 0.88, 0],
      [-0.68, 0.72, 0.1],
      [0.68, 0.72, 0.1],
      [-0.64, 1.12, 0.14],
      [0.64, 1.12, 0.14],
      [0, 0.2, 0],
      [-0.21, 0.16, 0],
      [0.21, 0.16, 0],
      [-0.23, -0.48, 0.04],
      [0.23, -0.48, 0.04],
      [-0.23, -1.14, 0],
      [0.23, -1.14, 0],
    ],
    peak: [
      [0, 1.16, 0],
      [0, 0.94, 0],
      [-0.36, 0.92, 0],
      [0.36, 0.92, 0],
      [-0.44, 1.32, 0.06],
      [0.44, 1.32, 0.06],
      [-0.36, 1.72, 0.06],
      [0.36, 1.72, 0.06],
      [0, 0.2, 0],
      [-0.21, 0.16, 0],
      [0.21, 0.16, 0],
      [-0.23, -0.48, 0.04],
      [0.23, -0.48, 0.04],
      [-0.23, -1.14, 0],
      [0.23, -1.14, 0],
    ],
  },
  lunges: {
    primaryJoints: new Set([9, 10, 11, 12]),
    floorY: -1.16,
    floorRadius: 1.04,
    baseYaw: 0.56,
    speed: 1.45,
    ariaDescription:
      "3D biomechanical lunge rig highlighting front knee depth and upright torso",
    start: [
      [0, 1.36, 0],
      [0, 1.12, 0],
      [-0.34, 1.06, 0],
      [0.34, 1.06, 0],
      [-0.44, 0.68, 0.08],
      [0.44, 0.68, 0.08],
      [-0.38, 0.34, 0.12],
      [0.38, 0.34, 0.12],
      [0, 0.34, 0],
      [-0.22, 0.3, 0],
      [0.22, 0.3, 0],
      [-0.24, -0.4, 0.24],
      [0.24, -0.4, -0.2],
      [-0.24, -1.12, 0.3],
      [0.24, -1.12, -0.3],
    ],
    peak: [
      [0, 1.0, 0.06],
      [0, 0.76, 0.06],
      [-0.34, 0.7, 0.06],
      [0.34, 0.7, 0.06],
      [-0.44, 0.34, 0.12],
      [0.44, 0.34, 0.12],
      [-0.38, 0.06, 0.18],
      [0.38, 0.06, 0.18],
      [0, -0.02, 0.04],
      [-0.22, -0.04, 0.04],
      [0.22, -0.04, 0.04],
      [-0.24, -0.4, 0.58],
      [0.24, -0.84, -0.22],
      [-0.24, -1.12, 0.58],
      [0.24, -1.08, -0.78],
    ],
  },
};

/**
 * Computes exact 3D bounding dimensions for a profile across both start & peak
 * keyframes plus its floor reticle so the camera auto-fits with zero clipping.
 */
export function computeProfileBounds(profile: ExercisePoseProfile): ProfileBounds {
  const pad = 0.12; // accounts for head/joint sphere radii
  let minY = profile.floorY - 0.04;
  let maxY = -Infinity;
  let maxRadiusXZ = profile.floorRadius;

  for (const frame of [profile.start, profile.peak]) {
    for (const [x, y, z] of frame) {
      if (y - pad < minY) minY = y - pad;
      if (y + pad > maxY) maxY = y + pad;
      const r = Math.hypot(x, z) + pad;
      if (r > maxRadiusXZ) maxRadiusXZ = r;
    }
  }

  const centerY = (minY + maxY) * 0.5;
  const halfY = (maxY - minY) * 0.5;

  return {
    center: [0, centerY, 0],
    halfSize: [maxRadiusXZ, halfY, maxRadiusXZ],
    maxRadiusXZ,
    minY,
    maxY,
  };
}

/**
 * Pure SVG fallback wireframe with zero Three.js dependency.
 * Auto-fits its exact 2D bounding box with padding and 10% scale reduction so no
 * joint, limb, or floor ring ever clips on any viewport or exercise.
 */
export function StaticPoseWireframe({
  exercise = "squats",
  className,
}: {
  exercise?: ExerciseType;
  className?: string;
}) {
  const profile = EXERCISE_RIG_PROFILES[exercise];

  const projected = React.useMemo(() => {
    const cos = Math.cos(profile.baseYaw);
    const sin = Math.sin(profile.baseYaw);

    const rawPts = profile.start.map((s, i) => {
      const p = profile.peak[i]!;
      const x3 = s[0] + (p[0] - s[0]) * 0.52;
      const y3 = s[1] + (p[1] - s[1]) * 0.52;
      const z3 = s[2] + (p[2] - s[2]) * 0.52;
      const rx = x3 * cos + z3 * sin;
      return [rx, y3] as const;
    });

    // Include floor ellipse extents in auto-fit bounds
    const floorRx = profile.floorRadius * 0.85;
    let minX = -floorRx;
    let maxX = floorRx;
    let minY = profile.floorY - 0.14;
    let maxY = -Infinity;

    for (const [x, y] of rawPts) {
      if (x - 0.12 < minX) minX = x - 0.12;
      if (x + 0.12 > maxX) maxX = x + 0.12;
      if (y - 0.12 < minY) minY = y - 0.12;
      if (y + 0.12 > maxY) maxY = y + 0.12;
    }

    const vbW = 260;
    const vbH = 260;
    const pad = 28; // generous margin + 10% overall reduction
    const spanX = Math.max(0.01, maxX - minX);
    const spanY = Math.max(0.01, maxY - minY);
    const scale =
      Math.min((vbW - pad * 2) / spanX, (vbH - pad * 2) / spanY) *
      RIG_OVERALL_SCALE;

    const midX = (minX + maxX) * 0.5;
    const midY = (minY + maxY) * 0.5;

    const round2 = (n: number) => Math.round(n * 100) / 100;

    const toSvg = (x: number, y: number): readonly [number, number] => [
      round2(vbW * 0.5 + (x - midX) * scale),
      round2(vbH * 0.5 - (y - midY) * scale),
    ];

    return {
      joints: rawPts.map(([x, y]) => toSvg(x, y)),
      floorCenter: toSvg(0, profile.floorY),
      floorRx: round2(floorRx * scale),
      floorRy: round2(Math.max(6, floorRx * 0.19 * scale)),
    };
  }, [profile]);

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center rounded-[8px] bg-canvas p-2",
        className
      )}
    >
      <svg
        viewBox="0 0 260 260"
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
        role="img"
        aria-label={profile.ariaDescription}
      >
        <ellipse
          cx={projected.floorCenter[0]}
          cy={projected.floorCenter[1]}
          rx={projected.floorRx}
          ry={projected.floorRy}
          fill="none"
          stroke="rgba(245,247,242,0.12)"
          strokeWidth="1.2"
        />
        <ellipse
          cx={projected.floorCenter[0]}
          cy={projected.floorCenter[1]}
          rx={projected.floorRx * 0.58}
          ry={projected.floorRy * 0.58}
          fill="none"
          stroke="rgba(198,255,77,0.28)"
          strokeWidth="1"
        />
        <g stroke="#7C877E" strokeWidth="2.4" strokeLinecap="round" fill="none">
          {RIG_BONES.map(([a, b], idx) => {
            const p1 = projected.joints[a];
            const p2 = projected.joints[b];
            if (!p1 || !p2) return null;
            return (
              <line key={idx} x1={p1[0]} y1={p1[1]} x2={p2[0]} y2={p2[1]} />
            );
          })}
        </g>
        {projected.joints.map(([cx, cy], idx) => {
          const isPrimary = profile.primaryJoints.has(idx);
          const r = idx === 0 ? 6.2 : isPrimary ? 4.8 : 3.2;
          return (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={r}
              fill={isPrimary ? "#C6FF4D" : "#F5F7F2"}
            />
          );
        })}
      </svg>
    </div>
  );
}
