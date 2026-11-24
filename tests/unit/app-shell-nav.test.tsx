import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { AppShell, APP_NAV_ITEMS } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui/toast";

let mockPathname = "/dashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => mockPathname,
}));

const MOCK_USER = {
  id: "u1",
  username: "alex_fit",
  displayUsername: "alex_fit",
  email: "alex@example.com",
  name: "Alex Rivera",
};

function renderShell(pathname = "/dashboard") {
  mockPathname = pathname;
  return render(
    <ToastProvider>
      <AppShell user={MOCK_USER}>
        <div>Page body content</div>
      </AppShell>
    </ToastProvider>
  );
}

describe("AppShell — Responsive Desktop Tabs & Mobile/Tablet Hamburger", () => {
  beforeEach(() => {
    mockPathname = "/dashboard";
  });

  it("renders inline desktop tab links without a sidebar and exposes skip-to-content", () => {
    const { container } = renderShell("/dashboard");

    expect(container.querySelector("aside")).toBeNull();

    const nav = screen.getByRole("navigation", { name: "Primary navigation" });
    expect(nav).toBeInTheDocument();

    for (const item of APP_NAV_ITEMS) {
      const link = within(nav).getByRole("link", { name: item.label });
      expect(link).toHaveAttribute("href", item.href);
    }

    const skipLink = screen.getByRole("link", { name: "Skip to main content" });
    expect(skipLink).toHaveAttribute("href", "#main-content");
    expect(container.querySelector("main#main-content")).not.toBeNull();
  });

  it("marks the active route link with aria-current='page' for exact and nested routes", () => {
    const { unmount } = renderShell("/workout/setup");
    const setupNav = screen.getByRole("navigation", {
      name: "Primary navigation",
    });
    expect(
      within(setupNav).getByRole("link", { name: "Start workout" })
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(setupNav).getByRole("link", { name: "Live session" })
    ).not.toHaveAttribute("aria-current");
    unmount();

    renderShell("/history/665a0b1c2d3e4f5a6b7c8d9e");
    const historyNav = screen.getByRole("navigation", {
      name: "Primary navigation",
    });
    expect(
      within(historyNav).getByRole("link", { name: "History" })
    ).toHaveAttribute("aria-current", "page");
    expect(
      within(historyNav).getByRole("link", { name: "Dashboard" })
    ).not.toHaveAttribute("aria-current");
  });

  it("supports keyboard ArrowRight, ArrowLeft, Home, and End focus navigation across desktop tabs", () => {
    renderShell("/dashboard");
    const nav = screen.getByRole("navigation", { name: "Primary navigation" });

    const dashboardTab = within(nav).getByRole("link", { name: "Dashboard" });
    const startWorkoutTab = within(nav).getByRole("link", {
      name: "Start workout",
    });
    const analyticsTab = within(nav).getByRole("link", { name: "Analytics" });

    dashboardTab.focus();
    expect(document.activeElement).toBe(dashboardTab);

    fireEvent.keyDown(dashboardTab, { key: "ArrowRight" });
    expect(document.activeElement).toBe(startWorkoutTab);

    fireEvent.keyDown(startWorkoutTab, { key: "End" });
    expect(document.activeElement).toBe(analyticsTab);

    fireEvent.keyDown(analyticsTab, { key: "ArrowRight" });
    expect(document.activeElement).toBe(dashboardTab);

    fireEvent.keyDown(dashboardTab, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(analyticsTab);

    fireEvent.keyDown(analyticsTab, { key: "Home" });
    expect(document.activeElement).toBe(dashboardTab);
  });

  it("opens and closes the mobile/tablet hamburger menu with routes, profile, and sign out", () => {
    renderShell("/profile");

    const toggle = screen.getByRole("button", {
      name: "Open navigation menu",
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(
      screen.queryByRole("navigation", { name: "Mobile navigation" })
    ).toBeNull();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAccessibleName("Close navigation menu");

    const mobileNav = screen.getByRole("navigation", {
      name: "Mobile navigation",
    });
    for (const item of APP_NAV_ITEMS) {
      expect(
        within(mobileNav).getByRole("link", { name: item.label })
      ).toHaveAttribute("href", item.href);
    }

    const profileLink = screen.getByRole("link", {
      name: "Profile and settings",
    });
    expect(profileLink).toHaveAttribute("href", "/profile");
    expect(profileLink).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("button", { name: "Sign out" })
    ).toBeInTheDocument();

    // Escape closes the menu and restores focus to the trigger
    fireEvent.keyDown(window, { key: "Escape" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(toggle);
  });
});
