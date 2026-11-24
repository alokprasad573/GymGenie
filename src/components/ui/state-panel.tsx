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
        "flex flex-col items-start gap-3 rounded-[14px] border border-[rgba(255,255,255,0.08)] bg-surface p-6",
        variant === "error" && "border-status-danger/25",
        variant === "success" && "border-status-success/25",
        className
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-elevated">
        <Icon className={cn("h-4 w-4", iconTone)} strokeWidth={1.5} />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-ink-primary">{title}</h3>
        <p className="max-w-md text-sm text-ink-secondary">{description}</p>
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
