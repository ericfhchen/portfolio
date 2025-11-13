import "server-only";

import { cache } from "react";

import {
  ArenaAttachmentBlock,
  ArenaBlock,
  ArenaChannel,
  ArenaImageBlock,
  ArenaLinkBlock,
  ArenaMediaBlock,
  ArenaTextBlock,
  getChannel,
  isAttachmentBlock,
  isImageBlock,
  isLinkBlock,
  isMediaBlock,
  isTextBlock,
} from "./arena";
import { fetchBlurData } from "./blur";

const BIO_REVALIDATE_SECONDS = 300;
const WORK_REVALIDATE_SECONDS = 300;
const BLOG_REVALIDATE_SECONDS = 300;

function getEnv(key: "ARENA_BIO_CHANNEL" | "ARENA_WORK_CHANNEL" | "ARENA_BLOG_CHANNEL"): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function blockHtml(
  block:
    | ArenaTextBlock
    | ArenaMediaBlock
    | ArenaImageBlock
    | ArenaAttachmentBlock
    | ArenaLinkBlock
    | undefined,
): string {
  if (!block) return "";

  if (isTextBlock(block)) {
    // Use raw content field to preserve exact line break spacing
    if (block.content) {
      const normalized = block.content.replace(/\r\n/g, "\n");
      // Parse markdown links in raw content
      let withLinks = parseMarkdownLinks(normalized);
      // Handle double line breaks first (preserve paragraph spacing)
      withLinks = withLinks.replace(/\n\n+/g, '___DOUBLE_BR___');
      // Convert single newlines to <br />
      withLinks = withLinks.replace(/\n/g, '<br />');
      // Convert double line break placeholder to two <br /> tags
      withLinks = withLinks.replace(/___DOUBLE_BR___/g, '<br /><br />');
      return withLinks;
    }

    // Fallback to content_html if raw content is not available
    if (block.content_html) {
      return addTargetBlankToLinks(block.content_html);
    }

    return "";
  }

  if (isMediaBlock(block)) {
    const html = block.embed?.html ?? block.description_html ?? "";
    return addTargetBlankToLinks(html);
  }

  if (isAttachmentBlock(block)) {
    const html = block.description_html ?? "";
    return addTargetBlankToLinks(html);
  }

  if (isImageBlock(block)) {
    const html = block.description_html ?? "";
    return addTargetBlankToLinks(html);
  }

  if (isLinkBlock(block)) {
    const metadataDescription = getMetadataString(block.metadata, "description");
    const html = typeof block.description_html === "string" 
      ? block.description_html 
      : (metadataDescription ? escapeHtml(metadataDescription) : "");
    return typeof html === "string" ? addTargetBlankToLinks(html) : "";
  }

  return "";
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function addTargetBlankToLinks(html: string): string {
  // Add target="_blank" and rel="noopener noreferrer" to all <a> tags
  return html.replace(
    /<a(\s+)/gi,
    '<a target="_blank" rel="noopener noreferrer"$1'
  );
}

function parseMarkdownLinks(text: string): string {
  // Convert markdown links [text](url) to HTML links with target="_blank"
  return text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
  );
}

function getMetadataString(metadata: Record<string, unknown> | undefined, key: string): string | undefined {
  if (!metadata) return undefined;
  const value = metadata[key];
  return typeof value === "string" ? value : undefined;
}

function getBlockByTitle<T extends ArenaBlock>(channel: ArenaChannel, title: string, predicate?: (block: ArenaBlock) => block is T): T | undefined {
  const block = channel.contents.find((item) => item.title?.trim().toLowerCase() === title.trim().toLowerCase());
  if (!block) return undefined;
  if (!predicate) return block as T;
  return predicate(block) ? block : undefined;
}

function createBlogBaseEntry(block: ArenaBlock) {
  return {
    id: block.id,
    slug: block.slug,
    createdAt: block.created_at,
    updatedAt: block.updated_at,
    title: block.title ?? block.generated_title ?? null,
  };
}

