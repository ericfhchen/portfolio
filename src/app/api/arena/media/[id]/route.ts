import { NextResponse } from "next/server";

import { getBlock, isAttachmentBlock, isMediaBlock } from "@/lib/arena";

const MEDIA_MAX_AGE = 60;
const MEDIA_STALE_WHILE_REVALIDATE = 60 * 60 * 24;

type Params = {
  id: string;
};

export async function GET(_: Request, context: { params: Promise<Params> }) {
  const { id } = await context.params;
  if (!id) {
    return new NextResponse("Missing media id.", { status: 400 });
  }

  try {
    const block = await getBlock(id);

    if (!isMediaBlock(block) && !isAttachmentBlock(block)) {
      return new NextResponse("Block is not a media attachment.", { status: 404 });
    }

    const attachment = block.attachment;

    if (!attachment?.url) {
      return new NextResponse("Block is not a media attachment.", { status: 404 });
    }

    const mediaUrl = attachment.url;
    const upstream = await fetch(mediaUrl);

    if (!upstream.ok || !upstream.body) {
      let errorBody: string | undefined;
      try {
        errorBody = await upstream.text();
      } catch (readError) {
        errorBody = readError instanceof Error ? readError.message : undefined;
      }
      console.error(
        `Failed to fetch Are.na media ${mediaUrl}: ${upstream.status} ${upstream.statusText}${
          errorBody ? ` - ${errorBody}` : ""
        }`,
      );
      return new NextResponse("Unable to fetch media.", { status: upstream.status });
    }

    const contentType = attachment.content_type ?? upstream.headers.get("content-type") ?? "application/octet-stream";
    const contentLength = upstream.headers.get("content-length") ?? undefined;

    const headers = new Headers({
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${MEDIA_MAX_AGE}, stale-while-revalidate=${MEDIA_STALE_WHILE_REVALIDATE}`,
    });

    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    return new NextResponse(upstream.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(message, { status: 500 });
  }
}


