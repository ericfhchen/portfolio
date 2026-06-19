// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    deviceSizes: [480, 768, 1024, 1280, 1536, 1920, 2560, 3200],
    imageSizes: [320, 480, 640, 750, 828, 1080, 1280, 1600, 1920],
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy:
      "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; script-src 'none';",
    remotePatterns: [
      {
        // Original full-resolution uploads
        protocol: "https",
        hostname: "d2w9rnfcy7mm78.cloudfront.net",
      },
      {
        // Are.na v3 resized image variants (small/medium/large/square)
        protocol: "https",
        hostname: "images.are.na",
      },
      {
        // Are.na file attachments (video, etc.)
        protocol: "https",
        hostname: "attachments.are.na",
      },
    ],
  },
};

export default nextConfig;