const fetchBioChannel = cache(async () => {
  const slug = getEnv("ARENA_BIO_CHANNEL");
  return getChannel(slug, { revalidate: BIO_REVALIDATE_SECONDS });
});

const fetchWorkChannel = cache(async () => {
  const slug = getEnv("ARENA_WORK_CHANNEL");
  return getChannel(slug, { revalidate: WORK_REVALIDATE_SECONDS });
});

const fetchBlogChannel = cache(async () => {
  const slug = getEnv("ARENA_BLOG_CHANNEL");
  return getChannel(slug, { revalidate: BLOG_REVALIDATE_SECONDS });
});

export type BioContent = {
  bioHtml: string;
  detailsHtml: string;
  clientsHtml: string;
  websitesHtml: string;
  linksHtml: string;
  socialsHtml: string;
  collaboratorsHtml: string;
};

export async function getBio(): Promise<BioContent> {
  const channel = await fetchBioChannel();

  const bioBlock = getBlockByTitle<ArenaTextBlock>(channel, "Bio", isTextBlock);
  const detailsBlock = getBlockByTitle<ArenaTextBlock>(channel, "Details", isTextBlock);
  const clientsBlock = getBlockByTitle<ArenaTextBlock>(channel, "Clients", isTextBlock);
  const websitesBlock = getBlockByTitle<ArenaTextBlock>(channel, "Websites", isTextBlock);
  const linksBlock = getBlockByTitle<ArenaTextBlock>(channel, "Links", isTextBlock);
  const socialsBlock = getBlockByTitle<ArenaTextBlock>(channel, "Socials", isTextBlock);
  const collaboratorsBlock = getBlockByTitle<ArenaTextBlock>(channel, "Collaborators", isTextBlock);

  return {
    bioHtml: blockHtml(bioBlock),
    detailsHtml: blockHtml(detailsBlock),
    clientsHtml: blockHtml(clientsBlock),
    websitesHtml: blockHtml(websitesBlock),
    linksHtml: blockHtml(linksBlock),
    socialsHtml: blockHtml(socialsBlock),
    collaboratorsHtml: blockHtml(collaboratorsBlock),
  };
}

type SlideImageVariant = {
  src: string;
  width: number;
  height: number;
};

type SlidePlaceholder = {
  src: string;
  width: number;
  height: number;
};

export type WorkSlide =
  | {
      kind: "image";
      id: number;
      alt: string;
      src: string;
      width: number;
      height: number;
      variants: {
        original: SlideImageVariant;
        large?: SlideImageVariant;
        display?: SlideImageVariant;
        thumb?: SlideImageVariant;
      };
      placeholder?: SlidePlaceholder;
      captionHtml: string;
      date: string;
    }
  | {
      kind: "media";
      id: number;
      embedHtml?: string;
      attachmentUrl?: string;
      attachmentContentType?: string;
      captionHtml: string;
      title: string;
      date: string;
    };

function imageAltText(block: ArenaImageBlock): string {
  return block.title ?? block.generated_title ?? "Work image";
}

