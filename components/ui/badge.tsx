import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-[6px] border px-2 py-0.5 text-xs font-medium leading-4",
  {
    variants: {
      variant: {
        neutral:
          "border-[rgba(255,255,255,0.09)] bg-elevated text-ink-secondary",
        accent: "border-accent/25 bg-[rgba(198,255,77,0.1)] text-accent",
        success: "border-[#4ADE80]/25 bg-[#4ADE80]/10 text-[#4ADE80]",
        warning: "border-[#F5B942]/25 bg-[#F5B942]/10 text-[#F5B942]",
        danger: "border-[#F06A6A]/30 bg-[#F06A6A]/10 text-[#FCA5A5]",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  liveDot?: boolean;
}

export function Badge({
  className,
  variant,
  liveDot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {liveDot ? <span className="live-indicator-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}
