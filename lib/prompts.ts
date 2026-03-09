import { CEFR } from "@/lib/types";

export const step2Prompt = (cefr: CEFR, topic: string, lang: "en" | "ja") =>
  lang === "ja"
    ? `以下のテーマで、CEFR ${cefr} 向けの1分スピーチ台本を英語で作ってください。

条件:
- 短文中心
- 口語
- 難語は避ける
- 出力は英語のみ

テーマ:
${topic}`
    : `Create a 1-minute English speech script for CEFR ${cefr} on this topic.

Requirements:
- Short conversational sentences
- Spoken style
- Avoid difficult vocabulary
- Output in English only

Topic:
${topic}`;

export const step5Prompt = (cefr: CEFR, english: string, lang: "en" | "ja") =>
  lang === "ja"
    ? `以下は私が即興で話した英語です。CEFR ${cefr} 向けに添削してください。

要件:
1) 原文 → 修正版
2) 重要修正3点
3) 言い換え2つ

英語:
${english}`
    : `This is my improvised English speaking output. Please correct it for CEFR ${cefr}.

Requirements:
1) original -> corrected pairs
2) top 3 correction points
3) 2 paraphrases

Text:
${english}`;

export const step6Prompt = (cefr: CEFR, scene: string, goal: string, durationMin: number, lang: "en" | "ja") =>
  lang === "ja"
    ? `英語ロールプレイをします。あなたは会話相手です。

状況: ${scene}
ゴール: ${goal}
条件:
- CEFR ${cefr} 程度
- 1ターン短く
- 私が "stop" と言うまで続ける
- 会話中は添削しない

まず開始してください。（想定 ${durationMin}分）`
    : `Let's do an English roleplay. You are my partner.

Scene: ${scene}
Goal: ${goal}
Rules:
- Around CEFR ${cefr}
- Keep turns short
- Continue until I say "stop"
- No correction during roleplay

Start now. (Target ${durationMin} min)`;

export const step7Prompt = (cefr: CEFR, transcript: string, lang: "en" | "ja") =>
  lang === "ja"
    ? `以下はロールプレイの文字起こしです。User発言中心に CEFR ${cefr} 向けで修正してください。

要件:
1) 原文 → 修正版
2) 修正版のみでA/B会話
3) 使える表現10個

文字起こし:
${transcript}`
    : `Below is a roleplay transcript. Focus on User lines and correct for CEFR ${cefr}.

Requirements:
1) original -> corrected
2) natural A/B dialogue with corrected lines
3) 10 useful expressions

Transcript:
${transcript}`;
