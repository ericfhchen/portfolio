import "server-only";

import sharp from "sharp";

const PLACEHOLDER_WIDTH = 16;
const PLACEHOLDER_QUALITY = 50;

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

