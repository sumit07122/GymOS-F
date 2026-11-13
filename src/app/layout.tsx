import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FIXIA GymOS", template: "%s · FIXIA GymOS" },
  description: "Run your whole gym from one place.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#0b2a1b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
