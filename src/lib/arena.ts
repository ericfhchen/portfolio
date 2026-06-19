import "server-only";

const ARENA_API_BASE = "https://api.are.na/v3";
// Build-time only - no runtime revalidation
const DEFAULT_REVALIDATE = false;
// v3 caps page size at 100 (v2 allowed 200). Paginate to stay correct as channels grow.
const PER_PAGE = 100;

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
  // v3 ships a blurhash string per image; used to build blur placeholders
  // at build time without downloading the image (see lib/blur.ts).
  blurhash?: string | null;
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
  image?: ArenaImage | null;
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
  revalidate?: number | false;
};

type NextInit = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

/* -------------------------------------------------------------------------- */
/* v3 raw response shapes (only the fields we consume)                        */
/* -------------------------------------------------------------------------- */

interface V3MarkdownContent {
  markdown?: string | null;
  html?: string | null;
  plain?: string | null;
}

interface V3ImageVariant {
  src?: string | null;
  src_2x?: string | null;
  width?: number | null;
  height?: number | null;
}

interface V3BlockImage {
  src?: string | null;
  width?: number | null;
  height?: number | null;
  content_type?: string | null;
  file_size?: number | null;
  blurhash?: string | null;
  alt_text?: string | null;
  small?: V3ImageVariant | null;
  medium?: V3ImageVariant | null;
  large?: V3ImageVariant | null;
  square?: V3ImageVariant | null;
}

interface V3Embed {
  url?: string | null;
  type?: string | null;
  html?: string | null;
  width?: number | null;
  height?: number | null;
}

interface V3Attachment {
  url?: string | null;
  content_type?: string | null;
  file_size?: number | null;
  filename?: string | null;
  file_extension?: string | null;
}

interface V3Source {
  url?: string | null;
  title?: string | null;
  provider?: { name?: string | null; url?: string | null } | null;
}

interface V3Block {
  id: number;
  type: "Text" | "Image" | "Link" | "Attachment" | "Embed" | "PendingBlock" | string;
  base_type?: string;
  title?: string | null;
  created_at: string;
  updated_at: string;
  description?: V3MarkdownContent | null;
  content?: V3MarkdownContent | null;
  metadata?: Record<string, unknown> | null;
  source?: V3Source | null;
  image?: V3BlockImage | null;
  embed?: V3Embed | null;
  attachment?: V3Attachment | null;
}

interface V3Channel {
  id: number;
  slug: string;
  title: string;
  visibility?: "public" | "private" | "closed";
  created_at: string;
  updated_at: string;
  counts?: { contents?: number };
}

interface V3Meta {
  current_page: number;
  total_pages: number;
  has_more_pages: boolean;
  next_page: number | null;
}

interface V3ContentsResponse {
  data: V3Block[];
  meta: V3Meta;
}

/* -------------------------------------------------------------------------- */
/* fetch                                                                      */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* v3 -> internal normalization                                               */
/*                                                                            */
/* The rest of the app (content.ts, components) consumes the v2-shaped types  */
/* above. We map v3 responses onto those shapes here so the migration is      */
/* contained to this file, with one addition: image.blurhash.                 */
/* -------------------------------------------------------------------------- */

function variant(v: V3ImageVariant | null | undefined): ArenaImageVariant | undefined {
  if (!v?.src) return undefined;
  return {
    url: v.src,
    width: v.width ?? undefined,
    height: v.height ?? undefined,
  };
}

function normalizeImage(image: V3BlockImage | null | undefined): ArenaImage | null {
  if (!image?.src) return null;
  return {
    original: {
      url: image.src,
      width: image.width ?? undefined,
      height: image.height ?? undefined,
      content_type: image.content_type ?? undefined,
      file_size: image.file_size ?? undefined,
    },
    // Map v3 variants (small/medium/large/square) onto the names the app
    // already understands (thumb/display/large). "original" stays full-res.
    large: variant(image.large),
    display: variant(image.medium),
    thumb: variant(image.small),
    blurhash: image.blurhash ?? null,
  };
}

