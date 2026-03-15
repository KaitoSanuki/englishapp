import textToSpeech from "@google-cloud/text-to-speech";
import { NextRequest, NextResponse } from "next/server";

type TtsBody = {
  text?: string;
  speakingRate?: number;
  model?: "standard" | "wavenet";
  provider?: "google" | "elevenlabs";
};

const getClient = () => {
  const raw = process.env.GOOGLE_TTS_CREDENTIALS_JSON;
  if (!raw) {
    throw new Error("Missing GOOGLE_TTS_CREDENTIALS_JSON");
  }
  const credentials = JSON.parse(raw);
  return new textToSpeech.TextToSpeechClient({ credentials });
};

const getSupabaseConfig = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return { supabaseUrl, anonKey };
};

const getBearerToken = (req: NextRequest) => {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) return "";
  return authHeader.slice("Bearer ".length).trim();
};

const getSupabaseUser = async (token: string) => {
  const { supabaseUrl, anonKey } = getSupabaseConfig();
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { id?: string; email?: string };
  if (!data.id) return null;
  return data;
};

const getUserPlan = async (userId: string, token: string) => {
  const { supabaseUrl, anonKey } = getSupabaseConfig();
  const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=plan&limit=1`, {
    method: "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) return "free";
  const rows = (await res.json()) as Array<{ plan?: "free" | "pro" }>;
  return rows[0]?.plan ?? "free";
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TtsBody;
    const text = body.text?.trim() ?? "";
    if (!text) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }

    const speakingRate = typeof body.speakingRate === "number" && body.speakingRate > 0 ? body.speakingRate : 1;
    const provider = body.provider === "elevenlabs" ? "elevenlabs" : "google";

    if (provider === "elevenlabs") {
      const token = getBearerToken(req);
      if (!token) {
        return NextResponse.json({ error: "ElevenLabs is available for Pro users only. Please sign in." }, { status: 401 });
      }
      const user = await getSupabaseUser(token);
      if (!user?.id) {
        return NextResponse.json({ error: "Invalid session token." }, { status: 401 });
      }
      const plan = await getUserPlan(user.id, token);
      if (plan !== "pro") {
        return NextResponse.json({ error: "ElevenLabs is available for Pro users only." }, { status: 403 });
      }

      const apiKey = process.env.ELEVENLABS_API_KEY;
      const voiceId = process.env.ELEVENLABS_VOICE_ID || "EXAVITQu4vr4xnSDxMaL";
      const modelId = process.env.ELEVENLABS_MODEL_ID || "eleven_turbo_v2";
      if (!apiKey) {
        return NextResponse.json({ error: "Missing ELEVENLABS_API_KEY" }, { status: 500 });
      }
      const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg"
        },
        body: JSON.stringify({
          text,
          model_id: modelId,
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.8
          }
        })
      });
      if (!elevenRes.ok) {
        const reason = await elevenRes.text();
        return NextResponse.json({ error: `ElevenLabs failed: ${reason}` }, { status: 500 });
      }
      const audioBuffer = Buffer.from(await elevenRes.arrayBuffer());
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store"
        }
      });
    }

    const model = body.model === "wavenet" ? "wavenet" : "standard";
    const voiceName = model === "wavenet" ? "en-US-Wavenet-C" : "en-US-Standard-C";
    const client = getClient();
    const [response] = await client.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode: "en-US",
        name: voiceName
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
