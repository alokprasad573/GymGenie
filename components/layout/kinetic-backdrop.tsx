import * as React from "react";

/**
 * Static neutral 3D perspective calibration floor rendered exclusively on
 * marketing and auth screens. Uses pure CSS transforms with zero color washes
 * or infinite animation loops so foreground typography and controls stay clear.
 */
export function KineticBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      <div className="gg-perspective-stage absolute inset-x-0 bottom-0 h-[52vh]">
        <div className="gg-perspective-grid" />
      </div>
      <div className="gg-backdrop-vignette absolute inset-0" />
    </div>
  );
}