function normalizeBlock(b: V3Block): ArenaBlock {
  const base: ArenaBaseBlock = {
    id: b.id,
    // v3 blocks have no slug; synthesize a stable one from the id.
    slug: String(b.id),
    title: b.title ?? null,
    created_at: b.created_at,
    updated_at: b.updated_at,
    class: b.type,
    description_html: b.description?.html ?? null,
    generated_title: null,
    metadata: (b.metadata ?? undefined) as Record<string, unknown> | undefined,
    source: b.source?.url ? { url: b.source.url } : null,
  };

  switch (b.type) {
    case "Text":
      return {
        ...base,
        class: "Text",
        content: b.content?.markdown ?? null,
        content_html: b.content?.html ?? null,
      } satisfies ArenaTextBlock;

    case "Image": {
      const image = normalizeImage(b.image);
      if (!image) return base; // image with no src - treat as generic block
      return { ...base, class: "Image", image } satisfies ArenaImageBlock;
    }

    case "Link":
      return {
        ...base,
        class: "Link",
        image: normalizeImage(b.image),
        // content.ts reads link metadata from `metadata` and `source`.
        // v3 keeps title/provider on `source`, so synthesize the fields it expects.
        source: {
          url: b.source?.url ?? undefined,
          source: b.source?.url ?? undefined,
          provider_name: b.source?.provider?.name ?? undefined,
          provider: b.source?.provider?.name ?? undefined,
        },
        metadata: {
          ...(b.metadata ?? {}),
          title: b.source?.title ?? b.title ?? undefined,
          description: b.description?.plain ?? undefined,
          site_name: b.source?.provider?.name ?? undefined,
        },
        // Prefer the link description as caption HTML when present.
        description_html: b.description?.html ?? b.content?.html ?? null,
      } satisfies ArenaLinkBlock;

    case "Embed":
      return {
        ...base,
        class: "Media",
        embed: b.embed
          ? {
              html: b.embed.html ?? null,
              type: b.embed.type ?? null,
              width: b.embed.width ?? null,
              height: b.embed.height ?? null,
            }
          : null,
        attachment: b.attachment
          ? {
              url: b.attachment.url ?? null,
              content_type: b.attachment.content_type ?? null,
              file_size: b.attachment.file_size ?? null,
            }
          : null,
      } satisfies ArenaMediaBlock;

    case "Attachment":
      return {
        ...base,
        class: "Attachment",
        attachment: b.attachment
          ? {
              url: b.attachment.url ?? null,
              content_type: b.attachment.content_type ?? null,
              file_size: b.attachment.file_size ?? null,
            }
          : null,
        image: normalizeImage(b.image),
      } satisfies ArenaAttachmentBlock;

    default:
      return base;
  }
}

function normalizeChannel(channel: V3Channel, contents: ArenaBlock[]): ArenaChannel {
  return {
    id: channel.id,
    slug: channel.slug,
    title: channel.title,
    status: channel.visibility === "public" ? "public" : "private",
    created_at: channel.created_at,
    updated_at: channel.updated_at,
    length: channel.counts?.contents ?? contents.length,
    contents,
  };
}

/* -------------------------------------------------------------------------- */
/* public API                                                                 */
/* -------------------------------------------------------------------------- */

export async function getChannel(slug: string, options: FetchOptions = {}): Promise<ArenaChannel> {
  const revalidate = options.revalidate ?? DEFAULT_REVALIDATE;
  const next = { revalidate, tags: [`arena-channel-${slug}`] };

  // Channel metadata (title, visibility, counts).
  const channel = await arenaFetch<V3Channel>(`/channels/${slug}`, { next });

  // Contents are a separate, paginated endpoint in v3.
  const blocks: ArenaBlock[] = [];
  let page = 1;
  // Safety bound: counts.contents / PER_PAGE, plus a margin.
  const maxPages = Math.max(1, Math.ceil((channel.counts?.contents ?? PER_PAGE) / PER_PAGE) + 1);

  while (page <= maxPages) {
    const res = await arenaFetch<V3ContentsResponse>(
      `/channels/${slug}/contents?per=${PER_PAGE}&page=${page}`,
      { next },
    );
    blocks.push(...res.data.map(normalizeBlock));
    if (!res.meta?.has_more_pages || !res.meta?.next_page) break;
    page = res.meta.next_page;
  }

  return normalizeChannel(channel, blocks);
}

export async function getBlock(id: string, options: FetchOptions = {}): Promise<ArenaBlock> {
  const block = await arenaFetch<V3Block>(`/blocks/${id}`, {
    next: options.revalidate ? { revalidate: options.revalidate } : undefined,
  });
  return normalizeBlock(block);
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
