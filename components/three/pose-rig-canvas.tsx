"use client";

import * as React from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { ExerciseType } from "@/types/exercise";
import { useReducedMotion } from "@/components/animations/use-reduced-motion";
import {
  computeProfileBounds,
  EXERCISE_RIG_PROFILES,
  RIG_BONES,
  RIG_OVERALL_SCALE,
  StaticPoseWireframe,
  type ProfileBounds,
  type Vec3,
} from "@/components/three/pose-rig-data";
import { cn } from "@/lib/utils";

const UP_AXIS = new THREE.Vector3(0, 1, 0);

function createCirclePoints(radius: number, y: number, segments = 48): Vec3[] {
  const pts: Vec3[] = [];
  for (let i = 0; i <= segments; i++) {
    const theta = (i / segments) * Math.PI * 2;
    pts.push([Math.cos(theta) * radius, y, Math.sin(theta) * radius]);
  }
  return pts;
}

/**
 * Dynamically positions the perspective camera from the container's true pixel
 * aspect ratio and the active exercise's 3D bounding volume so that NO head,
 * wrist, ankle, or floor ring can ever be clipped at any screen width or height.
 */
function AutoFitCamera({ bounds }: { bounds: ProfileBounds }) {
  const { camera, size } = useThree();

  React.useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = Math.max(0.35, size.width / Math.max(1, size.height));
    const vFovRad = THREE.MathUtils.degToRad(camera.fov);
    const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);

    // Extra 16% framing margin + 10% reduced overall rig scale guarantees zero cutoff
    const margin = 1.16 / RIG_OVERALL_SCALE;
    const halfY = bounds.halfSize[1] * margin;
    const halfX = bounds.halfSize[0] * margin;
    const depthOffset = bounds.maxRadiusXZ;

    const distV = halfY / Math.tan(vFovRad / 2);
    const distH = halfX / Math.tan(hFovRad / 2);
    const safeZ = Math.max(distV, distH) + depthOffset;

    camera.position.set(0, 0.14, safeZ);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, bounds]);

  return null;
}

interface ArticulatedRigProps {
  exercise: ExerciseType;
  bounds: ProfileBounds;
  reducedMotion: boolean;
  interactive: boolean;
}

