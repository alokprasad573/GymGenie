import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[12px] border border-[rgba(255,255,255,0.05)] bg-elevated/80 animate-pulse",
        className
      )}
      aria-hidden="true"
      {...props}
    />
  );
}
