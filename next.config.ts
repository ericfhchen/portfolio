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
  },
};

export default nextConfig;