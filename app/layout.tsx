import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CampusPilot — Your college life, under control",
  description:
    "Track attendance, deadlines and exams — then let AI build a study plan around your real schedule.",
  appleWebApp: {
    capable: true,
    title: "CampusPilot",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
