import * as React from "react";
import { cn } from "@/lib/utils";

interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  context?: string;
  accent?: boolean;
  className?: string;
}

export function MetricCard({
  label,
  value,
  context,
  accent = false,
  className,
  ...props
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col justify-between gap-3 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-surface p-5",
        className
      )}
      {...props}
    >
      <span className="text-sm text-ink-secondary">{label}</span>
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={cn(
            "text-2xl font-medium leading-none tracking-[-0.02em] tabular-nums sm:text-[28px]",
            accent ? "text-accent" : "text-ink-primary"
          )}
        >
          {value}
        </span>
      </div>
      {context ? (
        <span className="text-xs text-ink-muted">{context}</span>
      ) : null}
    </div>
  );
}
