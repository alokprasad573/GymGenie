"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[8px] text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-45 active:scale-[0.985] cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-canvas hover:bg-accent-hover border border-transparent",
        secondary:
          "bg-elevated text-ink-primary border border-[rgba(255,255,255,0.1)] hover:bg-subtle hover:border-[rgba(255,255,255,0.16)]",
        outline:
          "bg-transparent text-ink-primary border border-[rgba(255,255,255,0.12)] hover:bg-surface hover:border-[rgba(255,255,255,0.2)]",
        ghost:
          "bg-transparent text-ink-secondary hover:text-ink-primary hover:bg-surface border border-transparent",
        destructive:
          "bg-[#2B1517] text-[#FCA5A5] border border-[#F06A6A]/30 hover:bg-[#3A1C1F]",
      },
      size: {
        sm: "h-9 px-3 text-xs sm:h-8",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-sm",
        icon: "h-10 w-10 p-0 sm:h-9 sm:w-9",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        suppressHydrationWarning
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
