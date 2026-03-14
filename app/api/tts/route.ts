import textToSpeech from "@google-cloud/text-to-speech";
import { NextRequest, NextResponse } from "next/server";

type TtsBody = {
  text?: string;
  speakingRate?: number;
};

const getClient = () => {
  const raw = process.env.GOOGLE_TTS_CREDENTIALS_JSON;
  if (!raw) {
    throw new Error("Missing GOOGLE_TTS_CREDENTIALS_JSON");
  }
  const credentials = JSON.parse(raw);
  return new textToSpeech.TextToSpeechClient({ credentials });
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TtsBody;
    const text = body.text?.trim() ?? "";
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const speakingRate = typeof body.speakingRate === "number" && body.speakingRate > 0 ? body.speakingRate : 1;
    const client = getClient();
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: "en-US",
        ssmlGender: "FEMALE"
      },
      audioConfig: {
        audioEncoding: "MP3",
        speakingRate
      }
    });

    if (!response.audioContent) {
      return NextResponse.json({ error: "No audio generated" }, { status: 500 });
    }

    const buffer = Buffer.isBuffer(response.audioContent) ? response.audioContent : Buffer.from(response.audioContent as Uint8Array);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TTS generation failed" },
      { status: 500 }
    );
  }
}

