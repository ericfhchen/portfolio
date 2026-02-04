import "./globals.css";

import { buildSiteMetadata } from "@/lib/site";
import type { Viewport } from "next";

export const metadata = buildSiteMetadata();

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-black antialiased">
        <div className="min-h-screen">{children}</div>
      </body>
    </html>
  );
}
