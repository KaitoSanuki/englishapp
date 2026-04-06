const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const OPENAI_TEXT_MODEL = process.env.OPENAI_TEXT_MODEL ?? "gpt-4o-mini";
const OPENAI_SPEECH_MODEL = process.env.OPENAI_SPEECH_MODEL ?? "gpt-4o-mini-tts";
const OPENAI_TRANSCRIBE_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL ?? "gpt-4o-mini-transcribe";

const requireKey = () => {
  if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
};

export const openAiVoices = {
  female: ["alloy", "sage", "coral"],
  male: ["verse", "ash", "ballad"]
} as const;

const extractJson = (text: string) => {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? text;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start >= 0 && end >= 0) {
    return fenced.slice(start, end + 1);
  }
  throw new Error("Model did not return JSON.");
};

export const callOpenAIJson = async <T>(args: {
  feature: string;
  promptJa: string;
  temperature?: number;
}) => {
  requireKey();
  const requestBody = {
    model: OPENAI_TEXT_MODEL,
    temperature: args.temperature ?? 0.7,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a precise educational content generator. Always return valid JSON only."
      },
      {
        role: "user",
        content: args.promptJa
      }
    ]
  };

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  const raw = await res.json();
  if (!res.ok) {
    throw new Error(raw?.error?.message || `${args.feature} generation failed`);
  }

  const content = raw?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error(`${args.feature} generation returned empty content`);
  }

  const parsed = JSON.parse(extractJson(content)) as T;
  return {
    parsed,
    debug: {
      feature: args.feature,
      promptJa: args.promptJa,
      requestPayload: requestBody,
      rawResponse: raw,
      parsedResponse: parsed
    }
  };
};

export const synthesizeSpeech = async (text: string, voice: string) => {
  requireKey();
  const requestBody = {
    model: OPENAI_SPEECH_MODEL,
    voice,
    input: text,
    format: "mp3"
  };

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  if (!res.ok) {
    const reason = await res.text();
    throw new Error(reason || "Speech generation failed");
  }

  return Buffer.from(await res.arrayBuffer());
};

export const transcribeAudio = async (file: File) => {
  requireKey();
  const form = new FormData();
  form.append("file", file);
  form.append("model", OPENAI_TRANSCRIBE_MODEL);
  form.append("response_format", "json");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: form
  });

  const raw = await res.json();
  if (!res.ok) {
    throw new Error(raw?.error?.message || "Transcription failed");
  }

  return {
    text: raw?.text ?? "",
    raw
  };
};

