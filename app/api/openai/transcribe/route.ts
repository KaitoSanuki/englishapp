import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/server/openai";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "audio file is required" }, { status: 400 });
    }

    const result = await transcribeAudio(file);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Transcription failed" }, { status: 500 });
  }
}

