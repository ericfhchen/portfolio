import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, tag } = body;

    // Verify the secret token to prevent unauthorized revalidation
    const revalidateSecret = process.env.REVALIDATE_SECRET;
    if (!revalidateSecret) {
      return NextResponse.json(
        { error: "Revalidation not configured. Set REVALIDATE_SECRET in environment variables." },
        { status: 500 }
      );
    }

    if (secret !== revalidateSecret) {
      return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
    }

    if (!tag) {
      return NextResponse.json({ error: "Missing tag parameter" }, { status: 400 });
    }

    // Revalidate the specific cache tag
    // In Next.js 16, revalidateTag requires a second argument (cache profile)
    revalidateTag(tag, "max");

    return NextResponse.json({
      revalidated: true,
      tag,
      now: Date.now(),
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      { error: "Error revalidating", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

// Optional: Add a GET endpoint for easier testing
export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");
  const tag = request.nextUrl.searchParams.get("tag");

  // Verify the secret token
  const revalidateSecret = process.env.REVALIDATE_SECRET;
  if (!revalidateSecret) {
    return NextResponse.json(
      { error: "Revalidation not configured. Set REVALIDATE_SECRET in environment variables." },
      { status: 500 }
    );
  }

  if (secret !== revalidateSecret) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  if (!tag) {
    return NextResponse.json({ error: "Missing tag parameter" }, { status: 400 });
  }

  try {
    // Revalidate the specific cache tag
    // In Next.js 16, revalidateTag requires a second argument (cache profile)
    revalidateTag(tag, "max");

    return NextResponse.json({
      revalidated: true,
      tag,
      now: Date.now(),
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      { error: "Error revalidating", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

