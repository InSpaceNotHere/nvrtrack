import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NVR Content",
  description: "A local business content workbench.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
