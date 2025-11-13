import { NextResponse } from "next/server";

import { getBlock, isImageBlock } from "@/lib/arena";
import { generateBlurData } from "@/lib/blur";

const IMAGE_MAX_AGE = 60;
const IMAGE_STALE_WHILE_REVALIDATE = 60 * 60 * 24;

type Params = {
  id: string;
};

const IMAGE_VARIANTS = ["original", "large", "display", "thumb"] as const;
type ImageVariantKey = (typeof IMAGE_VARIANTS)[number];

function resolveVariantKey(value: string | null | undefined): ImageVariantKey {
  if (!value) return "original";
  if (IMAGE_VARIANTS.includes(value as ImageVariantKey)) {
    return value as ImageVariantKey;
  }
  return "original";
}

export async function GET(request: Request, context: { params: Promise<Params> }) {
  const { id } = await context.params;
  if (!id) {
    return new NextResponse("Missing image id.", { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const variantKey = resolveVariantKey(url.searchParams.get("variant"));
    const block = await getBlock(id);

    if (!isImageBlock(block)) {
      return new NextResponse("Block is not an image.", { status: 404 });
    }

    const variant =
      variantKey === "original"
        ? block.image.original
        : variantKey === "large"
          ? block.image.large
          : variantKey === "display"
            ? block.image.display
            : block.image.thumb;

    const chosenVariant = variant?.url ? variant : block.image.original;
    const imageUrl = chosenVariant.url;
    const upstream = await fetch(imageUrl);

    if (!upstream.ok) {
      let errorBody: string | undefined;
      try {
        errorBody = await upstream.text();
      } catch (readError) {
        errorBody = readError instanceof Error ? readError.message : undefined;
      }
      console.error(
        `Failed to fetch Are.na image ${imageUrl}: ${upstream.status} ${upstream.statusText}${
          errorBody ? ` - ${errorBody}` : ""
        }`,
      );
      return new NextResponse("Unable to fetch image.", { status: upstream.status });
    }

    const contentType = chosenVariant.content_type ?? upstream.headers.get("content-type") ?? "application/octet-stream";

    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${IMAGE_MAX_AGE}, stale-while-revalidate=${IMAGE_STALE_WHILE_REVALIDATE}`,
    });

    if (url.searchParams.get("blur") === "1") {
      const arrayBuffer = await upstream.arrayBuffer();
      const { dataUrl, width, height } = await generateBlurData(arrayBuffer);
      const json = JSON.stringify({ blurData: dataUrl, width, height });
      headers.set("Content-Type", "application/json");
      headers.delete("Content-Length");
      return new NextResponse(json, { status: 200, headers });
    }

    const arrayBuffer = await upstream.arrayBuffer();
    headers.set("Content-Length", String(arrayBuffer.byteLength));

    return new NextResponse(arrayBuffer, { status: 200, headers });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(message, { status: 500 });
  }
}

