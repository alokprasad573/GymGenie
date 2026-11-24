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

  // Subtle metric readout transition when switching previewed exercise
  React.useEffect(() => {
    if (reducedMotion || !metricsRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        "[data-hero-metric-val]",
        { opacity: 0.45, y: 3 },
        {
          opacity: 1,
          y: 0,
          duration: 0.24,
          stagger: 0.03,
          ease: "power2.out",
          clearProps: "transform,opacity",
        }
      );
    }, metricsRef);
    return () => ctx.revert();
  }, [activeExercise, reducedMotion]);

  return (
    <div className="gg-stage-frame relative flex flex-col justify-between overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.08)] bg-surface p-5">
      {/* Top telemetry bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(255,255,255,0.06)] pb-3">
        <div className="flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 rounded-full bg-accent"
            aria-hidden="true"
          />
          <span className="text-xs font-medium text-ink-secondary">
            MediaPipe Pose Landmarker · 33 landmarks
          </span>
        </div>
      </div>

      {/* Interactive 5-exercise selector pills */}
      <div
        role="tablist"
        aria-label="Preview biomechanics rig by exercise"
        className="gg-no-scrollbar mt-3 flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 sm:flex-wrap sm:overflow-visible sm:pb-0"
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
                "min-h-9 shrink-0 cursor-pointer whitespace-nowrap rounded-[6px] border px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                isSelected
                  ? "border-accent/45 bg-elevated text-accent shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "border-[rgba(255,255,255,0.08)] bg-canvas text-ink-secondary hover:border-[rgba(255,255,255,0.16)] hover:text-ink-primary"
              )}
            >
              {item.shortLabel}
            </button>
          );
        })}
      </div>

      {/* 3D Biomechanics Stage (10% more compact, zero overlaid clipping) */}
      <div className="my-3 h-[230px] w-full sm:h-[288px]">
        <ExerciseRigPreview exercise={activeExercise} interactive />
      </div>

      {/* Active movement metadata line */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-secondary">
        <span className="font-medium text-ink-primary">{def.label}</span>
        <span className="text-ink-muted">{def.muscleGroup}</span>
      </div>

      {/* Calibrated Threshold Readout */}
      <div
        ref={metricsRef}
        className="grid grid-cols-2 gap-2 border-t border-[rgba(255,255,255,0.06)] pt-4 sm:grid-cols-3"
      >
        <div className="rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-canvas px-3 py-2.5">
          <span className="block text-xs text-ink-muted">Angle thresholds</span>
          <span
            data-hero-metric-val
            className="mt-1 block text-sm font-medium text-accent tabular-nums"
          >
            &lt; {def.thresholds.primaryTrigger}° / {def.thresholds.returnTrigger}°
          </span>
        </div>
        <div className="rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-canvas px-3 py-2.5">
          <span className="block text-xs text-ink-muted">Visibility gate</span>
          <span
            data-hero-metric-val
            className="mt-1 block text-sm font-medium text-ink-primary tabular-nums"
          >
            {def.thresholds.minVisibility.toFixed(2)} min
          </span>
        </div>
        <div className="col-span-2 rounded-[8px] border border-[rgba(255,255,255,0.06)] bg-canvas px-3 py-2.5 sm:col-span-1">
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

export function LandingChoreography({
  children,
}: {
  children: React.ReactNode;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  React.useLayoutEffect(() => {
    if (
      reducedMotion ||
      !containerRef.current ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const heroTl = gsap.timeline({
        defaults: { ease: "power3.out", clearProps: "transform,opacity" },
      });

      heroTl
        .from("[data-hero-reveal]", {
          y: 14,
          opacity: 0,
          duration: 0.5,
          stagger: 0.065,
        })
        .from(
          "[data-hero-visual]",
          {
            y: 18,
            scale: 0.985,
            opacity: 0,
            duration: 0.58,
          },
          "-=0.36"
        );

      gsap.utils.toArray<HTMLElement>("[data-scroll-section]").forEach((section) => {
        const heading = section.querySelector("[data-section-header]");
        const cards = section.querySelectorAll("[data-stagger-card]");

        const tl = gsap.timeline({
          defaults: { ease: "power2.out", clearProps: "transform,opacity" },
          scrollTrigger: {
            trigger: section,
            start: "top 84%",
            once: true,
          },
        });

        if (heading) {
          tl.from(heading, { y: 12, opacity: 0, duration: 0.4 });
        }

        if (cards.length > 0) {
          tl.from(
            cards,
            {
              y: 16,
              opacity: 0,
              duration: 0.42,
              stagger: 0.055,
            },
            heading ? "-=0.22" : 0
          );
        } else {
          tl.from(section, { y: 14, opacity: 0, duration: 0.42 });
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return <div ref={containerRef}>{children}</div>;
}
