import Link from "next/link";
import { ArrowRight, Camera, Cpu, ShieldCheck, Volume2 } from "lucide-react";
import { BrandMark } from "@/components/layout/brand-mark";
import { KineticBackdrop } from "@/components/layout/kinetic-backdrop";
import { Button } from "@/components/ui/button";
import {
  HeroPoseVisual,
  LandingChoreography,
} from "@/components/animations/landing-choreography";
import { EXERCISE_ORDER, EXERCISES } from "@/config/exercises";

export default function LandingPage() {
  return (
    <LandingChoreography>
      <div className="relative min-h-dvh bg-canvas text-ink-primary">
        <KineticBackdrop />

        <div className="relative z-10">
          {/* Quiet top navigation */}
          <header className="sticky top-0 z-30 border-b border-[rgba(255,255,255,0.08)] bg-canvas/95 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              <Link
                href="/"
                className="inline-flex min-h-10 shrink-0 items-center rounded-[8px] py-1"
              >
                <BrandMark />
              </Link>
              <nav
                aria-label="Primary"
                className="hidden items-center gap-1 text-sm text-ink-secondary md:flex"
              >
                <a
                  href="#exercises"
                  className="inline-flex min-h-10 items-center rounded-[8px] px-3 transition-colors hover:bg-surface hover:text-ink-primary"
                >
                  Exercises
                </a>
                <a
                  href="#architecture"
                  className="inline-flex min-h-10 items-center rounded-[8px] px-3 transition-colors hover:bg-surface hover:text-ink-primary"
                >
                  How it works
                </a>
              </nav>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <Link
                  href="/login"
                  className="inline-flex min-h-10 items-center rounded-[8px] px-2.5 text-sm text-ink-secondary transition-colors hover:text-ink-primary"
                >
                  Log in
                </Link>
                <Button asChild size="sm" variant="primary">
                  <Link href="/register">Create account</Link>
                </Button>
              </div>
            </div>
            {/* Compact section tabs for mobile */}
            <nav
              aria-label="Page sections"
              className="gg-no-scrollbar flex items-center gap-1 overflow-x-auto border-t border-[rgba(255,255,255,0.06)] px-3 md:hidden"
            >
              <a
                href="#exercises"
                className="inline-flex min-h-[40px] shrink-0 items-center whitespace-nowrap px-3 text-xs font-medium text-ink-secondary transition-colors hover:text-ink-primary"
              >
                Exercises
              </a>
              <a
                href="#architecture"
                className="inline-flex min-h-[40px] shrink-0 items-center whitespace-nowrap px-3 text-xs font-medium text-ink-secondary transition-colors hover:text-ink-primary"
              >
                How it works
              </a>
            </nav>
          </header>

          {/* Asymmetric split hero */}
          <section className="mx-auto max-w-[1280px] px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-16 lg:px-8 lg:pb-28 lg:pt-24">
            <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="min-w-0 space-y-5 sm:space-y-6 lg:col-span-6">
                <h1
                  data-hero-reveal
                  className="text-3xl font-medium tracking-[-0.03em] text-ink-primary leading-[1.08] sm:text-5xl lg:text-[56px]"
                >
                  Real-time rep counting and form coaching in your browser
                </h1>

                <p
                  data-hero-reveal
                  className="max-w-xl text-base leading-7 text-ink-secondary sm:text-lg"
                >
                  GymGenie runs MediaPipe Pose Landmarker in your browser to
                  track 33 normalized body landmarks, count reps across five
                  strength exercises, and speak form cues when alignment drifts.
                </p>

                <div
                  data-hero-reveal
                  className="flex flex-col gap-3 pt-2 sm:flex-row sm:flex-wrap sm:items-center"
                >
                  <Button asChild size="lg" variant="primary" className="w-full sm:w-auto">
                    <Link href="/register">
                      Start training
                      <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto">
                    <Link href="/login">Sign in to dashboard</Link>
                  </Button>
                </div>
              </div>

              <div data-hero-visual className="min-w-0 lg:col-span-6">
                <HeroPoseVisual />
              </div>
            </div>
          </section>

          {/* Five exercises section */}
          <section
            id="exercises"
            data-scroll-section
            className="scroll-mt-28 border-t border-[rgba(255,255,255,0.08)] py-14 sm:py-20"
          >
            <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
              <div data-section-header className="mb-10 max-w-2xl space-y-2">
                <p className="text-xs font-medium text-accent">
                  Supported movements
                </p>
                <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink-primary sm:text-3xl">
                  Five biomechanics detectors calibrated to joint angles
                </h2>
                <p className="text-sm leading-6 text-ink-secondary">
                  Each detector checks landmark visibility at 0.70 before
                  counting a rep and tracks alignment metrics on every video
                  frame.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {EXERCISE_ORDER.map((id) => {
                  const ex = EXERCISES[id];
                  return (
                    <div
                      key={ex.id}
                      data-stagger-card
                      className="flex flex-col justify-between gap-4 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-surface p-5"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-base font-medium text-ink-primary">
                            {ex.label}
                          </h3>
                          <span className="text-xs text-ink-muted">
                            {ex.muscleGroup}
                          </span>
                        </div>
                        <p className="text-sm leading-6 text-ink-secondary">
                          {ex.description}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[rgba(255,255,255,0.06)] pt-3 text-xs text-ink-muted tabular-nums">
                        <span>
                          Trigger {ex.thresholds.primaryTrigger}° / Return{" "}
                          {ex.thresholds.returnTrigger}°
                        </span>
                        <span>
                          {ex.metricDefinitions.length} live metrics
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Architecture & privacy section */}
          <section
            id="architecture"
            data-scroll-section
            className="scroll-mt-28 border-t border-[rgba(255,255,255,0.08)] py-14 sm:py-20"
          >
            <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
              <div data-section-header className="mb-10 max-w-2xl space-y-2">
                <p className="text-xs font-medium text-accent">
                  How GymGenie runs
                </p>
                <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink-primary sm:text-3xl">
                  How does browser pose detection count reps without uploading
                  video?
                </h2>
                <p className="text-sm leading-6 text-ink-secondary">
                  MediaPipe Pose Landmarker runs inside your browser tab on your
                  webcam stream and outputs 33 normalized body coordinates per
                  frame. Only compact workout totals and optional coaching
                  events ever reach the server.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[
                  {
                    icon: Camera,
                    title: "On-device camera inference",
                    body: "Webcam video stays in your browser. MediaPipe Pose Landmarker extracts 33 normalized landmarks and draws the skeleton locally on Canvas.",
                  },
                  {
                    icon: Cpu,
                    title: "Deterministic rep counting",
                    body: "Joint angles compute from 2D normalized coordinates using clamped arc-cosine math and 0.70 visibility gating.",
                  },
                  {
                    icon: Volume2,
                    title: "Event-driven voice cues",
                    body: "Compact form events trigger server-side Groq coaching with a deterministic local fallback, spoken through browser SpeechSynthesis.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Scoped workout history",
                    body: "Completed and interrupted sessions save to MongoDB under your authenticated account with per-set logs and date-range analytics.",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      data-stagger-card
                      className="space-y-3 rounded-[12px] border border-[rgba(255,255,255,0.08)] bg-surface p-5"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[rgba(255,255,255,0.08)] bg-elevated">
                        <Icon
                          className="h-4 w-4 text-ink-secondary"
                          strokeWidth={1.5}
                        />
                      </div>
                      <h3 className="text-sm font-medium text-ink-primary">
                        {item.title}
                      </h3>
                      <p className="text-sm leading-6 text-ink-secondary">
                        {item.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t border-[rgba(255,255,255,0.08)] py-10">
            <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
              <BrandMark />
              <p className="text-xs text-ink-muted">
                GymGenie - AI based Exercise Tutor
              </p>
            </div>
          </footer>
        </div>
      </div>
    </LandingChoreography>
  );
}
