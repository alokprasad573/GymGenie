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
          {/* Quiet BentoGraph top navigation */}
          <header className="sticky top-0 z-30 border-b border-[rgba(255,255,255,0.08)] bg-canvas/90 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
              <Link
                href="/"
                className="inline-flex min-h-10 shrink-0 items-center rounded-[10px] py-1"
              >
                <BrandMark />
              </Link>
              <nav
                aria-label="Primary"
                className="hidden items-center gap-1 rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-surface/85 p-1 text-sm text-ink-secondary md:flex"
              >
                <a
                  href="#exercises"
                  className="inline-flex h-8 items-center rounded-[7px] px-3 transition-colors hover:bg-elevated hover:text-ink-primary"
                >
                  Exercises
                </a>
                <a
                  href="#architecture"
                  className="inline-flex h-8 items-center rounded-[7px] px-3 transition-colors hover:bg-elevated hover:text-ink-primary"
                >
                  How it works
                </a>
              </nav>
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <Link
                  href="/login"
                  className="inline-flex min-h-10 items-center rounded-[10px] px-3 text-sm text-ink-secondary transition-colors hover:text-ink-primary"
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

          {/* BentoGraph Hero Grid */}
          <section className="mx-auto max-w-[1280px] px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12 lg:px-8 lg:pb-20 lg:pt-16">
            <div className="grid items-stretch gap-4 lg:grid-cols-12">
              {/* Left Bento Stack: Headline Cell + Telemetry Facts Strip */}
              <div className="flex min-w-0 flex-col gap-4 lg:col-span-6">
                <div className="bento-cell flex flex-1 flex-col justify-between gap-8 p-6 sm:p-8">
                  <div className="space-y-5">
                    <div className="inline-flex items-center gap-2 rounded-[8px] border border-[rgba(255,255,255,0.09)] bg-canvas/85 px-2.5 py-1 text-xs text-ink-secondary">
                      <span
                        className="h-1.5 w-1.5 rounded-full bg-accent"
                        aria-hidden="true"
                      />
                      <span>On-device pose telemetry</span>
                    </div>

                    <h1 className="text-3xl font-medium tracking-[-0.03em] text-ink-primary leading-[1.08] sm:text-5xl lg:text-[52px]">
                      Real-time rep counting and form coaching in your browser
                    </h1>

                    <p className="max-w-xl text-base leading-7 text-ink-secondary sm:text-[17px]">
                      GymGenie runs MediaPipe Pose Landmarker in your browser to
                      track 33 normalized body landmarks, count reps across five
                      strength exercises, and speak form cues when alignment
                      drifts.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
                    <Button
                      asChild
                      size="lg"
                      variant="primary"
                      className="w-full sm:w-auto"
                    >
                      <Link href="/register">
                        Start training
                        <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      size="lg"
                      variant="secondary"
                      className="w-full sm:w-auto"
                    >
                      <Link href="/login">Sign in to dashboard</Link>
                    </Button>
                  </div>
                </div>

                {/* Nested 3-Cell Bento Facts Strip */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <div className="bento-cell p-4">
                    <span className="block  text-xl font-medium text-ink-primary tabular-nums sm:text-2xl">
                      33
                    </span>
                    <span className="mt-1 block text-xs text-ink-secondary">
                      Pose landmarks
                    </span>
                  </div>
                  <div className="bento-cell p-4">
                    <span className="block  text-xl font-medium text-accent tabular-nums sm:text-2xl">
                      0%
                    </span>
                    <span className="mt-1 block text-xs text-ink-secondary">
                      Video uploaded
                    </span>
                  </div>
                  <div className="bento-cell p-4">
                    <span className="block  text-xl font-medium text-ink-primary tabular-nums sm:text-2xl">
                      0.70
                    </span>
                    <span className="mt-1 block text-xs text-ink-secondary">
                      Visibility gate
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Bento Stage: Interactive 3D Biomechanics Viewport */}
              <div className="min-w-0 lg:col-span-6">
                <HeroPoseVisual />
              </div>
            </div>
          </section>

          {/* Five Detectors Asymmetric Bento Matrix */}
          <section
            id="exercises"
            className="scroll-mt-24 border-t border-[rgba(255,255,255,0.08)] py-14 sm:py-20"
          >
            <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
              <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
                <div className="max-w-2xl space-y-2">
                  <p className=" text-xs text-accent">
                    01 / Supported Exercises.
                  </p>
                  <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink-primary sm:text-3xl">
                    Five biomechanics detectors calibrated to joint angles
                  </h2>
                  <p className="text-sm leading-6 text-ink-secondary">
                    Each detector verifies landmark visibility at 0.70 before
                    counting a rep and tracks alignment metrics on every video
                    frame.
                  </p>
                </div>
                <span className="text-xs text-ink-muted tabular-nums">
                  5 detectors · 18 bone vectors
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-6 lg:grid-cols-12">
                {EXERCISE_ORDER.map((id, idx) => {
                  const ex = EXERCISES[id];
                  const isLeadRow = idx < 2;
                  const lowPct = Math.round(
                    (ex.thresholds.primaryTrigger / 180) * 100
                  );
                  const highPct = Math.round(
                    (ex.thresholds.returnTrigger / 180) * 100
                  );

                  return (
                    <div
                      key={ex.id}
                      className={
                        isLeadRow
                          ? "bento-cell flex flex-col justify-between gap-5 p-5 transition-[border-color] duration-150 hover:border-[rgba(255,255,255,0.16)] md:col-span-3 lg:col-span-6"
                          : "bento-cell flex flex-col justify-between gap-5 p-5 transition-[border-color] duration-150 hover:border-[rgba(255,255,255,0.16)] md:col-span-2 lg:col-span-4"
                      }
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="block  text-[11px] text-ink-muted tabular-nums">
                              {String(idx + 1).padStart(2, "0")} · {ex.muscleGroup}
                            </span>
                            <h3 className="mt-1 text-base font-medium text-ink-primary">
                              {ex.label}
                            </h3>
                          </div>
                          <span className="rounded-[6px] border border-[rgba(255,255,255,0.08)] bg-canvas px-2 py-0.5  text-[11px] text-accent tabular-nums">
                            {ex.thresholds.primaryTrigger}°–{ex.thresholds.returnTrigger}°
                          </span>
                        </div>

                        <p className="text-sm leading-6 text-ink-secondary">
                          {ex.description}
                        </p>
                      </div>

                      <div className="space-y-3 border-t border-[rgba(255,255,255,0.06)] pt-3.5">
                        {/* Calibrated angle-arc range bar (0° to 180°) */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between  text-[11px] text-ink-muted tabular-nums">
                            <span>Trigger {ex.thresholds.primaryTrigger}°</span>
                            <span>Return {ex.thresholds.returnTrigger}°</span>
                          </div>
                          <div
                            aria-hidden="true"
                            className="relative h-1.5 w-full overflow-hidden rounded-full bg-canvas"
                          >
                            <div
                              className="absolute top-0 bottom-0 rounded-full bg-accent/80"
                              style={{
                                left: `${lowPct}%`,
                                width: `${Math.max(8, highPct - lowPct)}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Tracked metric tags */}
                        <div className="flex flex-wrap gap-1.5">
                          {ex.metricDefinitions.map((m) => (
                            <span
                              key={m.key}
                              className="rounded-[6px] border border-[rgba(255,255,255,0.07)] bg-canvas px-2 py-0.5 text-[11px] text-ink-secondary"
                            >
                              {m.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* BentoGraph Architecture & Privacy Pipeline */}
          <section
            id="architecture"
            className="scroll-mt-24 border-t border-[rgba(255,255,255,0.08)] py-14 sm:py-20"
          >
            <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
              <div className="mb-8 max-w-2xl space-y-2">
                <p className=" text-xs text-accent">
                  02 / How it works ?
                </p>
                <h2 className="text-2xl font-medium tracking-[-0.02em] text-ink-primary sm:text-3xl">
                  How browser pose detection counts reps without uploading video
                </h2>
                <p className="text-sm leading-6 text-ink-secondary">
                  MediaPipe Pose Landmarker runs inside your browser tab on your
                  webcam stream and outputs 33 normalized coordinates per frame.
                  Only compact workout totals and optional coaching events reach
                  the server.
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-12">
                {/* Featured Pipeline Graph Cell (7 cols) */}
                <div className="bento-cell flex flex-col justify-between gap-6 p-6 lg:col-span-7">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.09)] bg-canvas">
                        <Camera
                          className="h-4 w-4 text-accent"
                          strokeWidth={1.5}
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-ink-primary">
                          On-device camera inference pipeline
                        </h3>
                        <p className="text-xs text-ink-muted">
                          Local WebGL/WASM frame processing
                        </p>
                      </div>
                    </div>
                    <span className="rounded-[6px] border border-accent/25 bg-[rgba(198,255,77,0.08)] px-2 py-0.5  text-[11px] text-accent">
                      Privacy boundary
                    </span>
                  </div>

                  {/* 4-Node BentoGraph Dataflow Diagram */}
                  <div className="grid gap-2.5 sm:grid-cols-4">
                    {[
                      {
                        step: "01",
                        label: "Webcam",
                        meta: "Local stream",
                        local: true,
                      },
                      {
                        step: "02",
                        label: "MediaPipe",
                        meta: "33 landmarks",
                        local: true,
                      },
                      {
                        step: "03",
                        label: "Detectors",
                        meta: "Angle math",
                        local: true,
                      },
                      {
                        step: "04",
                        label: "History & AI",
                        meta: "Totals only",
                        local: false,
                      },
                    ].map((node) => (
                      <div
                        key={node.step}
                        className="bento-well flex flex-col justify-between gap-2.5 p-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-ink-muted">
                            {node.step}
                          </span>
                          <span
                            className={
                              node.local
                                ? "h-1.5 w-1.5 rounded-full bg-accent"
                                : "h-1.5 w-1.5 rounded-full bg-ink-muted"
                            }
                            aria-hidden="true"
                          />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-ink-primary">
                            {node.label}
                          </p>
                          <p className="mt-0.5  text-[11px] text-ink-muted">
                            {node.meta}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="text-sm leading-6 text-ink-secondary">
                    Webcam video stays strictly in your browser. MediaPipe
                    extracts normalized landmarks and draws the live skeleton on
                    Canvas without transmitting raw video frames.
                  </p>
                </div>

                {/* Deterministic Rep Counting Cell (5 cols) */}
                <div className="bento-cell flex flex-col justify-between gap-4 p-6 lg:col-span-5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.09)] bg-canvas">
                    <Cpu
                      className="h-4 w-4 text-ink-secondary"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-medium text-ink-primary">
                      Deterministic rep counting
                    </h3>
                    <p className="text-sm leading-6 text-ink-secondary">
                      Joint angles compute from 2D normalized coordinates using
                      clamped arc-cosine math and strict 0.70 visibility gating
                      to prevent phantom reps.
                    </p>
                  </div>
                  <div className="bento-well flex items-center justify-between px-3.5 py-2.5  text-xs text-ink-muted tabular-nums">
                    <span>Clamped acos vector math</span>
                    <span className="text-ink-primary">100% deterministic</span>
                  </div>
                </div>

                {/* Event-driven Voice Cues Cell (6 cols) */}
                <div className="bento-cell flex flex-col justify-between gap-4 p-6 lg:col-span-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.09)] bg-canvas">
                      <Volume2
                        className="h-4 w-4 text-ink-secondary"
                        strokeWidth={1.5}
                      />
                    </div>
                    <span className=" text-[11px] text-ink-muted">
                      3-tier coaching fallback
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-medium text-ink-primary">
                      Event-driven voice cues
                    </h3>
                    <p className="text-sm leading-6 text-ink-secondary">
                      Compact form events trigger server-side Groq coaching with
                      automatic fallback to deterministic local cues, spoken
                      hands-free through browser SpeechSynthesis.
                    </p>
                  </div>
                </div>

                {/* Scoped Workout History Cell (6 cols) */}
                <div className="bento-cell flex flex-col justify-between gap-4 p-6 lg:col-span-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.09)] bg-canvas">
                      <ShieldCheck
                        className="h-4 w-4 text-ink-secondary"
                        strokeWidth={1.5}
                      />
                    </div>
                    <span className=" text-[11px] text-ink-muted">
                      Argon2id · rotating tokens
                    </span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-base font-medium text-ink-primary">
                      Scoped workout history
                    </h3>
                    <p className="text-sm leading-6 text-ink-secondary">
                      Completed and interrupted sessions save to MongoDB under
                      your authenticated account with per-set logs and
                      date-range volume analytics.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* BentoGraph Footer */}
          <footer className="border-t border-[rgba(255,255,255,0.08)] py-10">
            <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
              <BrandMark />
              <p className=" text-xs text-ink-muted">
                GymGenie · AI Exercise Tutor
              </p>
            </div>
          </footer>
        </div>
      </div>
    </LandingChoreography>
  );
}
