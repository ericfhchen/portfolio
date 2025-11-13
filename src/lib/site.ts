import "server-only";

import type { Metadata } from "next";

const FALLBACK_TITLE = "Eric L. Chen";
const FALLBACK_DOMAIN = "ericlchen.com";
const FALLBACK_BLOG_DOMAIN = `blog.${FALLBACK_DOMAIN}`;

function ensureProtocol(domain: string): string {
  return domain.startsWith("http") ? domain : `https://${domain}`;
}

const siteTitle = process.env.SITE_TITLE ?? FALLBACK_TITLE;
const siteDomain = process.env.SITE_DOMAIN ?? FALLBACK_DOMAIN;
const inferredBlogDomain =
  process.env.SITE_BLOG_DOMAIN ??
  (siteDomain.startsWith("http")
    ? ensureProtocol(siteDomain).replace("://", "://blog.")
    : `blog.${siteDomain}`);
const blogDomain = inferredBlogDomain || FALLBACK_BLOG_DOMAIN;

const siteOrigin = ensureProtocol(siteDomain);
const blogOrigin = ensureProtocol(blogDomain);

export function getSiteTitle(): string {
  return siteTitle;
}

export function getSiteDomain(): string {
  return siteDomain;
}

export function getSiteOrigin(): string {
  return siteOrigin;
}

export function getBlogDomain(): string {
  return blogDomain;
}

export function getBlogOrigin(): string {
  return blogOrigin;
}

export function buildSiteMetadata(): Metadata {
  return {
    metadataBase: new URL(siteOrigin),
    title: {
      default: siteTitle,
      template: `%s · ${siteTitle}`,
    },
    description: `Eric L. Chen is a Toronto-based designer and strategist. Partner at FINAL RESEARCH. His practice oscillates between brand consulting, image-making, and the design of graphics, websites, objects, printed matter and visual identities.`,
    keywords: [
      "graphic design",
      "art direction",
      "creative direction",
      "web development",
      "creative technologist",
      "visual design",
      "brand identity",
      "branding",
      "independent design studio",
      "design studio",
      "design consultancy",
      "design services",
      "design projects",
      "web designer",
      "front-end developer",
      "interaction design",
      "motion design",
      "audio visual",
      "creative studio",
      "portfolio",
      "freelance designer",
      "design and development",
      "music and design",
      "artist portfolio"
    ],
    openGraph: {
      title: siteTitle,
      siteName: siteTitle,
      url: siteOrigin,
      type: "website",
      description: `Eric L. Chen is a Toronto-based designer and strategist...`,
      images: [
        {
          url: '/opengraph-image.jpg',
          width: 1200,
          height: 630,
          alt: `${siteTitle}`,
        }
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: `Eric L. Chen is a Toronto-based designer and strategist...`,
      images: ['/opengraph-image.jpg'],
    },
  };
}

