import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        suppressHydrationWarning
        className={cn(
          "flex h-10 w-full rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-canvas px-3 text-sm text-ink-primary placeholder:text-ink-muted transition-[border-color,background-color] duration-150 hover:border-[rgba(255,255,255,0.18)] focus:border-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";
