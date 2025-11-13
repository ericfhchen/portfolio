import "./globals.css";

import { buildSiteMetadata } from "@/lib/site";



export const metadata = buildSiteMetadata();

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
