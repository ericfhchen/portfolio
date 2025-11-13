import type { Metadata } from "next";
import Link from "next/link";

import {
  type BlogEntry,
  type BlogImageEntry,
  type BlogLinkEntry,
  type BlogMediaEntry,
  type BlogTextEntry,
  getBlogEntries,
} from "@/lib/content";
import { getBlogOrigin, getSiteOrigin } from "@/lib/site";

const RICH_TEXT_CLASSES =
  "leading-tight text-[#EEEEEE] [&_p]:m-0 [&_a]:no-underline [&_a:hover]:opacity-50 [&_a]:transition-opacity [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6";

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

type RichTextTag = "div" | "figcaption";

type BlogRichTextProps = {
  html?: string;
  as?: RichTextTag;
  className?: string;
};

function BlogRichText({ html, as = "div", className }: BlogRichTextProps) {
  if (!html || typeof html !== "string") return null;
  const Tag = as;
  const mergedClassName = className ? `${RICH_TEXT_CLASSES} ${className}` : RICH_TEXT_CLASSES;
  return <Tag className={mergedClassName} dangerouslySetInnerHTML={{ __html: html }} />;
}

function BlogTextBlock({ entry }: { entry: BlogTextEntry }) {
  return (
    <article className="py-24 border-b border-neutral-800">
      <time className="block mb-2 text-[#EEEEEE] opacity-50">{formatDate(entry.createdAt)}</time>
      <BlogRichText html={entry.html} />
    </article>
  );
}

function BlogImageBlock({ entry }: { entry: BlogImageEntry }) {
  return (
    <article className="py-24 border-b border-neutral-800">
      <time className="block mb-2 text-[#EEEEEE] opacity-50">{formatDate(entry.createdAt)}</time>
      <figure>
        <div className="relative w-full overflow-hidden">
          {entry.placeholder ? (
            <div
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center"
            >
              <img
                src={entry.placeholder.src}
                alt=""
                className="h-auto w-full object-contain"
                style={{
                  filter: "blur(12px)",
                }}
              />
            </div>
          ) : null}
          <img
            src={entry.image.src}
            alt={entry.alt}
            width={entry.image.width}
            height={entry.image.height}
            className="relative h-auto w-full object-contain"
            loading="lazy"
            decoding="async"
          />
        </div>
        {entry.captionHtml ? (
          <BlogRichText html={entry.captionHtml} className="mt-4 text-[#EEEEEE] opacity-100" />
        ) : null}
      </figure>
    </article>
  );
}

function BlogLinkBlock({ entry }: { entry: BlogLinkEntry }) {
  return (
    <article className="py-24 border-b border-neutral-800">
      <time className="block mb-2 text-[#EEEEEE] opacity-50">{formatDate(entry.createdAt)}</time>
      <a
        href={entry.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block hover:opacity-50 transition-opacity"
      >
        {entry.previewImage ? (
          <div className="relative w-full overflow-hidden mb-4">
            <img
              src={entry.previewImage.src}
              alt={
                (typeof entry.metadata.title === "string" ? entry.metadata.title : null) ??
                (typeof entry.metadata.siteName === "string" ? entry.metadata.siteName : null) ??
                (typeof entry.metadata.hostname === "string" ? entry.metadata.hostname : null) ??
                entry.url
              }
              width={entry.previewImage.width}
              height={entry.previewImage.height}
              loading="lazy"
              className="h-auto w-full object-contain"
            />
          </div>
        ) : null}
        <div className="space-y-2">
          {typeof entry.metadata.siteName === "string" && entry.metadata.siteName ? (
            <div className="text-[#EEEEEE] opacity-50">
              {entry.metadata.siteName}
            </div>
          ) : null}
        </div>
      </a>
      {entry.captionHtml ? (
        <BlogRichText html={entry.captionHtml} className="mt-4 text-[#EEEEEE] opacity-100" />
      ) : null}
    </article>
  );
}

function BlogMediaBlock({ entry }: { entry: BlogMediaEntry }) {
  const hasEmbed = Boolean(entry.embedHtml);
  const hasAttachment = Boolean(entry.attachmentUrl);

  return (
    <article className="py-24 border-b border-neutral-800">
      <time className="block mb-2 text-[#EEEEEE] opacity-50">{formatDate(entry.createdAt)}</time>
      <figure>
        {hasEmbed ? (
          <div
            className="overflow-hidden mb-4"
            dangerouslySetInnerHTML={{ __html: entry.embedHtml! }}
          />
        ) : null}
        {hasAttachment ? (
          <a
            href={entry.attachmentUrl}
            className="inline-block mb-4 text-[#EEEEEE] hover:opacity-50 transition-opacity"
            target="_blank"
            rel="noopener noreferrer"
          >
            Download
            {entry.attachmentContentType ? (
              <span className="ml-2 opacity-50">{entry.attachmentContentType}</span>
            ) : null}
          </a>
        ) : null}
        {entry.captionHtml ? (
          <BlogRichText html={entry.captionHtml} className="mt-4 text-[#EEEEEE] opacity-100" />
        ) : null}
      </figure>
    </article>
  );
}

function BlogEntryBlock({ entry }: { entry: BlogEntry }) {
  if (entry.kind === "text") {
    return <BlogTextBlock entry={entry} />;
  }

  if (entry.kind === "image") {
    return <BlogImageBlock entry={entry} />;
  }

  if (entry.kind === "link") {
    return <BlogLinkBlock entry={entry} />;
  }

  return <BlogMediaBlock entry={entry} />;
}

export const metadata: Metadata = {
  title: "Blog",
};

export const revalidate = 300;

export default async function BlogPage() {
  const entries = await getBlogEntries();
  const siteOrigin = getSiteOrigin();

  // Sort entries by date, most recent first
  const sortedEntries = [...entries].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime();
    const dateB = new Date(b.createdAt).getTime();
    return dateB - dateA; // Descending order (newest first)
  });

  return (
    <main className="min-h-screen bg-black text-[#EEEEEE]">
      {/* Header */}
      <div className="fixed left-2 right-2 top-2 z-30 flex justify-between pointer-events-none">
        <div className="pointer-events-auto leading-none text-left">
          BLOG
        </div>
        <Link
          href={siteOrigin}
          className="pointer-events-auto leading-none text-right transition-opacity duration-300 hover:opacity-50 focus:outline-none"
        >
          WORK
        </Link>
      </div>

      {/* Content */}
      <div className="pt-12 px-2 pb-16 max-w-2xl">
        <div className="w-full">
          {sortedEntries.length === 0 ? (
            <p className="text-[#EEEEEE] opacity-50">No posts yet.</p>
          ) : (
            sortedEntries.map((entry) => <BlogEntryBlock key={`${entry.kind}-${entry.id}`} entry={entry} />)
          )}
        </div>
      </div>
    </main>
  );
}


