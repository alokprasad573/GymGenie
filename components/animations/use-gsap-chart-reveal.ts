"use client";

import * as React from "react";
import gsap from "gsap";
import { useReducedMotion } from "@/components/animations/use-reduced-motion";

export type GsapChartKind = "bar" | "donut" | "area" | "line";

/**
 * GSAP animation hook for Recharts visualizations.
 * Waits for ResponsiveContainer to mount SVG primitives via MutationObserver,
 * then runs GPU-composited GSAP reveals with automatic cleanup and
 * `prefers-reduced-motion` support.
 */
export function useGsapChartReveal(
  kind: GsapChartKind,
  revealKey?: string | number
) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  React.useEffect(() => {
    const el = containerRef.current;
    if (
      reducedMotion ||
      !el ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    let animated = false;
    let observer: MutationObserver | null = null;
    let fallbackTimer = 0;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.42,
          ease: "power3.out",
          clearProps: "transform,opacity",
        }
      );
    }, el);

    const runSvgAnimation = () => {
      if (animated) return false;

      if (kind === "bar") {
        const bars = el.querySelectorAll<SVGElement>(
          ".recharts-bar-rectangle path"
        );
        if (bars.length === 0) return false;
        animated = true;
        ctx.add(() => {
          gsap.fromTo(
            bars,
            { scaleY: 0, opacity: 0.35, transformOrigin: "50% 100%" },
            {
              scaleY: 1,
              opacity: 1,
              duration: 0.56,
              stagger: { each: 0.025, from: "start" },
              ease: "power3.out",
              clearProps: "transform,opacity",
            }
          );
        });
        return true;
      }

      if (kind === "donut") {
        const sectors = el.querySelectorAll<SVGElement>(".recharts-pie-sector");
        if (sectors.length === 0) return false;
        animated = true;
        ctx.add(() => {
          gsap.fromTo(
            sectors,
            {
              scale: 0.86,
              opacity: 0,
              rotation: -14,
              svgOrigin: "50% 50%",
              transformOrigin: "50% 50%",
            },
            {
              scale: 1,
              opacity: 1,
              rotation: 0,
              duration: 0.62,
              stagger: 0.06,
              ease: "power3.out",
              clearProps: "transform,opacity",
            }
          );
        });
        return true;
      }

      if (kind === "area") {
        const curve = el.querySelector<SVGPathElement>(".recharts-area-curve");
        const fillArea = el.querySelector<SVGPathElement>(".recharts-area-area");
        if (!curve) return false;
        animated = true;
        ctx.add(() => {
          const length =
            typeof curve.getTotalLength === "function"
              ? curve.getTotalLength()
              : 0;
          if (length > 0) {
            gsap.fromTo(
              curve,
              { strokeDasharray: length, strokeDashoffset: length },
              {
                strokeDashoffset: 0,
                duration: 0.78,
                ease: "power2.out",
                clearProps: "strokeDasharray,strokeDashoffset",
              }
            );
          }
          if (fillArea) {
            gsap.fromTo(
              fillArea,
              { opacity: 0 },
              {
                opacity: 1,
                duration: 0.65,
                delay: 0.12,
                ease: "power2.out",
                clearProps: "opacity",
              }
            );
          }
        });
        return true;
      }

      if (kind === "line") {
        const curve = el.querySelector<SVGPathElement>(".recharts-line-curve");
        const dots = el.querySelectorAll<SVGElement>(".recharts-line-dot");
        if (!curve) return false;
        animated = true;
        ctx.add(() => {
          const length =
            typeof curve.getTotalLength === "function"
              ? curve.getTotalLength()
              : 0;
          if (length > 0) {
            gsap.fromTo(
              curve,
              { strokeDasharray: length, strokeDashoffset: length },
              {
                strokeDashoffset: 0,
                duration: 0.78,
                ease: "power2.out",
                clearProps: "strokeDasharray,strokeDashoffset",
              }
            );
          }
          if (dots.length > 0) {
            gsap.fromTo(
              dots,
              { scale: 0, opacity: 0, transformOrigin: "50% 50%" },
              {
                scale: 1,
                opacity: 1,
                duration: 0.32,
                delay: 0.25,
                stagger: 0.035,
                ease: "back.out(1.6)",
                clearProps: "transform,opacity",
              }
            );
          }
        });
        return true;
      }

      return false;
    };

    if (!runSvgAnimation() && typeof MutationObserver !== "undefined") {
      observer = new MutationObserver(() => {
        if (runSvgAnimation()) {
          observer?.disconnect();
          observer = null;
        }
      });
      observer.observe(el, { childList: true, subtree: true });
      fallbackTimer = window.setTimeout(() => {
        observer?.disconnect();
        observer = null;
      }, 900);
    }

    return () => {
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      observer?.disconnect();
      ctx.revert();
    };
  }, [kind, revealKey, reducedMotion]);

  return containerRef;
}
