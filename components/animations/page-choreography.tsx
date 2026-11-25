"use client";

import * as React from "react";
import gsap from "gsap";
import { useReducedMotion } from "@/components/animations/use-reduced-motion";
import { cn } from "@/lib/utils";

interface PageChoreographyProps {
  children: React.ReactNode;
  /** Optional dependency key to re-run reveal after async state updates */
  revealKey?: string | number;
  className?: string;
}

/**
 * GSAP-powered Bento choreography wrapper for interior screens.
 * Staggers direct Bento sections/cells with `power3.out` and clears inline
 * transforms on completion so fixed coordinate grids stay pixel-aligned.
 */
export function PageChoreography({
  children,
  revealKey,
  className,
}: PageChoreographyProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  React.useLayoutEffect(() => {
    const el = rootRef.current;
    if (
      reducedMotion ||
      !el ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const ctx = gsap.context(() => {
      const targets = el.querySelectorAll<HTMLElement>(":scope > *");
      if (targets.length === 0) return;

      gsap.from(targets, {
        y: 12,
        opacity: 0,
        duration: 0.42,
        stagger: 0.055,
        ease: "power3.out",
        clearProps: "transform,opacity",
      });
    }, el);

    return () => ctx.revert();
  }, [reducedMotion, revealKey]);

  return (
    <div ref={rootRef} className={cn(className)}>
      {children}
    </div>
  );
}
