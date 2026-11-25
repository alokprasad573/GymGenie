import * as React from "react";
import { AlertCircle, CheckCircle2, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatePanelProps {
  variant?: "empty" | "error" | "success";
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function StatePanel({
  variant = "empty",
  title,
  description,
  action,
  className,
}: StatePanelProps) {
  const Icon =
    variant === "error"
      ? AlertCircle
      : variant === "success"
        ? CheckCircle2
        : Inbox;

  const iconTone =
    variant === "error"
      ? "text-status-danger"
      : variant === "success"
        ? "text-status-success"
        : "text-ink-muted";

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "bento-cell flex flex-col items-start gap-3 p-6",
        variant === "error" && "border-status-danger/30",
        variant === "success" && "border-status-success/30",
        className
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.09)] bg-canvas">
        <Icon className={cn("h-4 w-4", iconTone)} strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-ink-primary">{title}</h3>
        <p className="max-w-md text-sm leading-6 text-ink-secondary">
          {description}
        </p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
