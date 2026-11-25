import * as React from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  graphGrid?: boolean;
}

export function Card({
  className,
  elevated = false,
  graphGrid: _graphGrid = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[16px] border shadow-[inset_0_1px_0_rgba(255,255,255,0.055)]",
        elevated
          ? "border-[rgba(255,255,255,0.11)] bg-elevated"
          : "border-[rgba(255,255,255,0.08)] bg-surface",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1 p-5 pb-3", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-base font-medium tracking-[-0.015em] text-ink-primary",
        className
      )}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm leading-5 text-ink-secondary", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pt-2", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-t border-[rgba(255,255,255,0.07)] px-5 py-3.5",
        className
      )}
      {...props}
    />
  );
}
