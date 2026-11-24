import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MetricCard } from "@/components/ui/metric-card";
import { StatePanel } from "@/components/ui/state-panel";
import { WorkoutSetupView } from "@/components/workout/workout-setup-view";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
  usePathname: () => "/workout/setup",
  useSearchParams: () => new URLSearchParams(),
}));

describe("Phase 2 & 5 — UI Component & Accessibility Checks", () => {
  it("renders MetricCard with tabular figures and context", () => {
    render(
      <MetricCard
        label="Total reps"
        value="420"
        context="Across 14 logged sets"
        accent
      />
    );
    expect(screen.getByText("Total reps")).toBeInTheDocument();
    expect(screen.getByText("420")).toBeInTheDocument();
    expect(screen.getByText("Across 14 logged sets")).toBeInTheDocument();
  });

  it("renders StatePanel with alert role on error variant", () => {
    render(
      <StatePanel
        variant="error"
        title="Camera unavailable"
        description="Reconnect your camera to continue."
      />
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Camera unavailable")).toBeInTheDocument();
  });

  it("lets users select any of the five exercises and configure targets", () => {
    pushMock.mockReset();
    render(
      <WorkoutSetupView
        initialPreferences={{
          enableVoice: true,
          enableAiCoaching: true,
          defaultRestSeconds: 45,
        }}
      />
    );

    expect(screen.getByText("Squats")).toBeInTheDocument();
    expect(screen.getByText("Push-ups")).toBeInTheDocument();
    expect(screen.getByText("Biceps Curls (Dumbbell)")).toBeInTheDocument();
    expect(screen.getByText("Shoulder Press")).toBeInTheDocument();
    expect(screen.getByText("Lunges")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Push-ups/i }));
    fireEvent.click(screen.getByRole("button", { name: /Launch live session/i }));

    expect(pushMock).toHaveBeenCalledWith("/workout/session");
  });
});
