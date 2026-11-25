"use client";

import * as React from "react";

/**
 * GSAP-driven cursor illumination controller for `.bg-bento-graph`.
 * Smoothly interpolates `--cursor-x`, `--cursor-y`, and `--cursor-active`
 * via `gsap.quickTo` with zero React re-renders and lazy GSAP loading.
 */
export function BentoCursorLight() {
  React.useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const finePointer = window.matchMedia("(hover: hover)").matches;
    if (reducedMotion || !finePointer) {
      return;
    }

    let disposed = false;
    let cleanupListeners: (() => void) | null = null;

    void import("gsap").then(({ default: gsap }) => {
      if (disposed) return;

      const root = document.documentElement;
      const state = {
        x: window.innerWidth * 0.5,
        y: window.innerHeight * 0.35,
        active: 0,
      };
      let hasEntered = false;

      const syncCssVars = () => {
        root.style.setProperty("--cursor-x", `${state.x.toFixed(1)}px`);
        root.style.setProperty("--cursor-y", `${state.y.toFixed(1)}px`);
        root.style.setProperty("--cursor-active", state.active.toFixed(3));
      };

      const moveX = gsap.quickTo(state, "x", {
        duration: 0.42,
        ease: "power3.out",
        onUpdate: syncCssVars,
      });
      const moveY = gsap.quickTo(state, "y", {
        duration: 0.42,
        ease: "power3.out",
        onUpdate: syncCssVars,
      });
      const fadeActive = gsap.quickTo(state, "active", {
        duration: 0.32,
        ease: "power2.out",
        onUpdate: syncCssVars,
      });

      const handlePointerMove = (event: PointerEvent) => {
        if (event.pointerType === "touch") return;

        if (!hasEntered) {
          hasEntered = true;
          state.x = event.clientX;
          state.y = event.clientY;
          syncCssVars();
        }

        moveX(event.clientX);
        moveY(event.clientY);
        fadeActive(1);
      };

      const handlePointerLeave = () => {
        hasEntered = false;
        fadeActive(0);
      };

      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      document.addEventListener("pointerleave", handlePointerLeave, {
        passive: true,
      });
      window.addEventListener("blur", handlePointerLeave);

      cleanupListeners = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerleave", handlePointerLeave);
        window.removeEventListener("blur", handlePointerLeave);
        gsap.killTweensOf(state);
        root.style.removeProperty("--cursor-x");
        root.style.removeProperty("--cursor-y");
        root.style.removeProperty("--cursor-active");
      };
    });

    return () => {
      disposed = true;
      cleanupListeners?.();
    };
  }, []);

  return null;
}

