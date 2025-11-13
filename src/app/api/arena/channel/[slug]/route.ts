import { NextRequest, NextResponse } from "next/server";

import { getChannel } from "@/lib/arena";

const DEFAULT_REVALIDATE_SECONDS = 300;

type Params = {
  slug: string;
};

export async function GET(request: NextRequest, { params }: { params: Promise<Params> }) {
  const { slug } = await params;
  if (!slug) {
    return NextResponse.json({ error: "Missing channel slug." }, { status: 400 });
  }

  const revalidateParam = request.nextUrl.searchParams.get("revalidate");
  const revalidate = revalidateParam ? Number.parseInt(revalidateParam, 10) : DEFAULT_REVALIDATE_SECONDS;

  try {
    const channel = await getChannel(slug, { revalidate: Number.isFinite(revalidate) ? revalidate : DEFAULT_REVALIDATE_SECONDS });

    return NextResponse.json(channel, {
      headers: {
        "Cache-Control": `public, max-age=${DEFAULT_REVALIDATE_SECONDS}, stale-while-revalidate=${86400}`,
      },
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("401") || message.includes("403") ? 401 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}

