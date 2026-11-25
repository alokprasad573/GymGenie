"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  ChevronDown,
  Clock,
  Dumbbell,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export interface ShellUser {
  id: string;
  username: string;
  displayUsername: string;
  email: string;
  name?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  matchPrefix?: boolean;
}

export const APP_NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    matchPrefix: false,
  },
  {
    href: "/workout/setup",
    label: "Start workout",
    icon: Dumbbell,
    matchPrefix: false,
  },
  {
    href: "/workout/session",
    label: "Live session",
    icon: Activity,
    matchPrefix: false,
  },
  {
    href: "/history",
    label: "History",
    icon: Clock,
    matchPrefix: true,
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: BarChart3,
    matchPrefix: true,
  },
];

interface AppShellProps {
  user: ShellUser;
  children: React.ReactNode;
}

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { pushToast } = useToast();
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const tabRefs = React.useRef<Array<HTMLAnchorElement | null>>([]);
  const menuButtonRef = React.useRef<HTMLButtonElement | null>(null);

  const isActive = React.useCallback(
    (item: NavItem) => {
      if (item.matchPrefix) {
        return pathname === item.href || pathname.startsWith(`${item.href}/`);
      }
      return pathname === item.href;
    },
    [pathname]
  );

  const isProfileActive =
    pathname === "/profile" || pathname.startsWith("/profile/");

  // Close mobile/tablet drawer on Escape key
  React.useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setMobileMenuOpen(false);
      router.push("/login");
      router.refresh();
    } catch {
      pushToast({
        title: "Sign out failed",
        description: "Check your connection and try again.",
        variant: "error",
      });
    } finally {
      setLoggingOut(false);
    }
  }

  function handleTabKeyDown(
    event: React.KeyboardEvent<HTMLAnchorElement>,
    index: number
  ) {
    const total = APP_NAV_ITEMS.length;
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % total;
    } else if (event.key === "ArrowLeft") {
      nextIndex = (index - 1 + total) % total;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = total - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      tabRefs.current[nextIndex]?.focus();
    }
  }

  const displayName = user.name?.trim() || user.displayUsername || user.username;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="bg-bento-graph flex min-h-dvh flex-col text-ink-primary">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-50 focus:rounded-[10px] focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-canvas focus:outline-none"
      >
        Skip to main content
      </a>

      {/* BentoGraph Sticky Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-[rgba(255,255,255,0.08)] bg-canvas/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Left: Brand logo & product name */}
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="inline-flex min-h-10 shrink-0 items-center rounded-[10px] py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <BrandMark />
          </Link>

          {/* Desktop center: Segmented BentoGraph tab rail */}
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-surface/90 p-1 lg:flex"
          >
            {APP_NAV_ITEMS.map((item, index) => {
              const Icon = item.icon;
              const active = isActive(item);
              return (
                <Link
                  key={item.href}
                  ref={(node) => {
                    tabRefs.current[index] = node;
                  }}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onKeyDown={(event) => handleTabKeyDown(event, index)}
                  className={cn(
                    "group relative inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-[8px] px-3 text-sm font-medium transition-colors duration-150 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                    active
                      ? "border border-[rgba(255,255,255,0.1)] bg-elevated text-ink-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                      : "border border-transparent text-ink-secondary hover:bg-canvas/70 hover:text-ink-primary"
                  )}
                >
                  <Icon
                    aria-hidden="true"
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active
                        ? "text-accent"
                        : "text-ink-muted group-hover:text-ink-secondary"
                    )}
                    strokeWidth={1.6}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Desktop right: Account dropdown */}
          <div className="hidden shrink-0 lg:block">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  suppressHydrationWarning
                  aria-label={`Account menu for ${displayName}`}
                  className="inline-flex min-h-10 max-w-[240px] cursor-pointer items-center gap-2.5 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-surface px-2.5 py-1.5 text-left transition-colors hover:border-[rgba(255,255,255,0.16)] hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] border border-[rgba(255,255,255,0.1)] bg-canvas  text-xs font-medium text-ink-primary"
                  >
                    {initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium leading-tight text-ink-primary">
                      {displayName}
                    </span>
                    <span className="block truncate  text-[11px] leading-tight text-ink-muted">
                      @{user.displayUsername || user.username}
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden="true"
                    className="h-3.5 w-3.5 shrink-0 text-ink-muted"
                    strokeWidth={1.75}
                  />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8}>
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <Settings
                      className="h-4 w-4 text-ink-muted"
                      strokeWidth={1.5}
                    />
                    Profile and settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    void handleLogout();
                  }}
                  disabled={loggingOut}
                  className="text-status-danger focus:text-status-danger"
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.5} />
                  {loggingOut ? "Signing out..." : "Sign out"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile & Tablet right: Hamburger toggle */}
          <button
            ref={menuButtonRef}
            type="button"
            suppressHydrationWarning
            aria-label={
              mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"
            }
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-panel"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-surface text-ink-primary transition-colors hover:border-[rgba(255,255,255,0.18)] hover:bg-elevated focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:hidden"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile & Tablet collapsible hamburger panel */}
        {mobileMenuOpen ? (
          <div
            id="mobile-navigation-panel"
            className="border-t border-[rgba(255,255,255,0.08)] bg-surface px-4 pb-5 pt-3 shadow-[0_18px_40px_rgba(0,0,0,0.6)] sm:px-6 lg:hidden"
          >
            <nav
              aria-label="Mobile navigation"
              className="mx-auto max-w-[1440px] space-y-1"
            >
              {APP_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "relative flex min-h-[44px] items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                      active
                        ? "border border-[rgba(255,255,255,0.1)] bg-elevated text-ink-primary"
                        : "border border-transparent text-ink-secondary hover:bg-canvas/70 hover:text-ink-primary"
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "h-4 w-[2px] rounded-full transition-colors",
                        active ? "bg-accent" : "bg-transparent"
                      )}
                    />
                    <Icon
                      aria-hidden="true"
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-accent" : "text-ink-muted"
                      )}
                      strokeWidth={1.6}
                    />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Account summary, Profile link, and Sign out inside hamburger */}
            <div className="mx-auto mt-4 max-w-[1440px] space-y-2 border-t border-[rgba(255,255,255,0.08)] pt-4">
              <div className="flex items-center gap-3 px-2 py-1">
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.1)] bg-canvas  text-xs font-medium text-ink-primary"
                >
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink-primary">
                    {displayName}
                  </p>
                  <p className="truncate  text-xs text-ink-muted">
                    @{user.displayUsername || user.username}
                  </p>
                </div>
              </div>

              <Link
                href="/profile"
                aria-current={isProfileActive ? "page" : undefined}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex min-h-[44px] items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  isProfileActive
                    ? "border border-[rgba(255,255,255,0.1)] bg-elevated text-ink-primary"
                    : "border border-transparent text-ink-secondary hover:bg-canvas/70 hover:text-ink-primary"
                )}
              >
                <Settings
                  aria-hidden="true"
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isProfileActive ? "text-accent" : "text-ink-muted"
                  )}
                  strokeWidth={1.6}
                />
                <span>Profile and settings</span>
              </Link>

              <button
                type="button"
                suppressHydrationWarning
                onClick={() => void handleLogout()}
                disabled={loggingOut}
                className="flex min-h-[44px] w-full cursor-pointer items-center gap-3 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-canvas/70 px-3.5 py-2.5 text-left text-sm font-medium text-status-danger transition-colors hover:bg-elevated disabled:pointer-events-none disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <LogOut
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0"
                  strokeWidth={1.6}
                />
                <span>{loggingOut ? "Signing out..." : "Sign out"}</span>
              </button>
            </div>
          </div>
        ) : null}
      </header>

      {/* Main viewport */}
      <main
        id="main-content"
        className="mx-auto w-full min-w-0 max-w-[1440px] flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8"
      >
        {children}
      </main>
    </div>
  );
}