function ArticulatedRig({
  exercise,
  bounds,
  reducedMotion,
  interactive,
}: ArticulatedRigProps) {
  const profile = EXERCISE_RIG_PROFILES[exercise];
  const groupRef = React.useRef<THREE.Group>(null);
  const jointRefs = React.useRef<Array<THREE.Mesh | null>>([]);
  const boneRefs = React.useRef<Array<THREE.Mesh | null>>([]);

  // Reusable scratch vectors to eliminate per-frame garbage collection
  const scratchA = React.useMemo(() => new THREE.Vector3(), []);
  const scratchB = React.useMemo(() => new THREE.Vector3(), []);
  const scratchMid = React.useMemo(() => new THREE.Vector3(), []);
  const scratchDir = React.useMemo(() => new THREE.Vector3(), []);
  const scratchQuat = React.useMemo(() => new THREE.Quaternion(), []);

  const currentJoints = React.useRef<Vec3[]>(
    profile.start.map((p) => [p[0], p[1], p[2]])
  );

  // Recenter profile vertically around Y=0 so camera lookAt(0,0,0) frames identically
  const centerY = bounds.center[1];

  const outerRing = React.useMemo(
    () => createCirclePoints(profile.floorRadius, profile.floorY - centerY, 48),
    [profile.floorRadius, profile.floorY, centerY]
  );
  const innerRing = React.useMemo(
    () =>
      createCirclePoints(
        profile.floorRadius * 0.56,
        profile.floorY - centerY,
        36
      ),
    [profile.floorRadius, profile.floorY, centerY]
  );
  const axisX = React.useMemo<Vec3[]>(
    () => [
      [-profile.floorRadius, profile.floorY - centerY, 0],
      [profile.floorRadius, profile.floorY - centerY, 0],
    ],
    [profile.floorRadius, profile.floorY, centerY]
  );
  const axisZ = React.useMemo<Vec3[]>(
    () => [
      [0, profile.floorY - centerY, -profile.floorRadius],
      [0, profile.floorY - centerY, profile.floorRadius],
    ],
    [profile.floorRadius, profile.floorY, centerY]
  );

  const applyPose = React.useCallback(
    (alpha: number) => {
      const { start, peak } = profile;

      for (let i = 0; i < start.length; i++) {
        const s = start[i]!;
        const p = peak[i]!;
        const x = s[0] + (p[0] - s[0]) * alpha;
        const y = s[1] + (p[1] - s[1]) * alpha - centerY;
        const z = s[2] + (p[2] - s[2]) * alpha;

        const cur = currentJoints.current[i];
        if (cur) {
          cur[0] = x;
          cur[1] = y;
          cur[2] = z;
        }
        const jointMesh = jointRefs.current[i];
        if (jointMesh) {
          jointMesh.position.set(x, y, z);
        }
      }

      for (let b = 0; b < RIG_BONES.length; b++) {
        const [aIdx, bIdx] = RIG_BONES[b]!;
        const a = currentJoints.current[aIdx];
        const c = currentJoints.current[bIdx];
        const boneMesh = boneRefs.current[b];
        if (!a || !c || !boneMesh) continue;

        scratchA.set(a[0], a[1], a[2]);
        scratchB.set(c[0], c[1], c[2]);
        scratchDir.subVectors(scratchB, scratchA);
        const len = scratchDir.length();
        if (len < 0.0001) continue;

        scratchMid.addVectors(scratchA, scratchB).multiplyScalar(0.5);
        boneMesh.position.copy(scratchMid);
        boneMesh.scale.set(1, len, 1);
        scratchDir.divideScalar(len);
        scratchQuat.setFromUnitVectors(UP_AXIS, scratchDir);
        boneMesh.quaternion.copy(scratchQuat);
      }
    },
    [profile, centerY, scratchA, scratchB, scratchDir, scratchMid, scratchQuat]
  );

  React.useLayoutEffect(() => {
    applyPose(reducedMotion ? 0.52 : 0.0);
    if (groupRef.current) {
      groupRef.current.rotation.set(0, profile.baseYaw, 0);
      groupRef.current.position.set(0, 0, 0);
    }
  }, [applyPose, profile.baseYaw, reducedMotion]);

  useFrame((state) => {
    if (reducedMotion || !groupRef.current) return;
    const t = state.clock.getElapsedTime();
    const raw = (Math.sin(t * profile.speed - Math.PI / 2) + 1) * 0.5;
    const eased = raw * raw * (3 - 2 * raw);
    applyPose(eased);

    const pointerYaw = interactive ? state.pointer.x * 0.52 : 0;
    const pointerPitch = interactive ? -state.pointer.y * 0.22 : 0;
    const targetYaw = profile.baseYaw + Math.sin(t * 0.28) * 0.22 + pointerYaw;

    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetYaw,
      0.06
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      pointerPitch,
      0.06
    );
  });

  return (
    <group ref={groupRef}>
      {/* Calibrated stance floor reticle aligned cleanly under feet/hands */}
      <Line
        points={outerRing}
        color="#2B362E"
        lineWidth={1}
        transparent
        opacity={0.8}
      />
      <Line
        points={innerRing}
        color="#C6FF4D"
        lineWidth={1}
        transparent
        opacity={0.32}
      />
      <Line
        points={axisX}
        color="#222C25"
        lineWidth={1}
        transparent
        opacity={0.55}
      />
      <Line
        points={axisZ}
        color="#222C25"
        lineWidth={1}
        transparent
        opacity={0.55}
      />

      {/* Sculpted matte cylindrical bone limbs */}
      {RIG_BONES.map(([aIdx, bIdx], idx) => {
        const isPrimarySegment =
          profile.primaryJoints.has(aIdx) && profile.primaryJoints.has(bIdx);
        return (
          <mesh
            key={`bone-${idx}`}
            ref={(el) => {
              boneRefs.current[idx] = el;
            }}
          >
            <cylinderGeometry
              args={[
                isPrimarySegment ? 0.022 : 0.017,
                isPrimarySegment ? 0.022 : 0.017,
                1,
                10,
              ]}
            />
            <meshStandardMaterial
              color={isPrimarySegment ? "#9EAE9F" : "#6D7870"}
              roughness={0.55}
              metalness={0.12}
            />
          </mesh>
        );
      })}

      {/* Articulated joint nodes */}
      {profile.start.map((_, idx) => {
        const isHead = idx === 0;
        const isPrimary = profile.primaryJoints.has(idx);
        const radius = isHead ? 0.088 : isPrimary ? 0.052 : 0.036;
        return (
          <mesh
            key={`joint-${idx}`}
            ref={(el) => {
              jointRefs.current[idx] = el;
            }}
          >
            <sphereGeometry args={[radius, 18, 18]} />
            <meshStandardMaterial
              color={isPrimary ? "#C6FF4D" : "#ECEFE9"}
              emissive={isPrimary ? "#C6FF4D" : "#000000"}
              emissiveIntensity={isPrimary ? 0.18 : 0}
              roughness={0.38}
              metalness={0.14}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export interface PoseRigCanvasProps {
  exercise?: ExerciseType;
  interactive?: boolean;
  compact?: boolean;
  className?: string;
}

let cachedCanvasWebglSupport: boolean | null = null;

function noopCanvasSubscribe(): () => void {
  return () => {};
}

function detectCanvasWebGLSupport(): boolean {
  if (cachedCanvasWebglSupport !== null) return cachedCanvasWebglSupport;
  if (typeof document === "undefined") return false;
  try {
    const testCanvas = document.createElement("canvas");
    const gl =
      testCanvas.getContext("webgl2") || testCanvas.getContext("webgl");
    cachedCanvasWebglSupport = Boolean(gl);
  } catch {
    cachedCanvasWebglSupport = false;
  }
  return cachedCanvasWebglSupport;
}

export function PoseRigCanvas({
  exercise = "squats",
  interactive = true,
  className,
}: PoseRigCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const webglReady = React.useSyncExternalStore(
    noopCanvasSubscribe,
    detectCanvasWebGLSupport,
    () => false
  );
  const [inView, setInView] = React.useState(true);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setInView(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const profile = EXERCISE_RIG_PROFILES[exercise];
  const bounds = React.useMemo(() => computeProfileBounds(profile), [profile]);

  if (!webglReady || reducedMotion) {
    return (
      <div ref={containerRef} className={cn("h-full w-full", className)}>
        <StaticPoseWireframe exercise={exercise} />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full", className)}
      role="img"
      aria-label={profile.ariaDescription}
    >
      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "low-power", alpha: true }}
        camera={{ position: [0, 0.14, 5.2], fov: 36, near: 0.1, far: 40 }}
        frameloop={inView ? "always" : "demand"}
      >
        <AutoFitCamera bounds={bounds} />
        <ambientLight intensity={0.85} />
        <directionalLight
          position={[3, 4.5, 5]}
          intensity={1.1}
          color="#F5F7F2"
        />
        <directionalLight
          position={[-3, 1.5, -2]}
          intensity={0.35}
          color="#C6FF4D"
        />
        <ArticulatedRig
          exercise={exercise}
          bounds={bounds}
          reducedMotion={reducedMotion}
          interactive={interactive}
        />
      </Canvas>
    </div>
  );
}
