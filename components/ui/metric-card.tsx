import * as React from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  context?: string;
  accent?: boolean;
  indexLabel?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  context,
  accent = false,
  indexLabel,
  className,
  ...props
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "bento-cell flex flex-col justify-between gap-4 p-5 transition-[border-color] duration-150 hover:border-[rgba(255,255,255,0.14)]",
        accent && "border-accent/25",
        className
      )}
      {...props}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-ink-secondary">{label}</span>
        {indexLabel ? (
          <span className=" text-[11px] text-ink-muted tabular-nums">
            {indexLabel}
          </span>
        ) : null}
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            "text-2xl font-medium leading-none tracking-[-0.025em] tabular-nums sm:text-[32px]",
            accent ? "text-accent" : "text-ink-primary"
          )}
        >
          {value}
        </span>
      </div>
      {context ? (
        <span className="border-t border-[rgba(255,255,255,0.06)] pt-3  text-xs text-ink-muted">
          {context}
        </span>
      ) : null}
    </div>
  );
}
