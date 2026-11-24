import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import * as THREE from "three";
import { EXERCISE_ORDER } from "@/config/exercises";
import {
  computeProfileBounds,
  EXERCISE_RIG_PROFILES,
  RIG_OVERALL_SCALE,
  StaticPoseWireframe,
} from "@/components/three/pose-rig-data";

describe("ExerciseRigPreview 3D & SVG Zero-Clipping Bounds", () => {
  it("applies a 10% overall scale reduction (0.9)", () => {
    expect(RIG_OVERALL_SCALE).toBe(0.9);
  });

  it("keeps every joint and floor ring strictly inside the perspective camera frustum across all 5 exercises and aspect ratios", () => {
    const viewports: Array<[number, number]> = [
      [320, 252], // mobile hero
      [580, 288], // desktop hero
      [360, 176], // compact workout setup card
      [260, 260], // square viewport
    ];

    for (const ex of EXERCISE_ORDER) {
      const profile = EXERCISE_RIG_PROFILES[ex];
      const bounds = computeProfileBounds(profile);
      const centerY = bounds.center[1];

      for (const [w, h] of viewports) {
        const aspect = w / h;
        const fov = 36;
        const vFovRad = THREE.MathUtils.degToRad(fov);
        const hFovRad = 2 * Math.atan(Math.tan(vFovRad / 2) * aspect);

        const margin = 1.16 / RIG_OVERALL_SCALE;
        const distV = (bounds.halfSize[1] * margin) / Math.tan(vFovRad / 2);
        const distH = (bounds.halfSize[0] * margin) / Math.tan(hFovRad / 2);
        const safeZ = Math.max(distV, distH) + bounds.maxRadiusXZ;

        const camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 40);
        camera.position.set(0, 0.14, safeZ);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld();
        camera.updateProjectionMatrix();

        // Check every joint in both start and peak across worst-case yaw rotations
        for (const yawOffset of [-0.3, 0, 0.3]) {
          const yaw = profile.baseYaw + yawOffset;
          const rotY = new THREE.Matrix4().makeRotationY(yaw);

          for (const frame of [profile.start, profile.peak]) {
            for (const [x, y, z] of frame) {
              const pt = new THREE.Vector3(x, y - centerY, z)
                .applyMatrix4(rotY)
                .project(camera);
              expect(
                Math.abs(pt.x),
                `${ex} ${w}x${h} X inside NDC`
              ).toBeLessThan(0.92);
              expect(
                Math.abs(pt.y),
                `${ex} ${w}x${h} Y inside NDC`
              ).toBeLessThan(0.92);
            }
          }

          // Also verify floor ring perimeter points stay strictly inside NDC
          for (let a = 0; a < 8; a++) {
            const theta = (a / 8) * Math.PI * 2;
            const pt = new THREE.Vector3(
              Math.cos(theta) * profile.floorRadius,
              profile.floorY - centerY,
              Math.sin(theta) * profile.floorRadius
            )
              .applyMatrix4(rotY)
              .project(camera);
            expect(
              Math.abs(pt.x),
              `${ex} floor X inside NDC`
            ).toBeLessThan(0.95);
            expect(
              Math.abs(pt.y),
              `${ex} floor Y inside NDC`
            ).toBeLessThan(0.95);
          }
        }
      }
    }
  });

  it("renders StaticPoseWireframe SVG with every joint and floor ellipse safely inside the 260x260 viewBox", () => {
    for (const ex of EXERCISE_ORDER) {
      const { container } = render(<StaticPoseWireframe exercise={ex} />);
      const circles = container.querySelectorAll("circle");
      expect(circles.length).toBe(15);

      circles.forEach((c) => {
        const cx = Number(c.getAttribute("cx"));
        const cy = Number(c.getAttribute("cy"));
        const r = Number(c.getAttribute("r"));
        expect(cx - r).toBeGreaterThan(10);
        expect(cx + r).toBeLessThan(250);
        expect(cy - r).toBeGreaterThan(10);
        expect(cy + r).toBeLessThan(250);
      });

      const ellipses = container.querySelectorAll("ellipse");
      expect(ellipses.length).toBe(2);
      const outer = ellipses[0]!;
      const ecx = Number(outer.getAttribute("cx"));
      const ecy = Number(outer.getAttribute("cy"));
      const erx = Number(outer.getAttribute("rx"));
      const ery = Number(outer.getAttribute("ry"));
      expect(ecx - erx).toBeGreaterThan(8);
      expect(ecx + erx).toBeLessThan(252);
      expect(ecy - ery).toBeGreaterThan(8);
      expect(ecy + ery).toBeLessThan(252);
    }
  });
});
