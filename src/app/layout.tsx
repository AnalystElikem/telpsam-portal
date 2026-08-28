import type { Metadata, Viewport } from "next";
import { Lora, Inter } from "next/font/google";
import "./globals.css";

const heading = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "TELPSAM Alumni & Mentorship Portal",
    template: "%s · TELPSAM Portal",
  },
  description:
    "The TELPSAM alumni network. A safe, guided space where students learn from those who have gone ahead. Mentorship is coordinated and protected by the TELPSAM Program Coordinators.",
  applicationName: "TELPSAM Portal",
  manifest: "/manifest.json",
  icons: {
    icon: "/telpsam-logo.png",
    shortcut: "/telpsam-logo.png",
    apple: "/telpsam-logo.png",
  },
  appleWebApp: { capable: true, title: "TELPSAM", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#14213d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const testMode = process.env.NEXT_PUBLIC_TEST_MODE === "true";
  return (
    <html lang="en" className={`${heading.variable} ${body.variable}`}>
      <body>
        {testMode && (
          <div className="bg-coral px-4 py-1.5 text-center text-xs font-semibold text-white">
            Test environment — this is a trial. Accounts and data may be reset. Please don&apos;t use real sensitive information.
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
