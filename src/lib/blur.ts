import "server-only";

import { decode } from "blurhash";
import sharp from "sharp";

const PLACEHOLDER_WIDTH = 16;
const PLACEHOLDER_QUALITY = 50;

// Blurhash is decoded to a tiny raster before being upscaled by the browser,
// so a small grid is plenty and keeps the data URL small.
const BLURHASH_DECODE_WIDTH = 32;

type BlurResult = {
  dataUrl: string;
  width: number;
  height: number;
};

export async function generateBlurData(buffer: ArrayBuffer): Promise<BlurResult> {
  const image = sharp(Buffer.from(buffer));
  const metadata = await image.metadata();

  const width = metadata.width ?? PLACEHOLDER_WIDTH;
  const height = metadata.height ?? PLACEHOLDER_WIDTH;
  const ratio = width > 0 ? height / width : 1;
  const placeholderHeight = Math.max(1, Math.round(PLACEHOLDER_WIDTH * ratio));

  const resized = await image
    .resize(PLACEHOLDER_WIDTH, placeholderHeight, { fit: "cover" })
    .webp({ quality: PLACEHOLDER_QUALITY })
    .toBuffer();

  return {
    dataUrl: `data:image/webp;base64,${resized.toString("base64")}`,
    width,
    height,
  };
}

export async function fetchBlurData(url: string): Promise<BlurResult> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch blur data for ${url}: ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return generateBlurData(buffer);
}

/**
 * Build a blur placeholder from an Are.na v3 `blurhash` string — no network
 * fetch required. The returned `width`/`height` carry the original image's
 * dimensions so callers can preserve aspect ratio.
 */
export async function blurDataFromHash(
  hash: string,
  originalWidth: number,
  originalHeight: number,
): Promise<BlurResult> {
  const ratio = originalWidth > 0 ? originalHeight / originalWidth : 1;
  const decodeHeight = Math.max(1, Math.round(BLURHASH_DECODE_WIDTH * ratio));

  // decode() returns RGBA pixels (Uint8ClampedArray, length w*h*4).
  const pixels = decode(hash, BLURHASH_DECODE_WIDTH, decodeHeight);

  const webp = await sharp(Buffer.from(pixels), {
    raw: { width: BLURHASH_DECODE_WIDTH, height: decodeHeight, channels: 4 },
  })
    .webp({ quality: PLACEHOLDER_QUALITY })
    .toBuffer();

  return {
    dataUrl: `data:image/webp;base64,${webp.toString("base64")}`,
    width: originalWidth,
    height: originalHeight,
  };
}

