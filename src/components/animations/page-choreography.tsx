"use client";

import * as React from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useReducedMotion } from "@/components/animations/use-reduced-motion";

interface PageChoreographyProps {
  children: React.ReactNode;
  /** Optional dependency key to re-run reveal after async data resolves */
  revealKey?: string | number;
  className?: string;
}

/**
 * Lightweight, lifecycle-scoped GSAP choreography wrapper for interior app screens.
 * Animates `[data-page-header]`, `[data-stagger-item]`, and `[data-scroll-reveal]`
 * elements while honoring `prefers-reduced-motion` and cleaning up on unmount.
 */
export function PageChoreography({
  children,
  revealKey,
  className,
}: PageChoreographyProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  React.useLayoutEffect(() => {
    if (
      reducedMotion ||
      !rootRef.current ||
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      const headers = gsap.utils.toArray<HTMLElement>("[data-page-header]");
      const staggerItems = gsap.utils.toArray<HTMLElement>("[data-stagger-item]");
      const scrollEls = gsap.utils.toArray<HTMLElement>("[data-scroll-reveal]");

      const tl = gsap.timeline({
        defaults: { ease: "power2.out", clearProps: "transform,opacity" },
      });

      if (headers.length > 0) {
        tl.from(headers, {
          y: 10,
          opacity: 0,
          duration: 0.36,
          stagger: 0.04,
        });
      }

      if (staggerItems.length > 0) {
        tl.from(
          staggerItems,
          {
            y: 12,
            opacity: 0,
            duration: 0.38,
            stagger: 0.045,
          },
          headers.length > 0 ? "-=0.22" : 0
        );
      }

      scrollEls.forEach((el) => {
        gsap.from(el, {
          y: 14,
          opacity: 0,
          duration: 0.42,
          ease: "power2.out",
          clearProps: "transform,opacity",
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
            once: true,
          },
        });
      });
    }, rootRef);

    return () => {
      ctx.revert();
    };
  }, [reducedMotion, revealKey]);

  return (
    <div ref={rootRef} className={className}>
      {children}
    </div>
  );
}
