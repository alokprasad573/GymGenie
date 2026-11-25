"use client";

import * as React from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EXERCISE_ORDER, EXERCISES } from "@/config/exercises";
import { ExerciseRigPreview } from "@/components/three/exercise-rig-preview";
import { useReducedMotion } from "@/components/animations/use-reduced-motion";
import { cn } from "@/lib/utils";
import type { ExerciseType } from "@/types/exercise";

export function HeroPoseVisual() {
  const [activeExercise, setActiveExercise] =
    React.useState<ExerciseType>("squats");
  const metricsRef = React.useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const def = EXERCISES[activeExercise];

  React.useEffect(() => {
    if (
      reducedMotion ||
      !metricsRef.current ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-hero-metric-val]",
        { opacity: 0.35, y: 4 },
        {
          opacity: 1,
          y: 0,
          duration: 0.26,
          stagger: 0.04,
          ease: "power2.out",
          clearProps: "transform,opacity",
        }
      );
    }, metricsRef);
    return () => ctx.revert();
  }, [activeExercise, reducedMotion]);

  return (
    <div className="bento-cell flex h-full flex-col justify-between overflow-hidden p-5">
      {/* Top coordinate header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(255,255,255,0.07)] pb-3.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full bg-accent"
            aria-hidden="true"
          />
          <span className="text-xs font-medium text-ink-primary">
            MediaPipe Pose Landmarker
          </span>
        </div>
      </div>

      {/* Interactive 5-exercise selector rail */}
      <div
        role="tablist"
        aria-label="Preview biomechanics rig by exercise"
        className="gg-no-scrollbar mt-3.5 flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible sm:pb-0"
      >
        {EXERCISE_ORDER.map((id, idx) => {
          const item = EXERCISES[id];
          const isSelected = activeExercise === id;
          return (
            <button
              key={id}
              type="button"
              suppressHydrationWarning
              role="tab"
              aria-selected={isSelected}
              onClick={() => setActiveExercise(id)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") {
                  e.preventDefault();
                  const next = EXERCISE_ORDER[(idx + 1) % EXERCISE_ORDER.length];
                  if (next) setActiveExercise(next);
                } else if (e.key === "ArrowLeft") {
                  e.preventDefault();
                  const prev =
                    EXERCISE_ORDER[
                      (idx - 1 + EXERCISE_ORDER.length) % EXERCISE_ORDER.length
                    ];
                  if (prev) setActiveExercise(prev);
                }
              }}
              className={cn(
                "min-h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-[8px] border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                isSelected
                  ? "border-accent/40 bg-elevated text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "border-[rgba(255,255,255,0.07)] bg-canvas text-ink-secondary hover:border-[rgba(255,255,255,0.16)] hover:text-ink-primary"
              )}
            >
              {item.shortLabel}
            </button>
          );
        })}
      </div>

      {/* 3D Biomechanics Graph Stage */}
      <div className="bento-well relative my-3.5 h-[240px] w-full overflow-hidden sm:h-[296px]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-2.5 z-10 text-[11px] text-ink-muted"
        >
          {def.label}
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-2.5 z-10 text-[11px] text-ink-muted"
        >
          {def.muscleGroup}
        </div>
        <ExerciseRigPreview
          exercise={activeExercise}
          interactive
          className="bg-transparent"
        />
      </div>

      {/* Calibrated Threshold Sub-Bento Strip */}
      <div ref={metricsRef} className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <div className="bento-well px-3.5 py-2.5">
          <span className="block text-xs text-ink-muted">Angle window</span>
          <span
            data-hero-metric-val
            className="mt-1 block text-sm font-medium text-accent tabular-nums"
          >
            &lt; {def.thresholds.primaryTrigger}° / {def.thresholds.returnTrigger}°
          </span>
        </div>
        <div className="bento-well px-3.5 py-2.5">
          <span className="block text-xs text-ink-muted">Visibility gate</span>
          <span
            data-hero-metric-val
            className="mt-1 block text-sm font-medium text-ink-primary tabular-nums"
          >
            {def.thresholds.minVisibility.toFixed(2)} min
          </span>
        </div>
        <div className="bento-well col-span-2 px-3.5 py-2.5 sm:col-span-1">
          <span className="block text-xs text-ink-muted">Tracked cues</span>
          <span
            data-hero-metric-val
            className="mt-1 block text-sm font-medium text-ink-primary tabular-nums"
          >
            {def.metricDefinitions.length} live metrics
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * GSAP landing choreography with ScrollTrigger reveals for Bento sections.
 * Clears inline transform/opacity after each reveal so fixed grid overlays
 * stay aligned to viewport pointer coordinates.
 */
export function LandingChoreography({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  React.useLayoutEffect(() => {
    const root = containerRef.current;
    if (
      reducedMotion ||
      !root ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const sections = gsap.utils.toArray<HTMLElement>("section");
      const heroSection = sections[0];
      if (heroSection) {
        const heroCells = heroSection.querySelectorAll<HTMLElement>(".bento-cell");
        if (heroCells.length > 0) {
          gsap.from(heroCells, {
            y: 14,
            opacity: 0,
            duration: 0.48,
            stagger: 0.06,
            ease: "power3.out",
            clearProps: "transform,opacity",
          });
        }
      }

      sections.slice(1).forEach((section) => {
        const cells = section.querySelectorAll<HTMLElement>(".bento-cell");
        if (cells.length === 0) return;

        gsap.from(cells, {
          y: 16,
          opacity: 0,
          duration: 0.44,
          stagger: 0.055,
          ease: "power2.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: section,
            start: "top 86%",
            once: true,
          },
        });
      });
    }, root);

    return () => ctx.revert();
  }, [reducedMotion]);

  return <div ref={containerRef}>{children}</div>;
}