export async function getWorkSlides(): Promise<WorkSlide[]> {
  const channel = await fetchWorkChannel();

  const slides = await Promise.all(
    channel.contents
      .filter((block) => isImageBlock(block) || isMediaBlock(block) || isAttachmentBlock(block))
      .map(async (block) => {
        if (isImageBlock(block)) {
          const src = `/api/arena/image/${block.id}`;
          const originalWidth = block.image.original.width ?? 1600;
          const originalHeight = block.image.original.height ?? 900;
          const variantFrom = (
            variant: "original" | "large" | "display" | "thumb",
            fallbackWidth: number,
            fallbackHeight: number,
          ): SlideImageVariant | undefined => {
            const target =
              variant === "original"
                ? block.image.original
                : variant === "large"
                  ? block.image.large
                  : variant === "display"
                    ? block.image.display
                    : block.image.thumb;
            if (!target?.url) return undefined;
            return {
              src: `${src}?variant=${variant}`,
              width: target.width ?? fallbackWidth,
              height: target.height ?? fallbackHeight,
            };
          };

          let placeholder: SlidePlaceholder | undefined;
          // Prefer smaller variants for blur placeholder to reduce fetch time
          const placeholderSource =
            block.image.thumb?.url ??
            block.image.display?.url ??
            block.image.large?.url ??
            block.image.original.url;

          if (placeholderSource) {
            try {
              const blur = await fetchBlurData(placeholderSource);
              placeholder = {
                src: blur.dataUrl,
                width: blur.width,
                height: blur.height,
              };
            } catch (error) {
              console.error(`Failed to generate blur placeholder for block ${block.id}:`, error);
              // Continue without placeholder - image will still load
            }
          }

          return {
            kind: "image" as const,
            id: block.id,
            alt: imageAltText(block),
            src: `${src}?variant=original`,
            width: originalWidth,
            height: originalHeight,
            variants: {
              original: {
                src: `${src}?variant=original`,
                width: originalWidth,
                height: originalHeight,
              },
              large: variantFrom("large", originalWidth, originalHeight),
              display: variantFrom("display", originalWidth, originalHeight),
              thumb: variantFrom("thumb", originalWidth, originalHeight),
            },
            placeholder,
            captionHtml: blockHtml(block),
            date: block.created_at,
          };
        }

        const embedHtml = isMediaBlock(block) ? block.embed?.html ?? undefined : undefined;
        const attachmentUrl = block.attachment?.url ? `/api/arena/media/${block.id}` : undefined;
        const attachmentContentType = block.attachment?.content_type ?? undefined;

        return {
          kind: "media" as const,
          id: block.id,
          embedHtml,
          attachmentUrl,
          attachmentContentType,
          captionHtml: blockHtml(block),
          title: block.title ?? block.generated_title ?? "Media block",
          date: block.created_at,
        };
      }),
  );

  return slides;
}

type BlogImageResource = {
  src: string;
  width: number;
  height: number;
};

type BlogPlaceholder = {
  src: string;
  width: number;
  height: number;
};

type BlogLinkMetadata = {
  title: string | undefined;
  description: string | undefined;
  siteName: string | undefined;
  hostname: string | undefined;
};

type BlogBaseEntry = ReturnType<typeof createBlogBaseEntry>;

export type BlogTextEntry = BlogBaseEntry & {
  kind: "text";
  html: string;
};

export type BlogImageEntry = BlogBaseEntry & {
  kind: "image";
  image: BlogImageResource;
  alt: string;
  captionHtml: string;
  placeholder: BlogPlaceholder | undefined;
};

export type BlogMediaEntry = BlogBaseEntry & {
  kind: "media";
  embedHtml: string | undefined;
  attachmentUrl: string | undefined;
  attachmentContentType: string | undefined;
  captionHtml: string;
};

export type BlogLinkEntry = BlogBaseEntry & {
  kind: "link";
  url: string;
  captionHtml: string;
  previewImage: BlogImageResource | undefined;
  metadata: BlogLinkMetadata;
};

export type BlogEntry = BlogTextEntry | BlogImageEntry | BlogMediaEntry | BlogLinkEntry;

function resolveImageVariantKey(block: ArenaImageBlock): "display" | "large" | "original" {
  if (block.image.display?.url) return "display";
  if (block.image.large?.url) return "large";
  return "original";
}

function resolveLinkPreviewImage(block: ArenaLinkBlock): BlogImageResource | undefined {
  const candidate =
    block.image?.display ?? block.image?.large ?? block.image?.thumb ?? block.image?.original ?? null;
  if (!candidate?.url) return undefined;

  const fallbackWidth = block.image?.original?.width ?? 1200;
  const fallbackHeight = block.image?.original?.height ?? 630;

  return {
    src: candidate.url,
    width: candidate.width ?? fallbackWidth,
    height: candidate.height ?? fallbackHeight,
  };
}

