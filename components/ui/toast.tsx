"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "default" | "success" | "error";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

interface ToastContextValue {
  pushToast: (toast: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    return {
      pushToast: () => {},
      dismissToast: () => {},
    };
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const prefersReducedMotion = useReducedMotion();

  const dismissToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = React.useCallback(
    (toast: Omit<ToastItem, "id">) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, 4500);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ pushToast, dismissToast }}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
              transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
              className={cn(
                "pointer-events-auto flex items-start justify-between gap-3 rounded-[10px] border bg-elevated px-4 py-3 text-sm text-ink-primary",
                toast.variant === "error" && "border-status-danger/35",
                toast.variant === "success" && "border-accent/35",
                (!toast.variant || toast.variant === "default") &&
                  "border-[rgba(255,255,255,0.12)]"
              )}
            >
              <div className="space-y-0.5">
                <p className="font-medium text-ink-primary">{toast.title}</p>
                {toast.description ? (
                  <p className="text-xs text-ink-secondary">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                suppressHydrationWarning
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="rounded-[6px] p-1 text-ink-muted transition-colors hover:bg-subtle hover:text-ink-primary"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
