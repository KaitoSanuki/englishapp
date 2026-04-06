import { NextRequest, NextResponse } from "next/server";
import { synthesizeSpeech } from "@/lib/server/openai";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { text?: string; voice?: string };
    const text = body.text?.trim() ?? "";
    const voice = body.voice?.trim() ?? "alloy";
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const audio = await synthesizeSpeech(text, voice);
    return new NextResponse(audio, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Speech generation failed" }, { status: 500 });
  }
}

