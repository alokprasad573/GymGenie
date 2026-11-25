import * as React from "react";
import { cn } from "@/lib/utils";

interface BrandMarkProps {
  className?: string;
  showWordmark?: boolean;
}

export function BrandMark({
  className,
  showWordmark = true,
}: BrandMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width="40"
        height="40"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect
          x="2"
          y="2"
          width="20"
          height="20"
          rx="5"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="1.5"
          fill="#111613"
        />
        <path
          d="M7 15.5L10.5 9.5L13.5 13L17 8"
          stroke="#C6FF4D"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="10.5" cy="9.5" r="1.5" fill="#F5F7F2" />
        <circle cx="17" cy="8" r="1.5" fill="#C6FF4D" />
      </svg>
      {showWordmark ? (
        <span className="text-md font-medium text-ink-primary leading-none">
          GymGenie
        </span>
      ) : null}
    </span>
  );
}