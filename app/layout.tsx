import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { BentoCursorLight } from "@/components/layout/bento-cursor-light";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

const adobeClean = localFont({
  src: "./fonts/AdobeClean.otf",
  weight: "400 700",
  style: "normal",
  variable: "--font-brand-sans",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "GymGenie: AI Exercise Tutor",
    template: "%s · GymGenie",
  },
  description:
    "Browser-side MediaPipe Pose Landmarker analysis with 33 normalized landmarks, deterministic rep counting across five exercises, and structured workout tracking.",
};

export const viewport: Viewport = {
  themeColor: "#08090B",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${adobeClean.variable} dark`}
      suppressHydrationWarning
    >
      <body
        className="bg-canvas text-ink-primary antialiased selection:bg-accent selection:text-canvas"
        suppressHydrationWarning
      >
        <BentoCursorLight />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
