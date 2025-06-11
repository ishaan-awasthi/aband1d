import { NextRequest, NextResponse } from "next/server";
import { runClassificationPipeline } from "@/lib/classify";

export async function POST(req: NextRequest) {
  try {
    const { location, radius } = await req.json();

    if (!location || !radius) {
      return NextResponse.json({ error: "Missing location or radius" }, { status: 400 });
    }

    const predictions = await runClassificationPipeline(location, radius);
    return NextResponse.json({ predictions });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("❌ classify route error:", message);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
