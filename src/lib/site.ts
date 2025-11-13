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
    description: `${siteTitle} — portfolio and selected work.`,
    openGraph: {
      title: siteTitle,
      siteName: siteTitle,
      url: baseUrl,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
    },
  };
}