export async function getBlogEntries(): Promise<BlogEntry[]> {
  const channel = await fetchBlogChannel();

  const entries = await Promise.all(
    channel.contents.map(async (block) => {
      if (isTextBlock(block)) {
        const base = createBlogBaseEntry(block);
        const html = blockHtml(block);
        if (!html || typeof html !== "string") {
          return null;
        }

        return {
          ...base,
          kind: "text" as const,
          html,
        };
      }

      if (isImageBlock(block)) {
        const base = createBlogBaseEntry(block);
        const variantKey = resolveImageVariantKey(block);
        const chosenVariant =
          variantKey === "display"
            ? block.image.display
            : variantKey === "large"
              ? block.image.large
              : block.image.original;
        const originalWidth = block.image.original.width ?? 1600;
        const originalHeight = block.image.original.height ?? 900;

        const image: BlogImageResource = {
          src: `/api/arena/image/${block.id}?variant=${variantKey}`,
          width: chosenVariant?.width ?? originalWidth,
          height: chosenVariant?.height ?? originalHeight,
        };

        let placeholder: BlogPlaceholder | undefined;
        const placeholderSource =
          block.image.thumb?.url ??
          block.image.display?.url ??
          block.image.large?.url ??
          block.image.original.url;

        if (placeholderSource) {
          try {
            const blur = await fetchBlurData(placeholderSource);
            placeholder = {
              src: blur.dataUrl,
              width: blur.width,
              height: blur.height,
            };
          } catch (error) {
            console.error(`Failed to generate blur placeholder for blog image block ${block.id}:`, error);
          }
        }

        const captionHtml = blockHtml(block);
        return {
          ...base,
          kind: "image" as const,
          image,
          alt: imageAltText(block),
          captionHtml: typeof captionHtml === "string" ? captionHtml : "",
          placeholder,
        };
      }

      if (isLinkBlock(block)) {
        const base = createBlogBaseEntry(block);
        const sourceUrl = typeof block.source?.url === "string" ? block.source.url : null;
        const sourceSource = typeof block.source?.source === "string" ? block.source.source : null;
        const url = sourceUrl ?? sourceSource ?? "";

        if (!url || typeof url !== "string") {
          return null;
        }

        const metadataTitle =
          getMetadataString(block.metadata, "title") ?? block.title ?? block.generated_title ?? undefined;
        const metadataDescription = getMetadataString(block.metadata, "description");
        const providerName = typeof block.source?.provider_name === "string" ? block.source.provider_name : null;
        const provider = typeof block.source?.provider === "string" ? block.source.provider : null;
        const metadataSiteName =
          getMetadataString(block.metadata, "site_name") ??
          providerName ??
          provider ??
          undefined;

        let hostname: string | undefined;
        if (url) {
          try {
            const parsed = new URL(url);
            hostname = parsed.hostname.replace(/^www\./, "");
          } catch {
            hostname = undefined;
          }
        }

        const captionHtml = blockHtml(block);
        return {
          ...base,
          kind: "link" as const,
          url,
          captionHtml: typeof captionHtml === "string" ? captionHtml : "",
          previewImage: resolveLinkPreviewImage(block),
          metadata: {
            title: metadataTitle,
            description: metadataDescription,
            siteName: metadataSiteName ?? hostname,
            hostname,
          },
        };
      }

      if (isMediaBlock(block) || isAttachmentBlock(block)) {
        const base = createBlogBaseEntry(block);
        const embedHtml = isMediaBlock(block) ? (typeof block.embed?.html === "string" ? block.embed.html : undefined) : undefined;
        const attachmentUrl = block.attachment?.url ? `/api/arena/media/${block.id}` : undefined;
        const attachmentContentType = typeof block.attachment?.content_type === "string" ? block.attachment.content_type : undefined;
        const captionHtml = blockHtml(block);

        return {
          ...base,
          kind: "media" as const,
          embedHtml,
          attachmentUrl,
          attachmentContentType,
          captionHtml: typeof captionHtml === "string" ? captionHtml : "",
        };
      }

      return null;
    }),
  );

  return entries.filter(Boolean) as BlogEntry[];
}

