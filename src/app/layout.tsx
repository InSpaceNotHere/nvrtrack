import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";

import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NVRTRACK",
  description: "Minimal, private fitness tracker for training, nutrition, and progress tracking.",
  applicationName: "NVRTRACK",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/pwa/icon-192", type: "image/png", sizes: "192x192" },
      { url: "/pwa/icon-512", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/pwa/apple-icon", type: "image/png", sizes: "180x180" }],
    shortcut: ["/pwa/icon-192"],
  },
  appleWebApp: {
    capable: true,
    title: "NVRTRACK",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  themeColor: "#050608",
  colorScheme: "dark",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--background)] font-sans text-white">
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
