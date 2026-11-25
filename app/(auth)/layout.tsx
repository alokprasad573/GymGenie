import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { KineticBackdrop } from "@/components/layout/kinetic-backdrop";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-dvh bg-canvas text-ink-primary">
      <KineticBackdrop />
      <div className="relative z-10 flex min-h-dvh flex-col">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-[rgba(255,255,255,0.08)] bg-canvas/90 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-[10px] py-1"
          >
            <BrandMark />
          </Link>
          <Link
            href="/"
            className="inline-flex min-h-10 items-center rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-surface/80 px-3 text-xs font-medium text-ink-secondary transition-colors hover:border-[rgba(255,255,255,0.16)] hover:text-ink-primary"
          >
            Back to overview
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
          <div className="bento-enter w-full max-w-md space-y-3">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
