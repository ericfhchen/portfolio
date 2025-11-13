import "server-only";

import { cache } from "react";

import {
  ArenaAttachmentBlock,
  ArenaBlock,
  ArenaChannel,
  ArenaImageBlock,
  ArenaMediaBlock,
  ArenaTextBlock,
  getChannel,
  isAttachmentBlock,
  isImageBlock,
  isMediaBlock,
  isTextBlock,
} from "./arena";
import { fetchBlurData } from "./blur";

const BIO_REVALIDATE_SECONDS = 300;
const WORK_REVALIDATE_SECONDS = 300;

function getEnv(key: "ARENA_BIO_CHANNEL" | "ARENA_WORK_CHANNEL"): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function blockHtml(block: ArenaTextBlock | ArenaMediaBlock | ArenaImageBlock | ArenaAttachmentBlock | undefined): string {
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

function getBlockByTitle<T extends ArenaBlock>(channel: ArenaChannel, title: string, predicate?: (block: ArenaBlock) => block is T): T | undefined {
  const block = channel.contents.find((item) => item.title?.trim().toLowerCase() === title.trim().toLowerCase());
  if (!block) return undefined;
  if (!predicate) return block as T;
  return predicate(block) ? block : undefined;
}

const fetchBioChannel = cache(async () => {
  const slug = getEnv("ARENA_BIO_CHANNEL");
  return getChannel(slug, { revalidate: BIO_REVALIDATE_SECONDS });
});

const fetchWorkChannel = cache(async () => {
  const slug = getEnv("ARENA_WORK_CHANNEL");
  return getChannel(slug, { revalidate: WORK_REVALIDATE_SECONDS });
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

