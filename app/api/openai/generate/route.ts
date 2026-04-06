import { NextRequest, NextResponse } from "next/server";
import {
  buildExternalChatPrompt,
  buildPhrasePromptJa,
  buildPodcastPromptJa,
  buildRetellingCorrectionPromptJa,
  buildRetellingKeywordsPromptJa,
  buildSpeechPromptJa
} from "@/lib/prompts";
import { callOpenAIJson } from "@/lib/server/openai";
import { CEFR, PhraseBankItem, PodcastVoiceGender } from "@/lib/types";

type Body =
  | { task: "speech"; theme: string; note: string; cefr: CEFR }
  | { task: "phrases"; theme: string; speechScript: string; cefr: CEFR; count: number; candidates: PhraseBankItem[] }
  | { task: "podcast"; theme: string; note: string; speechScript: string; dayIndex: number; previousTitle?: string; userVoiceGender: PodcastVoiceGender }
  | { task: "retell_keywords"; sourceText: string }
  | { task: "retell_correction"; sourceText: string; transcript: string; cefr: CEFR }
  | { task: "external_chat"; theme: string; speechScript: string; podcastTitle?: string; dayIndex: 6 | 7 };

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;

    if (body.task === "external_chat") {
      const promptText = buildExternalChatPrompt(body);
      return NextResponse.json({
        data: { promptText },
        debug: {
          feature: "external_chat",
          promptJa: promptText,
          requestPayload: body,
          rawResponse: { local: true },
          parsedResponse: { promptText }
        }
      });
    }

    if (body.task === "speech") {
      const promptJa = buildSpeechPromptJa(body.theme, body.note, body.cefr);
      const result = await callOpenAIJson<{ title: string; script: string; sentences: string[] }>({ feature: "speech", promptJa });
      return NextResponse.json({ data: result.parsed, debug: result.debug });
    }

    if (body.task === "phrases") {
      const promptJa = buildPhrasePromptJa(body);
      const result = await callOpenAIJson<{ items: Array<{ bankId: string; original: string; personalized: string; translation: string }> }>({
        feature: "phrases",
        promptJa
      });
      return NextResponse.json({ data: result.parsed, debug: result.debug });
    }

    if (body.task === "podcast") {
      const promptJa = buildPodcastPromptJa(body);
      const result = await callOpenAIJson<{ title: string; turns: Array<{ speaker: "Partner" | "User"; text: string }> }>({
        feature: "podcast",
        promptJa,
        temperature: 0.8
      });
      return NextResponse.json({ data: result.parsed, debug: result.debug });
    }

    if (body.task === "retell_keywords") {
      const promptJa = buildRetellingKeywordsPromptJa(body.sourceText);
      const result = await callOpenAIJson<{ lines: Array<{ sourceText: string; keywords: string[] }> }>({ feature: "retell_keywords", promptJa });
      return NextResponse.json({ data: result.parsed, debug: result.debug });
    }

    if (body.task === "retell_correction") {
      const promptJa = buildRetellingCorrectionPromptJa(body.sourceText, body.transcript, body.cefr);
      const result = await callOpenAIJson<{ correctedText: string; sentences: string[] }>({ feature: "retell_correction", promptJa });
      return NextResponse.json({ data: result.parsed, debug: result.debug });
    }

    return NextResponse.json({ error: "Unknown task" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Generation failed" }, { status: 500 });
  }
}

