"use client";

import * as React from "react";
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
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "bento-toast-enter pointer-events-auto flex items-start justify-between gap-3 rounded-[12px] border bg-elevated px-4 py-3 text-sm text-ink-primary shadow-[0_12px_32px_rgba(0,0,0,0.45)]",
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
              className="cursor-pointer rounded-[6px] p-1 text-ink-muted transition-colors hover:bg-subtle hover:text-ink-primary"
            >
              <X className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
