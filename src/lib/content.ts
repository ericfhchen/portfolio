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
    if (block.content) {
      const normalized = block.content.replace(/\r\n/g, "\n");
      const escaped = escapeHtml(normalized);
      return escaped.replace(/\n/g, "<br />");
    }

    if (block.content_html) {
      const normalizedHtml = block.content_html.replace(/\r\n/g, "\n");
      return normalizedHtml.replace(/\n/g, "<br />");
    }

    return "";
  }

  if (isMediaBlock(block)) {
    return block.embed?.html ?? block.description_html ?? "";
  }

  if (isAttachmentBlock(block)) {
    return block.description_html ?? "";
  }

  if (isImageBlock(block)) {
    return block.description_html ?? "";
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

  console.log(
    "work channel blocks",
    channel.contents.map((block) => ({
      id: block.id,
      class: block.class,
      hasEmbed: "embed" in block && !!block.embed?.html,
      hasAttachment: "attachment" in block && !!block.attachment?.url,
    })),
  );

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

