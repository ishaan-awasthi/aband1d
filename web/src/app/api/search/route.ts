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
  } catch (err: any) {
    console.error("❌ classify route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
