import "server-only";

import type { Metadata } from "next";

const FALLBACK_TITLE = "Eric L. Chen";
const FALLBACK_DOMAIN = "ericlchen.com";

const siteTitle = process.env.SITE_TITLE ?? FALLBACK_TITLE;
const siteDomain = process.env.SITE_DOMAIN ?? FALLBACK_DOMAIN;

export function getSiteTitle(): string {
  return siteTitle;
}

export function getSiteDomain(): string {
  return siteDomain;
}

export function buildSiteMetadata(): Metadata {
  const baseUrl = siteDomain.startsWith("http") ? siteDomain : `https://${siteDomain}`;

  return {
    metadataBase: new URL(baseUrl),
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
      url: baseUrl,
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

