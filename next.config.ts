// next.config.ts
import type { NextConfig } from "next";

const rawBlogDomain = process.env.SITE_BLOG_DOMAIN ?? "blog.ericlchen.com";
const blogHost = rawBlogDomain.replace(/^https?:\/\//, "").trim();

const nextConfig: NextConfig = {
  images: {
    deviceSizes: [480, 768, 1024, 1280, 1536, 1920, 2560, 3200],
    imageSizes: [320, 480, 640, 750, 828, 1080, 1280, 1600, 1920],
    formats: ["image/avif", "image/webp"],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy:
      "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; script-src 'none';",
    localPatterns: [
      {
        pathname: "/api/arena/image/**",
      },
    ],
  },
  async rewrites() {
    if (!blogHost) {
      return [];
    }

    return [
      {
        source: "/:path*",
        has: [
          {
            type: "host",
            value: blogHost,
          },
        ],
        destination: "/blog/:path*",
      },
    ];
  },
};

export default nextConfig;