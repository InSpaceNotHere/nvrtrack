import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NVRTRACK",
  description: "Minimal, private fitness tracker interface prototype.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--background)] font-sans text-white">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
