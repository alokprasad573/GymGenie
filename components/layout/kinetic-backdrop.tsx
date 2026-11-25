import * as React from "react";

/**
 * Architectural BentoGraph drafting grid backdrop for marketing and auth screens.
 * Uses CSS coordinate layers illuminated smoothly via GSAP around cursor movement.
 */
export function KineticBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="bg-bento-graph pointer-events-none fixed inset-0 z-0 overflow-hidden select-none"
    >
      <div className="gg-backdrop-vignette absolute inset-0" />
    </div>
  );
}
