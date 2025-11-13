import "server-only";

const ARENA_API_BASE = "https://api.are.na/v2";
const DEFAULT_REVALIDATE = 60;

interface ArenaLinks {
  [key: string]: string | undefined;
}

interface ArenaImageVariant {
  url: string;
  file_size?: number;
  width?: number;
  height?: number;
  content_type?: string;
}

interface ArenaImage {
  original: ArenaImageVariant;
  large?: ArenaImageVariant;
  display?: ArenaImageVariant;
  thumb?: ArenaImageVariant;
}

interface ArenaEmbed {
  html?: string | null;
  type?: string | null;
  width?: number | null;
  height?: number | null;
}

interface ArenaAttachment {
  content_type?: string | null;
  file_size?: number | null;
  url?: string | null;
}

export interface ArenaAttachmentBlock extends ArenaBaseBlock {
  class: "Attachment";
  attachment?: ArenaAttachment | null;
}

export interface ArenaBaseBlock {
  id: number;
  slug: string;
  title: string | null;
  created_at: string;
  updated_at: string;
  class: string;
  description_html?: string | null;
  generated_title?: string | null;
  metadata?: Record<string, unknown>;
  source?: ArenaLinks | null;
}

export interface ArenaTextBlock extends ArenaBaseBlock {
  class: "Text";
  content_html?: string | null;
  content?: string | null;
}

export interface ArenaImageBlock extends ArenaBaseBlock {
  class: "Image";
  image: ArenaImage;
}

export interface ArenaMediaBlock extends ArenaBaseBlock {
  class: "Media";
  embed?: ArenaEmbed | null;
  attachment?: ArenaAttachment | null;
}

export interface ArenaLinkBlock extends ArenaBaseBlock {
  class: "Link";
  image?: ArenaImage | null;
}

export type ArenaBlock =
  | ArenaTextBlock
  | ArenaImageBlock
  | ArenaMediaBlock
  | ArenaAttachmentBlock
  | ArenaLinkBlock
  | ArenaBaseBlock;

export interface ArenaChannel {
  id: number;
  slug: string;
  title: string;
  status: "public" | "private";
  created_at: string;
  updated_at: string;
  length: number;
  contents: ArenaBlock[];
}

type FetchOptions = {
  revalidate?: number;
};

type NextInit = RequestInit & {
  next?: {
    revalidate?: number;
    tags?: string[];
  };
};

async function arenaFetch<T>(path: string, init?: NextInit) {
  const token = process.env.ARENA_TOKEN;

  if (!token) {
    throw new Error("Missing ARENA_TOKEN environment variable.");
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${ARENA_API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(`Are.na request failed (${response.status}): ${bodyText}`);
  }

  return (await response.json()) as T;
}

export async function getChannel(slug: string, options: FetchOptions = {}): Promise<ArenaChannel> {
  return arenaFetch<ArenaChannel>(`/channels/${slug}?per=200`, {
    next: { 
      revalidate: options.revalidate ?? DEFAULT_REVALIDATE,
      tags: [`arena-channel-${slug}`],
    },
  });
}

export async function getBlock(id: string, options: FetchOptions = {}): Promise<ArenaBlock> {
  return arenaFetch<ArenaBlock>(`/blocks/${id}`, {
    next: options.revalidate ? { revalidate: options.revalidate } : undefined,
  });
}

export function isTextBlock(block: ArenaBlock): block is ArenaTextBlock {
  return block.class === "Text";
}

export function isImageBlock(block: ArenaBlock): block is ArenaImageBlock {
  return block.class === "Image" && typeof block === "object" && "image" in block && !!block.image?.original?.url;
}

export function isMediaBlock(block: ArenaBlock): block is ArenaMediaBlock {
  return block.class === "Media";
}

export function isAttachmentBlock(block: ArenaBlock): block is ArenaAttachmentBlock {
  return block.class === "Attachment" && typeof block === "object" && "attachment" in block && !!block.attachment?.url;
}

export function isLinkBlock(block: ArenaBlock): block is ArenaLinkBlock {
  return block.class === "Link";
}

