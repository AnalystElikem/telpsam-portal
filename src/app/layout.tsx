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

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://telpsam-portal.vercel.app";
const description =
  "The TELPSAM alumni network. A safe, guided space where students learn from those who have gone ahead. Mentorship is coordinated and protected by the TELPSAM Program Coordinators.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "TELPSAM Alumni & Mentorship Portal",
    template: "%s · TELPSAM Portal",
  },
  description,
  applicationName: "TELPSAM Portal",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "TELPSAM Portal",
    title: "TELPSAM Alumni & Mentorship Portal",
    description,
    url: siteUrl,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "TELPSAM Alumni & Mentorship Portal" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TELPSAM Alumni & Mentorship Portal",
    description,
    images: ["/og.png"],
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
            Test environment — this is a trial. Accounts and data may be reset.
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
