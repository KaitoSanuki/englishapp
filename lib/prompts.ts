import { CEFR } from "@/lib/types";

const header = (lang: "en" | "ja", en: string, ja: string) => (lang === "ja" ? ja : en);

export const step2Prompt = (cefr: CEFR, topic: string, lang: "en" | "ja") =>
  [
    header(lang, "You are my English speaking coach.", "You are my English speaking coach."),
    header(lang, "We will build the script through chat/voice conversation.", "We will build the script through chat/voice conversation."),
    "",
    `Initial topic: ${topic}`,
    `Target level: CEFR ${cefr}`,
    "",
    "Flow:",
    "1) Ask me to speak first about the topic in my own words.",
    "2) After I speak, ask exactly 3 follow-up questions to expand the content.",
    '3) After the 3 questions, ask: "Do you want me to create the script now?"',
    "4) Only if I agree, create the script in the exact format below.",
    "5) If I do not agree, keep coaching and ask what to improve.",
    "",
    "Final output format:",
    "[Speech Script]",
    "- up to 1 minute",
    `- CEFR ${cefr}, simple and natural`,
    "- spoken style, short sentences",
    "",
    "[Short Version]",
    "- around 30 seconds",
    "",
    "[Useful Variations]",
    "- 3 paraphrase options",
    "",
    "Final output should be English only."
  ].join("\n");

export const step5Prompt = (cefr: CEFR, english: string, _lang: "en" | "ja") =>
  [
    "This is my English from AI conversation practice.",
    `Please correct it for CEFR ${cefr} and keep it practical for real conversation.`,
    "",
    "Requirements:",
    "1) original -> corrected pairs",
    "2) top 3 correction points (short)",
    "3) 2 ready-to-use paraphrases",
    "",
    "Text:",
    english
  ].join("\n");

export const step6Prompt = (
  cefr: CEFR,
  topic: string,
  goal: string,
  durationMin: number,
  referenceScripts: string[],
  _lang: "en" | "ja"
) =>
  [
    "Let's do a roleplay in AI voice/chat mode. You are my conversation partner.",
    "",
    `Topic: ${topic || "everyday conversation"}`,
    `Goal: ${goal || "help me reuse and expand the reference scripts in a natural conversation"}`,
    `Target duration: ${durationMin} min`,
    "",
    "Reference scripts to reuse naturally:",
    ...referenceScripts.map((script, index) => `[Reference ${index + 1}]\n${script}`),
    "",
    "Rules:",
    `- Use simple English around CEFR ${cefr}`,
    "- Keep each turn short",
    '- Continue until I say "stop"',
    "- Do not explicitly correct me during the roleplay",
    "- If my English is unnatural, respond with a natural recast in your own reply, like how an adult speaks to a child naturally",
    "- Keep the conversation moving and help me reuse the reference scripts",
    '- When I say "stop", output one final corrected dialogue with speaker labels in this format only:',
    "AI: ...",
    "User: ...",
    "- The final corrected dialogue should be easy to read aloud as a roleplay script",
    "",
    "Start with the first line now."
  ].join("\n");

export const step7Prompt = (cefr: CEFR, transcript: string, _lang: "en" | "ja") =>
  [
    "Below is a practice log from AI conversation mode.",
    `Focus on User lines and improve them for CEFR ${cefr}.`,
    "",
    "Requirements:",
    "1) For each User line: original -> corrected",
    "2) Rebuild a natural A/B dialogue using only corrected lines",
    "3) Extract 10 useful expressions with short examples",
    "",
    "Transcript:",
    transcript
  ].join("\n");
