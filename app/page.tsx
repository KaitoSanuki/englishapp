"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppState } from "@/lib/app-state";
import { CEFR } from "@/lib/types";
import { step2Prompt, step6Prompt } from "@/lib/prompts";
import { Recorder } from "@/components/Recorder";

type FieldType = "text" | "textarea" | "select" | "yesno";
type FieldDef = {
  key: string;
  en: string;
  ja: string;
  type: FieldType;
  options?: string[];
  showIf?: (v: Record<string, string>) => boolean;
};
type TaskDef = { id: string; en: string; ja: string; fields: FieldDef[] };
type DayWrap = { fromDay: number; nextDay: number | null };
type Step2Phase = "prompt" | "paste";
type Day2Phase = "warmup" | "retell" | "ai" | "review";
type IntroCopy = { titleJa: string; bodyJa: string; titleEn: string; bodyEn: string };
type RetellingRound = {
  id: string;
  mode: "3" | "2" | "1";
  seconds: number;
  labelJa: string;
  labelEn: string;
  kind: "solo" | "ai";
};
type DialogueLine = {
  speaker: "AI" | "User";
  text: string;
};

const TX = {
  ja: {
    title: "\u4eca\u65e5\u306e\u30ec\u30c3\u30b9\u30f3",
    day: "\u65e5\u76ee",
    oneByOne: "1\u554f\u305a\u3064\u9032\u3081\u307e\u3059",
    progress: "\u9032\u6357",
    select: "\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044",
    yes: "\u306f\u3044",
    no: "\u3044\u3044\u3048",
    submit: "\u6c7a\u5b9a",
    back: "\u524d\u306e\u30b9\u30c6\u30c3\u30d7\u3078\u623b\u308b",
    skip: "\u3053\u306e\u8cea\u554f\u3092\u30b9\u30ad\u30c3\u30d7",
    skipped: "\u30b9\u30ad\u30c3\u30d7",
    defaultCefr: "\u30c7\u30d5\u30a9\u30eb\u30c8 CEFR",
    copied: "\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f\uff01",
    copyPrompt: "\u30d7\u30ed\u30f3\u30d7\u30c8\u3092\u30b3\u30d4\u30fc",
    stepDone: "\u30b9\u30c6\u30c3\u30d7\u7d42\u4e86\uff01\u6b21\u3078\u79fb\u52d5\u3057\u307e\u3059...",
    dayDoneTitle: "\u304a\u75b2\u308c\u3055\u307e\u3067\u3057\u305f\uff01",
    dayDoneBody: "\u4eca\u65e5\u306e\u30ec\u30c3\u30b9\u30f3\u306f\u3053\u3053\u307e\u3067\u3002",
    finishDay: "\u4eca\u65e5\u306e\u30ec\u30c3\u30b9\u30f3\u3092\u7d42\u3048\u308b",
    nextDayStart: "\u6b21\u306f{d}\u65e5\u76ee\u30b9\u30bf\u30fc\u30c8\uff01",
    startNextDay: "\u6b21\u306e\u30ec\u30c3\u30b9\u30f3\u3092\u59cb\u3081\u308b",
    weekDoneTitle: "\u4eca\u9031\u306e\u30ec\u30c3\u30b9\u30f3\u5b8c\u4e86\uff01",
    weekDoneBody: "1\u30c6\u30fc\u30de\u3084\u308a\u5207\u308a\u307e\u3057\u305f\uff01\u6b21\u306e\u30c6\u30fc\u30de\u3092\u59cb\u3081\u307e\u3057\u3087\u3046\u3002",
    openProgress: "\u9031\u9593\u9032\u6357\u3092\u898b\u308b",
    startNewTheme: "\u65b0\u3057\u3044\u30c6\u30fc\u30de\u3067\u59cb\u3081\u308b",
    chat: "\u306a\u308b\u307b\u3069\u3001\u300c{v}\u300d\u3067\u3059\u306d\uff01",
    finishRead: "\u97f3\u8aad\u5b8c\u4e86",
    generatedPrompt: "\u30d7\u30ed\u30f3\u30d7\u30c8\u304c\u3067\u304d\u307e\u3057\u305f",
    toPasteScript: "AI\u304c\u4f5c\u3063\u305f\u53f0\u672c\u3092\u8cbc\u308b",
    pasteScriptTitle: "AI\u304c\u4f5c\u3063\u305f\u53f0\u672c\u3092\u4fdd\u5b58",
    pasteScriptPlaceholder: "\u53f0\u672c\u3092\u3053\u3053\u306b\u8cbc\u308a\u4ed8\u3051",
    saveScript: "\u53f0\u672c\u3092\u4fdd\u5b58\u3057\u3066\u6b21\u3078",
    scriptPreview: "\u53f0\u672c",
    noScript: "\u307e\u3060\u53f0\u672c\u304c\u3042\u308a\u307e\u305b\u3093\u3002\u5148\u306b1\u3064\u524d\u306e\u30b9\u30c6\u30c3\u30d7\u3067\u4fdd\u5b58\u3057\u3066\u304f\u3060\u3055\u3044\u3002",
    sentencePractice: "1\u6587\u305a\u306410\u56de\u97f3\u8aad",
    allPractice: "\u5168\u65875\u56de\u97f3\u8aad",
    sentenceLabel: "\u6587",
    allLabel: "\u5168\u6587",
    playSentence: "\u3053\u306e\u6587\u3092\u518d\u751f",
    playAll: "\u5168\u6587\u3092\u518d\u751f",
    readOnce: "1\u56de\u97f3\u8aad\u3057\u305f",
    readingGuideDone: "\u30ac\u30a4\u30c9\u9054\u6210\uff01\u97f3\u8aad\u30b9\u30c6\u30c3\u30d7\u3092\u5b8c\u4e86",
    keywordsTitle: "\u30ad\u30fc\u30ef\u30fc\u30c9",
    retellGuideTitle: "3-2-1 \u30ea\u30c6\u30ea\u30f3\u30b0",
    retellGuideBody: "\u53f0\u672c\u3092\u898b\u306a\u304c\u3089\u3001\u30ad\u30fc\u30ef\u30fc\u30c9\u3092\u3064\u306a\u3052\u3066\u8a71\u3057\u307e\u3059\u3002",
    retellStart: "\u30bf\u30a4\u30de\u30fc\u3092\u958b\u59cb",
    retellStop: "\u3053\u306e\u30e9\u30a6\u30f3\u30c9\u3092\u6b62\u3081\u308b",
    retellNext: "\u6b21\u306e\u30e9\u30a6\u30f3\u30c9\u3078",
    retellRoundDone: "\u3053\u306e\u30e9\u30a6\u30f3\u30c9\u3092\u5b8c\u4e86",
    aiRoundTitle: "AI\u30681\u5206\u4ed5\u4e0a\u3052",
    aiRoundBody: "AI\u306b\u30d0\u30c8\u30f3\u30bf\u30c3\u30c1\u3057\u307e\u3059\u3002\u4e0b\u306e\u30d7\u30ed\u30f3\u30d7\u30c8\u3092\u4f7f\u3063\u30661\u5206\u4ed5\u4e0a\u3052\u3057\u307e\u3059\u3002",
    aiTranscriptTitle: "AI\u3068\u306e\u4f1a\u8a71\u30ed\u30b0",
    aiTranscriptPlaceholder: "AI\u3068\u306e1\u5206\u4f1a\u8a71\u3092\u8cbc\u308a\u4ed8\u3051",
    aiFinish: "AI\u3068\u306e\u7df4\u7fd2\u3092\u7d42\u3048\u3066\u6b21\u3078",
    correctionPromptTitle: "\u6dfb\u524a\u30d7\u30ed\u30f3\u30d7\u30c8",
    correctionPromptBody: "AI\u306b\u3053\u306e\u30d7\u30ed\u30f3\u30d7\u30c8\u3092\u9001\u3063\u3066\u3001\u6700\u5f8c\u306e1\u5206\u3092\u6dfb\u524a\u3057\u3066\u3082\u3089\u3044\u307e\u3059\u3002",
    completeRetell: "2\u65e5\u76ee\u3092\u5b8c\u4e86",
    retellProgress: "\u30e9\u30a6\u30f3\u30c9",
    warmupTitle: "\u307e\u305a1\u56de\u97f3\u8aad",
    warmupBody: "1\u65e5\u76ee\u306e\u53f0\u672c\u30921\u56de\u97f3\u8aad\u3057\u3066\u304b\u30892\u65e5\u76ee\u3092\u59cb\u3081\u307e\u3059\u3002",
    startRetelling: "\u30ea\u30c6\u30ea\u30f3\u30b0\u3092\u59cb\u3081\u308b",
    aiCorrectedTitle: "AI\u306e\u6dfb\u524a\u7d50\u679c",
    aiCorrectedPlaceholder: "AI\u304c\u51fa\u529b\u3057\u305f\u6dfb\u524a\u5f8c\u306e\u5168\u6587\u3092\u8cbc\u308a\u4ed8\u3051",
    saveAiCorrection: "AI\u306e\u6dfb\u524a\u3092\u4fdd\u5b58",
    reviewTitle: "\u6dfb\u524a\u7248\u3092\u97f3\u8aad",
    reviewBody: "\u6dfb\u524a\u5f8c\u306e\u5168\u6587\u3092\u30011\u65e5\u76ee\u306e\u534a\u5206\u306e\u56de\u6570\u3067\u97f3\u8aad\u3057\u307e\u3059\u3002",
    reviewSentencePractice: "1\u6587\u305a\u30645\u56de\u97f3\u8aad",
    reviewAllPractice: "\u5168\u65872\u56de\u97f3\u8aad",
    finishDay2: "2\u65e5\u76ee\u3092\u7d42\u3048\u308b",
    day3Goal: "1\u65e5\u76ee\u30682\u65e5\u76ee\u306e\u53f0\u672c\u3092\u6d3b\u304b\u3057\u3066\u3001\u5f80\u5fa9\u4f1a\u8a71\u3092\u7d9a\u3051\u308b",
    day3PasteTitle: "AI\u306e\u4fee\u6b63\u7248\u5bfe\u8a71\u3092\u4fdd\u5b58",
    day3PastePlaceholder: "AI\u304c\u6700\u5f8c\u306b\u51fa\u3057\u305f\u4fee\u6b63\u7248\u5bfe\u8a71\u3092\u8cbc\u308a\u4ed8\u3051",
    day3SaveDialogue: "\u4fee\u6b63\u7248\u5bfe\u8a71\u3092\u4fdd\u5b58",
    dialogueReadTitle: "\u5bfe\u8a71\u5f62\u5f0f\u3067\u97f3\u8aad",
    dialogueReadBody: "AI\u306e\u30bb\u30ea\u30d5\u306f\u30a2\u30d7\u30ea\u304c\u8aad\u307f\u4e0a\u3052\u3001User\u306e\u30bb\u30ea\u30d5\u3092\u97f3\u8aad\u3057\u307e\u3059\u3002",
    dialoguePass: "\u901a\u3057",
    dialogueDone: "\u3053\u306e\u901a\u3057\u3092\u5b8c\u4e86",
    finishDialogueRead: "\u4fee\u6b63\u7248\u97f3\u8aad\u3092\u5b8c\u4e86",
    stepExplainTitle: "\u6b21\u306b\u3084\u308b\u3053\u3068",
    step6Explain: "AI\u3068\u4f1a\u8a71\u3057\u3066\u3001\u6700\u5f8c\u306b\u4fee\u6b63\u7248\u5bfe\u8a71\u3092\u53d7\u3051\u53d6\u308a\u307e\u3059\u3002",
    step7Explain: "AI\u304c\u8fd4\u3057\u305f\u4fee\u6b63\u7248\u5bfe\u8a71\u3092\u4fdd\u5b58\u3057\u307e\u3059\u3002",
    step3RevisedExplain: "1\u5f80\u5fa9\u3054\u3068\u306b\u97f3\u8aad\u3057\u307e\u3059\u3002AI\u306e\u30bb\u30ea\u30d5\u306f\u81ea\u52d5\u518d\u751f\u3055\u308c\u307e\u3059\u3002",
    step3RevisedIntro: "\u3053\u308c\u304b\u3089\u30ed\u30fc\u30eb\u30d7\u30ec\u30a4\u5fa9\u7fd2\u306e\u97f3\u8aad\u3092\u3057\u307e\u3059\u3002",
    beginDialogueRead: "\u9032\u3080",
    continueToSave: "AI\u3068\u306e\u4f1a\u8a71\u3092\u7d42\u3048\u3066\u6b21\u3078",
    exchangeTitle: "\u5bfe\u8a71\u30ab\u30fc\u30c9",
    replayAi: "AI\u306e\u30bb\u30ea\u30d5\u3092\u3082\u3046\u4e00\u5ea6\u805e\u304f",
    readExchangeDone: "\u3053\u306e1\u5f80\u5fa9\u3092\u8aad\u3093\u3060"
  },
  en: {
    title: "Today Lesson",
    day: "Day",
    oneByOne: "One card at a time",
    progress: "Progress",
    select: "Select one",
    yes: "Yes",
    no: "No",
    submit: "Submit",
    back: "Back",
    skip: "Skip this question",
    skipped: "Skipped",
    defaultCefr: "Default CEFR",
    copied: "Copied!",
    copyPrompt: "Copy Prompt",
    stepDone: "Step complete! Moving to next...",
    dayDoneTitle: "Great work today!",
    dayDoneBody: "Today's lesson is complete.",
    finishDay: "Finish Today's Lesson",
    nextDayStart: "Day {d} starts now!",
    startNextDay: "Start Next Lesson",
    weekDoneTitle: "Week lesson complete!",
    weekDoneBody: "You completed one full theme. Start a new theme now.",
    openProgress: "Open Weekly Progress",
    startNewTheme: "Start New Theme",
    chat: 'Got it: "{v}"',
    finishRead: "Finish Reading",
    generatedPrompt: "Prompt is ready",
    toPasteScript: "Paste AI Script",
    pasteScriptTitle: "Save Script from AI",
    pasteScriptPlaceholder: "Paste your script here",
    saveScript: "Save Script and Continue",
    scriptPreview: "Script",
    noScript: "No script found yet. Save it in the previous step first.",
    sentencePractice: "Read each sentence 10 times",
    allPractice: "Read full script 5 times",
    sentenceLabel: "Sentence",
    allLabel: "Full script",
    playSentence: "Play sentence",
    playAll: "Play all",
    readOnce: "Count 1 reading",
    readingGuideDone: "Guide completed. Finish this reading step.",
    keywordsTitle: "Keywords",
    retellGuideTitle: "3-2-1 Retelling",
    retellGuideBody: "Rebuild the script by connecting the keywords in your own words.",
    retellStart: "Start Timer",
    retellStop: "Stop This Round",
    retellNext: "Next Round",
    retellRoundDone: "Complete This Round",
    aiRoundTitle: "Final 1-Minute AI Round",
    aiRoundBody: "Hand off to AI here. Use the prompt below for the final 1-minute retelling.",
    aiTranscriptTitle: "AI Conversation Log",
    aiTranscriptPlaceholder: "Paste the 1-minute AI conversation",
    aiFinish: "Finish AI Round and Continue",
    correctionPromptTitle: "Correction Prompt",
    correctionPromptBody: "Send this prompt to AI to get correction for the final 1-minute retelling.",
    completeRetell: "Complete Day 2",
    retellProgress: "Round",
    warmupTitle: "One Warm-up Read",
    warmupBody: "Read day 1 script once before starting day 2.",
    startRetelling: "Start Retelling",
    aiCorrectedTitle: "AI Corrected Script",
    aiCorrectedPlaceholder: "Paste the corrected full script from AI",
    saveAiCorrection: "Save AI Correction",
    reviewTitle: "Read Corrected Script",
    reviewBody: "Read the corrected script with about half the volume of day 1.",
    reviewSentencePractice: "Read each sentence 5 times",
    reviewAllPractice: "Read full script 2 times",
    finishDay2: "Finish Day 2",
    day3Goal: "Use day 1 and day 2 scripts in a back-and-forth conversation",
    day3PasteTitle: "Save Corrected Dialogue from AI",
    day3PastePlaceholder: "Paste the corrected dialogue AI outputs at the end",
    day3SaveDialogue: "Save Corrected Dialogue",
    dialogueReadTitle: "Read as Dialogue",
    dialogueReadBody: "The app reads AI lines. You read only User lines aloud.",
    dialoguePass: "Pass",
    dialogueDone: "Complete This Pass",
    finishDialogueRead: "Finish Revised Dialogue Reading",
    stepExplainTitle: "Next Up",
    step6Explain: "Talk with AI and receive one corrected dialogue at the end.",
    step7Explain: "Save the corrected dialogue returned by AI.",
    step3RevisedExplain: "Read one exchange per card. AI lines play automatically.",
    step3RevisedIntro: "You are about to start the roleplay review reading.",
    beginDialogueRead: "Continue",
    continueToSave: "I Finished the AI Conversation",
    exchangeTitle: "Dialogue Card",
    replayAi: "Replay AI Line",
    readExchangeDone: "I Read This Exchange"
  }
} as const;

const cefrOptions: CEFR[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const weekPlan: TaskDef[][] = [
  [
    {
      id: "step2_script",
      en: "Prepare theme and CEFR",
      ja: "\u30c6\u30fc\u30de\u3068CEFR\u3092\u6c7a\u3081\u308b",
      fields: [
        { key: "topic", en: "What topic this week?", ja: "\u4eca\u9031\u306e\u30c6\u30fc\u30de\u306f\uff1f", type: "text" },
        { key: "useDefaultCefr", en: "Use default CEFR?", ja: "\u8a2d\u5b9a\u306e\u30c7\u30d5\u30a9\u30eb\u30c8CEFR\u3092\u4f7f\u3046\uff1f", type: "yesno" },
        { key: "cefr", en: "Choose CEFR", ja: "CEFR\u3092\u9078\u629e", type: "select", options: cefrOptions, showIf: (v) => v.useDefaultCefr === "no" }
      ]
    },
    { id: "step3_read", en: "Read aloud", ja: "\u97f3\u8aad", fields: [] },
    { id: "record_baseline", en: "Record baseline", ja: "\u57fa\u6e96\u9332\u97f3", fields: [] }
  ],
  [{ id: "step4_321", en: "3-2-1 retelling", ja: "3-2-1 \u30ea\u30c6\u30ea\u30f3\u30b0", fields: [] }],
  [
    {
      id: "step6_roleplay",
      en: "Start roleplay",
      ja: "\u30ed\u30fc\u30eb\u30d7\u30ec\u30a4\u958b\u59cb",
      fields: []
    },
    { id: "step7_correct", en: "Correction", ja: "\u6dfb\u524a", fields: [] },
    { id: "step3_revised", en: "Read revised text", ja: "\u4fee\u6b63\u7248\u3092\u97f3\u8aad", fields: [] }
  ],
  [
    { id: "day4_review_start", en: "Review reading", ja: "\u5fa9\u7fd2\u97f3\u8aad", fields: [] },
    { id: "day4_321", en: "3-2-1 retelling", ja: "3-2-1 \u30ea\u30c6\u30ea\u30f3\u30b0", fields: [] },
    { id: "day4_roleplay", en: "Roleplay", ja: "\u30ed\u30fc\u30eb\u30d7\u30ec\u30a4", fields: [] },
    { id: "day4_save", en: "Save corrected dialogue", ja: "\u4fee\u6b63\u7248\u3092\u4fdd\u5b58", fields: [] },
    { id: "day4_review_end", en: "Review corrected dialogue", ja: "\u4fee\u6b63\u7248\u3092\u97f3\u8aad", fields: [] }
  ],
  [
    { id: "day5_roleplay_1", en: "Roleplay set 1", ja: "\u30ed\u30fc\u30eb\u30d7\u30ec\u30a4 1\u30bb\u30c3\u30c8\u76ee", fields: [] },
    { id: "day5_save_1", en: "Save corrected dialogue 1", ja: "\u4fee\u6b63\u7248\u4fdd\u5b58 1", fields: [] },
    { id: "day5_review_1", en: "Review corrected dialogue 1", ja: "\u4fee\u6b63\u7248\u97f3\u8aad 1", fields: [] },
    { id: "day5_roleplay_2", en: "Roleplay set 2", ja: "\u30ed\u30fc\u30eb\u30d7\u30ec\u30a4 2\u30bb\u30c3\u30c8\u76ee", fields: [] },
    { id: "day5_save_2", en: "Save corrected dialogue 2", ja: "\u4fee\u6b63\u7248\u4fdd\u5b58 2", fields: [] },
    { id: "day5_review_2", en: "Review corrected dialogue 2", ja: "\u4fee\u6b63\u7248\u97f3\u8aad 2", fields: [] }
  ],
  [
    { id: "day6_roleplay", en: "30min opinion roleplay", ja: "30\u5206\u30ed\u30fc\u30eb\u30d7\u30ec\u30a4", fields: [] },
    { id: "day6_save", en: "Save corrected dialogue", ja: "\u4fee\u6b63\u7248\u3092\u4fdd\u5b58", fields: [] },
    { id: "day6_review", en: "Review corrected dialogue", ja: "\u4fee\u6b63\u7248\u3092\u97f3\u8aad", fields: [] }
  ],
  [
    { id: "day7_speech", en: "1-minute speech record", ja: "1\u5206\u30b9\u30d4\u30fc\u30c1\u9332\u97f3", fields: [] },
    { id: "day7_compare", en: "Compare recordings", ja: "\u9332\u97f3\u6bd4\u8f03", fields: [] },
    { id: "day7_roleplay", en: "30min opinion roleplay", ja: "30\u5206\u30ed\u30fc\u30eb\u30d7\u30ec\u30a4", fields: [] },
    { id: "day7_save", en: "Save corrected dialogue", ja: "\u4fee\u6b63\u7248\u3092\u4fdd\u5b58", fields: [] },
    { id: "day7_review", en: "Review corrected dialogue", ja: "\u4fee\u6b63\u7248\u3092\u97f3\u8aad", fields: [] }
  ]
];

const fkey = (weekId: string, taskId: string, key: string) => `${weekId}:${taskId}:${key}`;
const hasValue = (v: string | undefined) => !!v && v !== "__skip__";
const taskHasAction = (taskId: string) =>
  [
    "step2_script",
    "step3_read",
    "record_baseline",
    "step4_321",
    "step6_roleplay",
    "step7_correct",
    "step3_revised",
    "day4_review_start",
    "day4_321",
    "day4_roleplay",
    "day4_save",
    "day4_review_end",
    "day5_roleplay_1",
    "day5_save_1",
    "day5_review_1",
    "day5_roleplay_2",
    "day5_save_2",
    "day5_review_2",
    "day6_roleplay",
    "day6_save",
    "day6_review",
    "day7_speech",
    "day7_compare",
    "day7_roleplay",
    "day7_save",
    "day7_review"
  ].includes(taskId);

const splitSentences = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((v) => v.trim())
    .filter(Boolean);

const parseDialogue = (text: string): DialogueLine[] =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (/^ai\s*:/i.test(line)) return { speaker: "AI" as const, text: line.replace(/^ai\s*:\s*/i, "").trim() };
      if (/^user\s*:/i.test(line)) return { speaker: "User" as const, text: line.replace(/^user\s*:\s*/i, "").trim() };
      return null;
    })
    .filter((line): line is DialogueLine => !!line && !!line.text);

const buildDialogueCards = (lines: DialogueLine[]) => {
  const exchanges: { ai: string; user: string }[] = [];
  for (let i = 0; i < lines.length; i += 2) {
    const first = lines[i];
    const second = lines[i + 1];
    if (!first || !second || first.speaker !== "AI" || second.speaker !== "User") continue;
    exchanges.push({ ai: first.text, user: second.text });
  }

  return Array.from({ length: 3 }, (_, passIndex) =>
    exchanges.map((exchange, exchangeIndex) => ({
      ...exchange,
      pass: passIndex + 1,
      exchange: exchangeIndex + 1
    }))
  ).flat();
};

const retellingRounds: RetellingRound[] = [
  { id: "3-1", mode: "3", seconds: 180, labelJa: "3分 1回目", labelEn: "3 min · Round 1", kind: "solo" },
  { id: "3-2", mode: "3", seconds: 180, labelJa: "3分 2回目", labelEn: "3 min · Round 2", kind: "solo" },
  { id: "3-3", mode: "3", seconds: 180, labelJa: "3分 3回目", labelEn: "3 min · Round 3", kind: "solo" },
  { id: "2-1", mode: "2", seconds: 120, labelJa: "2分 1回目", labelEn: "2 min · Round 1", kind: "solo" },
  { id: "2-2", mode: "2", seconds: 120, labelJa: "2分 2回目", labelEn: "2 min · Round 2", kind: "solo" },
  { id: "1-1", mode: "1", seconds: 60, labelJa: "1分 1回目", labelEn: "1 min · Round 1", kind: "solo" },
  { id: "ai-1", mode: "1", seconds: 60, labelJa: "AIと1分 仕上げ", labelEn: "1 min with AI", kind: "ai" }
];

const keywordStopWords = new Set([
  "the", "and", "that", "have", "with", "from", "your", "about", "this", "there", "would", "could", "should", "into",
  "than", "then", "them", "they", "their", "been", "were", "what", "when", "where", "which", "while", "because", "really",
  "just", "also", "very", "much", "some", "more", "like", "want", "need", "talk", "speak", "said", "will", "around", "minute"
]);

const extractKeywords = (text: string) => {
  const ordered: string[] = [];
  const seen = new Set<string>();
  for (const word of text.toLowerCase().match(/[a-z']+/g) ?? []) {
    if (word.length < 4 || keywordStopWords.has(word)) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    ordered.push(word);
  }
  return ordered.slice(0, 8);
};

const introCopyByTask: Record<string, IntroCopy> = {
  step3_read: {
    titleJa: "これから音読します",
    bodyJa: "1日目の台本を声に出して読み、口に慣らします。",
    titleEn: "Reading Aloud Next",
    bodyEn: "Read your day 1 script aloud to warm up your speaking."
  },
  record_baseline: {
    titleJa: "これから基準録音します",
    bodyJa: "今の状態を残すために、台本を録音します。",
    titleEn: "Baseline Recording Next",
    bodyEn: "Record the script to capture your starting point."
  },
  step4_321: {
    titleJa: "これから3-2-1リテリングです",
    bodyJa: "キーワードを見ながら、長く話してから短く圧縮していきます。",
    titleEn: "3-2-1 Retelling Next",
    bodyEn: "Use keywords to retell, then compress the same content into shorter rounds."
  },
  step6_roleplay: {
    titleJa: "これからAIと話します",
    bodyJa: "1日目と2日目の内容を使いながら、会話の往復を練習します。",
    titleEn: "AI Conversation Next",
    bodyEn: "Talk with AI and reuse what you built on day 1 and day 2."
  },
  step7_correct: {
    titleJa: "これから修正版を保存します",
    bodyJa: "AIが最後に返した修正版対話を貼って、次の音読に使います。",
    titleEn: "Save Corrected Dialogue Next",
    bodyEn: "Paste the corrected dialogue from AI so you can read it next."
  },
  step3_revised: {
    titleJa: "これからロールプレイ復習の音読です",
    bodyJa: "対話形式で読みます。AIのセリフは自動再生され、Userだけ声に出します。",
    titleEn: "Roleplay Review Reading Next",
    bodyEn: "Read the corrected dialogue. AI lines autoplay and you read the User lines."
  },
  day4_review_start: {
    titleJa: "これから3日目の復習音読です",
    bodyJa: "3日目の修正版対話を使って、もう一度音読します。",
    titleEn: "Day 4 Review Reading Next",
    bodyEn: "Re-read the corrected dialogue from day 3."
  },
  day4_321: {
    titleJa: "これから3-2-1リテリングです",
    bodyJa: "2日目と同じ形式で3分3回、2分2回、1分1回を実施します。",
    titleEn: "Day 4 3-2-1 Next",
    bodyEn: "Run 3-2-1 rounds in the same style as day 2."
  },
  day4_roleplay: {
    titleJa: "これからAIロールプレイです",
    bodyJa: "追加のロールプレイを行い、最後に修正版対話を受け取ります。",
    titleEn: "Additional AI Roleplay Next",
    bodyEn: "Do another roleplay and get a corrected dialogue at the end."
  },
  day4_save: {
    titleJa: "これから修正版対話を保存します",
    bodyJa: "AIが返した修正版対話を貼り付けて保存します。",
    titleEn: "Save Corrected Dialogue Next",
    bodyEn: "Paste and save the corrected dialogue from AI."
  },
  day4_review_end: {
    titleJa: "これから修正版を音読します",
    bodyJa: "保存した修正版対話を3日目と同じ方式で音読します。",
    titleEn: "Review Corrected Dialogue Next",
    bodyEn: "Read the corrected dialogue in the same style as day 3."
  },
  day5_roleplay_1: {
    titleJa: "20分ロールプレイ 1セット目",
    bodyJa: "20分の会話を行い、最後に修正版対話を受け取ります。",
    titleEn: "20-min Roleplay Set 1",
    bodyEn: "Run a 20-minute roleplay and get corrected dialogue."
  },
  day5_save_1: {
    titleJa: "1セット目を保存します",
    bodyJa: "1セット目の修正版対話を保存します。",
    titleEn: "Save Set 1",
    bodyEn: "Save corrected dialogue from set 1."
  },
  day5_review_1: {
    titleJa: "1セット目を復習音読します",
    bodyJa: "保存した修正版対話を対話形式で音読します。",
    titleEn: "Review Set 1",
    bodyEn: "Read corrected dialogue from set 1."
  },
  day5_roleplay_2: {
    titleJa: "20分ロールプレイ 2セット目",
    bodyJa: "もう一度20分ロールプレイを行います。",
    titleEn: "20-min Roleplay Set 2",
    bodyEn: "Run the second 20-minute roleplay."
  },
  day5_save_2: {
    titleJa: "2セット目を保存します",
    bodyJa: "2セット目の修正版対話を保存します。",
    titleEn: "Save Set 2",
    bodyEn: "Save corrected dialogue from set 2."
  },
  day5_review_2: {
    titleJa: "2セット目を復習音読します",
    bodyJa: "保存した修正版対話を対話形式で音読します。",
    titleEn: "Review Set 2",
    bodyEn: "Read corrected dialogue from set 2."
  },
  day6_roleplay: {
    titleJa: "30分の意見交換ロールプレイです",
    bodyJa: "AIの質問に答え、互いに意見と感想を言い合います。",
    titleEn: "30-min Opinion Roleplay Next",
    bodyEn: "Exchange opinions with AI in a 30-minute roleplay."
  },
  day6_save: {
    titleJa: "修正版対話を保存します",
    bodyJa: "AIが返した修正版対話を保存します。",
    titleEn: "Save Corrected Dialogue",
    bodyEn: "Save corrected dialogue from AI."
  },
  day6_review: {
    titleJa: "修正版を復習音読します",
    bodyJa: "対話形式で修正版を音読します。",
    titleEn: "Review Corrected Dialogue",
    bodyEn: "Read corrected dialogue in roleplay format."
  },
  day7_speech: {
    titleJa: "1分スピーチを録音します",
    bodyJa: "初日と同じテーマで1分スピーチして録音します。",
    titleEn: "Record 1-min Speech",
    bodyEn: "Record a 1-minute speech on the same topic as day 1."
  },
  day7_compare: {
    titleJa: "録音を聞き比べます",
    bodyJa: "初日の録音と今の録音を再生して比較します。",
    titleEn: "Compare Recordings",
    bodyEn: "Compare day 1 recording and today's recording."
  },
  day7_roleplay: {
    titleJa: "30分の意見交換ロールプレイです",
    bodyJa: "6日目と同じ形式で意見交換ロールプレイを行います。",
    titleEn: "30-min Opinion Roleplay",
    bodyEn: "Run the same opinion-exchange roleplay as day 6."
  },
  day7_save: {
    titleJa: "修正版対話を保存します",
    bodyJa: "AIが返した修正版対話を保存します。",
    titleEn: "Save Corrected Dialogue",
    bodyEn: "Save corrected dialogue from AI."
  },
  day7_review: {
    titleJa: "修正版を復習音読します",
    bodyJa: "対話形式で修正版を音読して締めます。",
    titleEn: "Final Review Reading",
    bodyEn: "Finish with roleplay-style reading."
  }
};

export default function TodayLessonPage() {
  const { state, activeWeek, saveTaskRun, saveWeek, setWizardAnswer, undoLastCompletedTask, saveScript, saveRoleplay, saveRetelling, saveAudio, createNextWeek } =
    useAppState();
  const ja = state.language === "ja";
  const t = ja ? TX.ja : TX.en;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [dayWrap, setDayWrap] = useState<DayWrap | null>(null);
  const [startCardDay, setStartCardDay] = useState<number | null>(null);
  const [step2Phase, setStep2Phase] = useState<Step2Phase>("prompt");
  const [step2PasteText, setStep2PasteText] = useState("");
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [sentenceRepeatCount, setSentenceRepeatCount] = useState(0);
  const [allRepeatCount, setAllRepeatCount] = useState(0);
  const [retellRoundIndex, setRetellRoundIndex] = useState(0);
  const [retellRunning, setRetellRunning] = useState(false);
  const [retellRemaining, setRetellRemaining] = useState(retellingRounds[0].seconds);
  const [day2Phase, setDay2Phase] = useState<Day2Phase>("warmup");
  const [retellTranscript, setRetellTranscript] = useState("");
  const [day2CorrectionText, setDay2CorrectionText] = useState("");
  const [reviewSentenceIndex, setReviewSentenceIndex] = useState(0);
  const [reviewSentenceRepeatCount, setReviewSentenceRepeatCount] = useState(0);
  const [reviewAllRepeatCount, setReviewAllRepeatCount] = useState(0);
  const [day3CorrectionText, setDay3CorrectionText] = useState("");
  const [dialogueCardIndex, setDialogueCardIndex] = useState(0);
  const [lastAutoplayKey, setLastAutoplayKey] = useState("");
  const [dialogueAutoplayReady, setDialogueAutoplayReady] = useState(false);
  const [speechPrimed, setSpeechPrimed] = useState(false);
  const [showTaskIntro, setShowTaskIntro] = useState(false);
  const [day7SpeechRunning, setDay7SpeechRunning] = useState(false);
  const [day7SpeechRemaining, setDay7SpeechRemaining] = useState(60);
  const [day7Recording, setDay7Recording] = useState(false);
  const [day7PreviewUrl, setDay7PreviewUrl] = useState("");
  const [day7RecordError, setDay7RecordError] = useState("");
  const day7MediaRef = useRef<MediaRecorder | null>(null);
  const day7ChunksRef = useRef<Blob[]>([]);
  const day7MimeRef = useRef("");
  const [autoReadKey, setAutoReadKey] = useState("");
  const [autoReviewKey, setAutoReviewKey] = useState("");
  const [autoWarmupKey, setAutoWarmupKey] = useState("");

  const completedByDay = useMemo(() => {
    const map = weekPlan.map(() => new Set<string>());
    for (const run of state.taskRuns) {
      if (run.weekId === activeWeek.id && run.completed && run.dayOfWeek >= 0 && run.dayOfWeek <= 6) map[run.dayOfWeek].add(run.taskType);
    }
    return map;
  }, [activeWeek.id, state.taskRuns]);

  const dayIdx = completedByDay.findIndex((set, i) => set.size < weekPlan[i].length);
  const flowDay = dayIdx === -1 ? 6 : dayIdx;
  const replayDayRaw = Number(searchParams.get("replayDay"));
  const replayTaskId = searchParams.get("replayTask") ?? "";
  const hasReplayDay = Number.isInteger(replayDayRaw) && replayDayRaw >= 0 && replayDayRaw < weekPlan.length;
  const replayMode = hasReplayDay && !!replayTaskId && weekPlan[replayDayRaw].some((x) => x.id === replayTaskId);
  const frozenDay = replayMode ? replayDayRaw : dayWrap?.fromDay ?? flowDay;
  const dayTasks = weekPlan[frozenDay];
  const completedIds = completedByDay[frozenDay];
  const pendingIndex = dayTasks.findIndex((x) => !completedIds.has(x.id));
  const task = replayMode ? dayTasks.find((x) => x.id === replayTaskId) ?? dayTasks[0] : pendingIndex === -1 ? dayTasks[dayTasks.length - 1] : dayTasks[pendingIndex];
  const doneCount = dayTasks.filter((x) => completedIds.has(x.id)).length;
  const hasAnyCompleted = state.taskRuns.some((x) => x.weekId === activeWeek.id && x.completed);

  const values: Record<string, string> = {};
  task.fields.forEach((f) => (values[f.key] = state.wizardAnswers[fkey(activeWeek.id, task.id, f.key)] ?? ""));
  const effectiveCefr = (values.useDefaultCefr === "no" ? (values.cefr as CEFR) : state.prefs.defaultCefr) || state.prefs.defaultCefr;

  const visible = task.fields.filter((f) => (f.showIf ? f.showIf(values) : true));
  const current = visible.find((f) => !hasValue(values[f.key]));
  const lastAnswered = [...visible].reverse().find((f) => hasValue(values[f.key]));

  const latestScript = [...state.scripts]
    .filter((x) => x.weekId === activeWeek.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const latestRoleplay = [...state.roleplays]
    .filter((x) => x.weekId === activeWeek.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const baselineAudio = [...state.audioRecords]
    .filter((x) => x.weekId === activeWeek.id && x.type === "baseline")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const latestReviewAudio = [...state.audioRecords]
    .filter((x) => x.weekId === activeWeek.id && x.type === "review")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  useEffect(() => {
    setDraft("");
  }, [frozenDay, task.id, current?.key]);

  useEffect(() => {
    setStep2Phase("prompt");
    setStep2PasteText("");
    setSentenceIndex(0);
    setSentenceRepeatCount(0);
    setAllRepeatCount(0);
    setRetellRoundIndex(0);
    setRetellRunning(false);
    setRetellRemaining(retellingRounds[0].seconds);
    setDay2Phase("warmup");
    setRetellTranscript("");
    setDay2CorrectionText("");
    setReviewSentenceIndex(0);
    setReviewSentenceRepeatCount(0);
    setReviewAllRepeatCount(0);
    setDay3CorrectionText("");
    setDialogueCardIndex(0);
    setLastAutoplayKey("");
    setDialogueAutoplayReady(false);
    setSpeechPrimed(false);
    setShowTaskIntro(false);
    setDay7SpeechRunning(false);
    setDay7SpeechRemaining(60);
    setDay7Recording(false);
    setDay7PreviewUrl("");
    setDay7RecordError("");
    setAutoReadKey("");
    setAutoReviewKey("");
    setAutoWarmupKey("");
  }, [frozenDay, task.id]);

  useEffect(() => {
    if (!current && !!introCopyByTask[task.id]) {
      setShowTaskIntro(true);
      return;
    }
    setShowTaskIntro(false);
  }, [current, task.id]);

  useEffect(() => {
    if (task.id !== "step4_321" && task.id !== "day4_321") return;
    if (day2Phase !== "retell") return;
    const currentRound = retellingRounds[retellRoundIndex];
    if (!currentRound) return;
    setRetellRunning(false);
    setRetellRemaining(currentRound.seconds);
  }, [day2Phase, retellRoundIndex, task.id]);

  useEffect(() => {
    if (!transitioning) return;
    setTransitionProgress(0);
    const startedAt = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const next = Math.min(100, (elapsed / 3000) * 100);
      setTransitionProgress(next);
      if (next >= 100) {
        clearInterval(id);
        setTransitioning(false);
      }
    }, 50);
    return () => clearInterval(id);
  }, [transitioning]);

  useEffect(() => {
    if (task.id !== "step4_321" && task.id !== "day4_321") return;
    if (day2Phase !== "retell" || !retellRunning) return;
    const currentRound = retellingRounds[retellRoundIndex];
    if (!currentRound) return;
    const id = setInterval(() => {
      setRetellRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setRetellRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [day2Phase, retellRoundIndex, retellRunning, task.id]);

  useEffect(() => {
    if (task.id !== "day7_speech" || !day7SpeechRunning) return;
    const id = setInterval(() => {
      setDay7SpeechRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          setDay7SpeechRunning(false);
          if (day7Recording) {
            day7MediaRef.current?.stop();
            day7MediaRef.current?.stream.getTracks().forEach((t) => t.stop());
            setDay7Recording(false);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [day7Recording, day7SpeechRunning, task.id]);

  const save = (key: string, value: string) => setWizardAnswer(fkey(activeWeek.id, task.id, key), value);
  const say = (v: string) => t.chat.replace("{v}", v);

  const finishStep = () => {
    primeSpeech();
    stopSpeech();
    const isLastTaskOfDay = doneCount + 1 >= dayTasks.length;
    const isLastDay = frozenDay >= weekPlan.length - 1;
    if (task.id === "step2_script") {
      saveWeek({ ...activeWeek, topicTitle: hasValue(values.topic) ? values.topic : activeWeek.topicTitle, cefr: effectiveCefr });
    }
    saveTaskRun({
      id: crypto.randomUUID(),
      weekId: activeWeek.id,
      dayOfWeek: frozenDay,
      taskType: task.id,
      completed: true,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString()
    });
    if (replayMode) {
      router.push("/practice");
      return;
    }
    setFeedback("");
    if (isLastTaskOfDay) {
      setDayWrap({ fromDay: frozenDay, nextDay: isLastDay ? null : frozenDay + 1 });
      setTransitioning(false);
      return;
    }
    setTransitioning(true);
  };

  const isFinalQuestion = (curKey: string) => visible.every((f) => f.key === curKey || hasValue(values[f.key]));

  const submitCurrent = () => {
    primeSpeech();
    if (!current || !draft.trim()) return;
    save(current.key, draft.trim());
    setFeedback(say(draft.trim()));
    if (isFinalQuestion(current.key) && !taskHasAction(task.id)) setTimeout(finishStep, 220);
  };

  const submitYesNo = (v: "yes" | "no") => {
    primeSpeech();
    if (!current) return;
    save(current.key, v);
    setFeedback(say(v === "yes" ? t.yes : t.no));
    if (isFinalQuestion(current.key) && !taskHasAction(task.id)) setTimeout(finishStep, 220);
  };

  const goBack = () => {
    primeSpeech();
    stopSpeech();
    if (replayMode && !current) {
      router.push("/practice");
      return;
    }
    if (!current && !!introCopyByTask[task.id] && !showTaskIntro) {
      setShowTaskIntro(true);
      return;
    }
    if (task.id === "step2_script" && !current && step2Phase === "paste") {
      setStep2Phase("prompt");
      return;
    }
    if ((task.id === "step4_321" || task.id === "day4_321") && !current) {
      if (day2Phase === "review") {
        setDay2Phase("ai");
        return;
      }
      if (day2Phase === "ai") {
        setDay2Phase("retell");
        setRetellRoundIndex(retellingRounds.length - 2);
        return;
      }
      if (day2Phase === "retell" && retellRoundIndex > 0) {
        setRetellRoundIndex((v) => v - 1);
        return;
      }
      if (day2Phase === "retell" && retellRoundIndex === 0) {
        setDay2Phase("warmup");
        return;
      }
    }
    if (dialogueReadTaskIds.includes(task.id) && !current) {
      if (!showTaskIntro && dialogueCardIndex > 0) {
        setDialogueCardIndex((v) => Math.max(0, v - 1));
        return;
      }
      if (!showTaskIntro) {
        setShowTaskIntro(true);
        return;
      }
    }
    if (lastAnswered) {
      save(lastAnswered.key, "");
      return;
    }
    if (hasAnyCompleted) undoLastCompletedTask(activeWeek.id);
  };

  const skip = () => {
    primeSpeech();
    stopSpeech();
    if (current) {
      save(current.key, "__skip__");
      setFeedback(say(t.skipped));
      if (isFinalQuestion(current.key) && !taskHasAction(task.id)) setTimeout(finishStep, 220);
      return;
    }
    if (!current && !!introCopyByTask[task.id] && showTaskIntro) {
      setShowTaskIntro(false);
      return;
    }
    if ((task.id === "step4_321" || task.id === "day4_321") && !current) {
      if (day2Phase === "warmup") {
        setDay2Phase("retell");
        return;
      }
      if (day2Phase === "retell") {
        if (retellRoundIndex < retellingRounds.length - 1) {
          if (retellRoundIndex >= retellingRounds.length - 2) {
            setRetellRoundIndex(retellingRounds.length - 1);
            setDay2Phase("ai");
            return;
          }
          setRetellRoundIndex((v) => v + 1);
        } else {
          setDay2Phase("ai");
        }
        return;
      }
      if (day2Phase === "ai") {
        setDay2Phase("review");
        return;
      }
      if (day2Phase === "review") {
        finishStep();
        return;
      }
    }
    if (dialogueReadTaskIds.includes(task.id) && !current) {
      if (showTaskIntro) {
        setShowTaskIntro(false);
        return;
      }
      if (dialogueCardIndex < dialogueCards.length) {
        setDialogueCardIndex((v) => Math.min(dialogueCards.length, v + 1));
        return;
      }
      if (dialogueCardIndex >= dialogueCards.length) {
        finishStep();
        return;
      }
    }
    if (!current && taskHasAction(task.id)) {
      finishStep();
      return;
    }
    goBack();
  };

  const closeDay = () => {
    if (!dayWrap) return;
    primeSpeech();
    stopSpeech();
    if (dayWrap.nextDay !== null) setStartCardDay(dayWrap.nextDay);
    setDayWrap(null);
  };

  const startNextDay = () => {
    primeSpeech();
    stopSpeech();
    setStartCardDay(null);
  };

  const startNewTheme = () => {
    primeSpeech();
    stopSpeech();
    createNextWeek();
    setDayWrap(null);
    setStartCardDay(null);
  };

  const step2 = step2Prompt(effectiveCefr, values.topic || activeWeek.topicTitle, state.language);
  const roleplayTaskIds = [
    "step6_roleplay",
    "day4_roleplay",
    "day5_roleplay_1",
    "day5_roleplay_2",
    "day6_roleplay",
    "day7_roleplay"
  ];
  const isRoleplayTask = roleplayTaskIds.includes(task.id);
  const roleplayDuration =
    task.id === "day5_roleplay_1" || task.id === "day5_roleplay_2" ? 20 : task.id === "day6_roleplay" || task.id === "day7_roleplay" ? 30 : 5;
  const roleplayGoal = task.id === "day6_roleplay" || task.id === "day7_roleplay"
    ? "Discuss opinions: AI asks a question, User answers, AI shares an opinion, and both exchange reactions."
    : t.day3Goal;
  const day3ReferenceScripts = [latestScript?.enScript || "", latestRoleplay?.correctionText || ""].filter(Boolean);
  const step6 = step6Prompt(effectiveCefr, activeWeek.topicTitle, roleplayGoal, roleplayDuration, day3ReferenceScripts, state.language);
  const dialogueReadTaskIds = ["step3_revised", "day4_review_start", "day4_review_end", "day5_review_1", "day5_review_2", "day6_review", "day7_review"];
  const saveDialogueTaskIds = ["step7_correct", "day4_save", "day5_save_1", "day5_save_2", "day6_save", "day7_save"];
  const simpleReadTaskIds = ["step3_read"];
  const displayDay = startCardDay ?? dayWrap?.fromDay ?? flowDay;
  const hideProgress = !!dayWrap || startCardDay !== null;
  const latestDay3Correction = day3CorrectionText.trim() || latestRoleplay?.correctionText || "";
  const readText =
    task.id === "step3_read"
      ? latestScript?.enScript || ""
      : task.id === "step3_revised"
        ? latestDay3Correction || latestScript?.enScript || ""
        : latestRoleplay?.correctionText || latestScript?.enScript || "";
  const retellSourceText = latestScript?.enScript || "";
  const retellKeywords = extractKeywords(retellSourceText);
  const currentRetellRound = retellingRounds[retellRoundIndex];
  const retellElapsed = currentRetellRound ? currentRetellRound.seconds - retellRemaining : 0;
  const latestDay2Correction = latestRoleplay?.correctionText || "";
  const sentences = useMemo(() => splitSentences(readText), [readText]);
  const dialogueLines = useMemo(() => parseDialogue(latestDay3Correction), [latestDay3Correction]);
  const dialogueCards = useMemo(() => buildDialogueCards(dialogueLines), [dialogueLines]);
  const currentDialogueCard = dialogueCards[dialogueCardIndex];
  const currentDialogueKey = currentDialogueCard
    ? `${task.id}:${dialogueCardIndex}:${currentDialogueCard.pass}:${currentDialogueCard.exchange}`
    : "";
  const reviewText = day2CorrectionText.trim() || latestDay2Correction.trim() || retellTranscript.trim();
  const reviewSentences = useMemo(() => splitSentences(reviewText), [reviewText]);
  const sentenceTarget = 10;
  const allTarget = 5;
  const sentenceStageDone = sentenceIndex >= sentences.length;
  const readingGuideDone = sentenceStageDone && allRepeatCount >= allTarget;
  const reviewSentenceTarget = 5;
  const reviewAllTarget = 2;
  const reviewSentenceStageDone = reviewSentenceIndex >= reviewSentences.length;
  const reviewGuideDone = reviewSentenceStageDone && reviewAllRepeatCount >= reviewAllTarget;
  const retellAiPrompt = [
    "We will do one final retelling practice.",
    `Topic: ${activeWeek.topicTitle}`,
    `Level: CEFR ${effectiveCefr}`,
    retellKeywords.length ? `Keywords in speaking order: ${retellKeywords.join(" -> ")}` : "",
    "Rules:",
    "- First, show me the keywords briefly.",
    '- Then stay silent until I say "retelling finished".',
    "- Do not interrupt or ask follow-up questions while I am speaking.",
    '- After I say "retelling finished", output one corrected full version only.',
    "- Make the corrected full version natural and simple for my CEFR level."
  ]
    .filter(Boolean)
    .join("\n");

  const stopSpeech = () => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
  };

  const primeSpeech = () => {
    if (typeof window === "undefined") return;
    if (speechPrimed) return;
    try {
      const utterance = new SpeechSynthesisUtterance(" ");
      utterance.volume = 0;
      utterance.rate = 1;
      window.speechSynthesis.speak(utterance);
      window.setTimeout(() => {
        window.speechSynthesis.cancel();
        setSpeechPrimed(true);
      }, 10);
    } catch {
      setSpeechPrimed(true);
    }
  };

  useEffect(() => {
    if (transitioning || !!dayWrap || startCardDay !== null) {
      stopSpeech();
      setDialogueAutoplayReady(false);
    }
  }, [transitioning, dayWrap, startCardDay]);

  const speak = (payload: string) => {
    if (!payload) return;
    stopSpeech();
    const u = new SpeechSynthesisUtterance(payload);
    u.lang = "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  };

  useEffect(() => {
    if (transitioning || !!dayWrap || startCardDay !== null || showTaskIntro || current) return;
    if (!simpleReadTaskIds.includes(task.id)) return;
    if (!sentences.length || sentenceStageDone) return;
    const key = `${task.id}:sentence:${sentenceIndex}:${sentenceRepeatCount}`;
    if (autoReadKey === key) return;
    const text = sentences[sentenceIndex];
    if (!text) return;
    const id = window.setTimeout(() => {
      setAutoReadKey(key);
      speak(text);
    }, 200);
    return () => window.clearTimeout(id);
  }, [
    autoReadKey,
    current,
    dayWrap,
    sentenceIndex,
    sentenceRepeatCount,
    sentenceStageDone,
    sentences,
    showTaskIntro,
    simpleReadTaskIds,
    startCardDay,
    task.id,
    transitioning
  ]);

  useEffect(() => {
    if (transitioning || !!dayWrap || startCardDay !== null || showTaskIntro || current) return;
    if (!(task.id === "step4_321" || task.id === "day4_321")) return;
    if (day2Phase !== "warmup" || !retellSourceText.trim()) return;
    const key = `${task.id}:warmup:${retellSourceText.length}`;
    if (autoWarmupKey === key) return;
    const id = window.setTimeout(() => {
      setAutoWarmupKey(key);
      speak(retellSourceText);
    }, 250);
    return () => window.clearTimeout(id);
  }, [autoWarmupKey, current, day2Phase, dayWrap, retellSourceText, showTaskIntro, startCardDay, task.id, transitioning]);

  useEffect(() => {
    if (transitioning || !!dayWrap || startCardDay !== null || showTaskIntro || current) return;
    if (!(task.id === "step4_321" || task.id === "day4_321")) return;
    if (day2Phase !== "review" || !reviewSentences.length || reviewSentenceStageDone) return;
    const key = `${task.id}:review:${reviewSentenceIndex}:${reviewSentenceRepeatCount}`;
    if (autoReviewKey === key) return;
    const text = reviewSentences[reviewSentenceIndex];
    if (!text) return;
    const id = window.setTimeout(() => {
      setAutoReviewKey(key);
      speak(text);
    }, 200);
    return () => window.clearTimeout(id);
  }, [
    autoReviewKey,
    current,
    day2Phase,
    dayWrap,
    reviewSentenceIndex,
    reviewSentenceRepeatCount,
    reviewSentenceStageDone,
    reviewSentences,
    showTaskIntro,
    startCardDay,
    task.id,
    transitioning
  ]);

  const pickRecorderMime = () => {
    if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
    const candidates = ["audio/mp4;codecs=mp4a.40.2", "audio/mp4", "audio/webm;codecs=opus", "audio/webm"];
    return candidates.find((v) => MediaRecorder.isTypeSupported(v)) ?? "";
  };

  const startDay7SpeechRecording = async () => {
    setDay7RecordError("");
    if (day7Recording || day7SpeechRunning) return;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        setDay7RecordError(ja ? "この端末は録音に対応していません" : "Recording is not supported on this device");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickRecorderMime();
      day7MimeRef.current = mimeType;
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      day7ChunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) day7ChunksRef.current.push(e.data);
      };
      mr.onerror = () => setDay7RecordError(ja ? "録音中にエラーが発生しました" : "An error occurred while recording");
      mr.onstop = () => {
        const blobType = mr.mimeType || day7MimeRef.current || "audio/webm";
        const blob = new Blob(day7ChunksRef.current, { type: blobType });
        const preview = URL.createObjectURL(blob);
        setDay7PreviewUrl(preview);
        setDay7Recording(false);
      };
      mr.start();
      day7MediaRef.current = mr;
      setDay7Recording(true);
      setDay7SpeechRunning(true);
      setDay7SpeechRemaining(60);
    } catch {
      setDay7RecordError(ja ? "マイクの許可が必要です" : "Microphone permission is required");
      setDay7Recording(false);
      setDay7SpeechRunning(false);
    }
  };

  const stopDay7SpeechRecording = () => {
    day7MediaRef.current?.stop();
    day7MediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    setDay7Recording(false);
    setDay7SpeechRunning(false);
  };

  const countReading = () => {
    if (!sentenceStageDone) {
      const nextCount = sentenceRepeatCount + 1;
      if (nextCount >= sentenceTarget) {
        setSentenceRepeatCount(0);
        setSentenceIndex((v) => v + 1);
      } else {
        setSentenceRepeatCount(nextCount);
      }
      return;
    }
    setAllRepeatCount((v) => Math.min(allTarget, v + 1));
  };

  const countReviewReading = () => {
    if (!reviewSentenceStageDone) {
      const nextCount = reviewSentenceRepeatCount + 1;
      if (nextCount >= reviewSentenceTarget) {
        setReviewSentenceRepeatCount(0);
        setReviewSentenceIndex((v) => v + 1);
      } else {
        setReviewSentenceRepeatCount(nextCount);
      }
      return;
    }
    setReviewAllRepeatCount((v) => Math.min(reviewAllTarget, v + 1));
  };

  useEffect(() => {
    if (!dialogueReadTaskIds.includes(task.id)) return;
    if (showTaskIntro) return;
    setDialogueAutoplayReady(false);
    if (transitioning || !!dayWrap || startCardDay !== null) return;
    if (!currentDialogueCard?.ai) return;
    const id = window.setTimeout(() => {
      setDialogueAutoplayReady(true);
    }, 350);
    return () => {
      window.clearTimeout(id);
    };
  }, [currentDialogueCard?.ai, currentDialogueKey, dayWrap, showTaskIntro, startCardDay, task.id, transitioning, dialogueReadTaskIds]);

  useEffect(() => {
    if (!dialogueReadTaskIds.includes(task.id)) return;
    if (showTaskIntro) return;
    if (!dialogueAutoplayReady) return;
    if (!currentDialogueCard?.ai) return;
    if (currentDialogueKey === lastAutoplayKey) return;
    const id = window.setTimeout(() => {
      setLastAutoplayKey(currentDialogueKey);
      speak(currentDialogueCard.ai);
    }, 120);
    return () => {
      window.clearTimeout(id);
    };
  }, [currentDialogueCard?.ai, currentDialogueKey, dialogueAutoplayReady, lastAutoplayKey, showTaskIntro, task.id, dialogueReadTaskIds]);

  const formatTimer = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const completeRetellRound = () => {
    if (!currentRetellRound) return;
    stopSpeech();
    saveRetelling({
      id: crypto.randomUUID(),
      weekId: activeWeek.id,
      mode: currentRetellRound.mode,
      actualTimeSec: retellElapsed,
      rating: 0,
      notes: currentRetellRound.id,
      createdAt: new Date().toISOString()
    });
    if (currentRetellRound.kind === "ai") {
      const correctedText = retellTranscript.trim();
      saveRoleplay({
        id: crypto.randomUUID(),
        weekId: activeWeek.id,
        promptText: retellAiPrompt,
        transcriptText: correctedText,
        correctionText: correctedText,
        materialDialogueText: correctedText,
        phrasesText: retellKeywords.join(", "),
        createdAt: new Date().toISOString()
      });
      setDay2CorrectionText(correctedText);
      setDay2Phase("review");
      return;
    }
    if (retellRoundIndex >= retellingRounds.length - 2) {
      setRetellRoundIndex(retellingRounds.length - 1);
      setDay2Phase("ai");
      return;
    }
    setRetellRoundIndex((v) => v + 1);
  };

  const canGoBack =
    !!dayWrap ||
    startCardDay !== null
      ? false
      : replayMode && !current
        ? true
      : !current && !!introCopyByTask[task.id] && !showTaskIntro
        ? true
      : dialogueReadTaskIds.includes(task.id) && !current
        ? !showTaskIntro || dialogueCardIndex > 0 || hasAnyCompleted || !!lastAnswered
      : (task.id === "step4_321" || task.id === "day4_321") && !current
        ? day2Phase !== "warmup" || retellRoundIndex > 0 || hasAnyCompleted || !!lastAnswered
        : task.id === "step2_script" && !current && step2Phase === "paste"
          ? true
          : hasAnyCompleted || !!lastAnswered;

  return (
    <div className="h-[calc(100vh-112px)] flex flex-col gap-4 overflow-hidden">
      <section className="glass rounded-xl2 p-4">
        <p className="text-xs text-slate-700">{t.title}</p>
        <h1 className="text-2xl font-black">{ja ? `${displayDay + 1}${t.day}` : `${t.day} ${displayDay + 1}`}</h1>
        <p className="text-sm text-slate-800">{t.oneByOne}</p>
        {replayMode && <p className="mt-1 text-xs font-semibold text-accent">{ja ? "やり直しモード" : "Redo Mode"}</p>}
      </section>

      <section className="glass rounded-xl2 p-5 flex-1 flex flex-col justify-between overflow-auto">
        <div className="space-y-3">
          {!hideProgress && (
            <>
              <p className="text-sm text-slate-800">
                {t.progress}: {doneCount}/{dayTasks.length}
              </p>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-2 rounded-full bg-accent transition-all duration-300" style={{ width: `${(doneCount / dayTasks.length) * 100}%` }} />
              </div>

              <article className="input">
                <p className="font-semibold text-slate-900">{ja ? task.ja : task.en}</p>
              </article>

              {!!feedback && <article className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-slate-900">{feedback}</article>}
            </>
          )}

          <div
            key={`${displayDay}-${task.id}-${current?.key ?? "action"}-${transitioning ? "done" : "live"}-${step2Phase}-${day2Phase}-${retellRoundIndex}`}
            className="rounded-xl border border-slate-200 bg-white/70 p-4 animate-card-swap"
          >
            {dayWrap ? (
              <div className="space-y-3">
                <p className="font-semibold text-slate-900">{dayWrap.nextDay === null ? t.weekDoneTitle : t.dayDoneTitle}</p>
                <p className="text-sm text-slate-800">{dayWrap.nextDay === null ? t.weekDoneBody : t.dayDoneBody}</p>
                {dayWrap.nextDay === null ? (
                  <button className="btn-primary w-full" onClick={startNewTheme}>
                    {t.startNewTheme}
                  </button>
                ) : (
                  <button className="btn-primary w-full" onClick={closeDay}>
                    {t.finishDay}
                  </button>
                )}
              </div>
            ) : startCardDay !== null ? (
              <div className="space-y-3">
                <p className="font-semibold text-slate-900">{t.nextDayStart.replace("{d}", String(startCardDay + 1))}</p>
                <button className="btn-primary w-full" onClick={startNextDay}>
                  {t.startNextDay}
                </button>
              </div>
            ) : transitioning ? (
              <div className="space-y-3">
                <p className="font-semibold text-slate-900">{t.stepDone}</p>
                <div className="h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-accent transition-all duration-75" style={{ width: `${transitionProgress}%` }} />
                </div>
              </div>
            ) : current ? (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">{ja ? current.ja : current.en}</label>
                {current.type === "text" && <input className="input text-slate-900" value={draft} onChange={(e) => setDraft(e.target.value)} />}
                {current.type === "textarea" && <textarea className="input min-h-24 text-slate-900" value={draft} onChange={(e) => setDraft(e.target.value)} />}
                {current.type === "select" && (
                  <select className="input text-slate-900" value={draft} onChange={(e) => setDraft(e.target.value)}>
                    <option value="">{t.select}</option>
                    {(current.options ?? []).map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                )}
                {current.type === "yesno" ? (
                  <div className="flex gap-2">
                    <button className="btn-primary" onClick={() => submitYesNo("yes")}>
                      {t.yes}
                    </button>
                    <button className="btn-secondary" onClick={() => submitYesNo("no")}>
                      {t.no}
                    </button>
                  </div>
                ) : (
                  <button className="btn-primary" onClick={submitCurrent} disabled={!draft.trim()}>
                    {t.submit}
                  </button>
                )}
                {current.key === "useDefaultCefr" && (
                  <p className="text-xs text-slate-700">
                    {t.defaultCefr}: {state.prefs.defaultCefr}
                  </p>
                )}
              </div>
            ) : showTaskIntro && introCopyByTask[task.id] ? (
              <section className="glass rounded-xl2 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-900">{t.stepExplainTitle}</p>
                <h3 className="text-base font-bold text-slate-900">
                  {ja ? introCopyByTask[task.id].titleJa : introCopyByTask[task.id].titleEn}
                </h3>
                <p className="text-sm text-slate-800">
                  {ja ? introCopyByTask[task.id].bodyJa : introCopyByTask[task.id].bodyEn}
                </p>
                <button className="btn-primary w-full" onClick={() => setShowTaskIntro(false)}>
                  {t.beginDialogueRead}
                </button>
              </section>
            ) : (
              <div className="space-y-3">
                {task.id === "step2_script" && (
                  step2Phase === "prompt" ? (
                    <section className="glass rounded-xl2 p-4 space-y-3">
                      <h3 className="text-base font-bold text-slate-900">{t.generatedPrompt}</h3>
                      <textarea className="input min-h-36 text-slate-900" value={step2} readOnly />
                      <button
                        className="btn-secondary w-full"
                        onClick={async () => {
                          await navigator.clipboard.writeText(step2);
                        }}
                      >
                        {t.copyPrompt}
                      </button>
                      <button className="btn-primary w-full" onClick={() => setStep2Phase("paste")}>
                        {t.toPasteScript}
                      </button>
                    </section>
                  ) : (
                    <section className="glass rounded-xl2 p-4 space-y-3">
                      <h3 className="text-base font-bold text-slate-900">{t.pasteScriptTitle}</h3>
                      <textarea
                        className="input min-h-32 text-slate-900"
                        placeholder={t.pasteScriptPlaceholder}
                        value={step2PasteText}
                        onChange={(e) => setStep2PasteText(e.target.value)}
                      />
                      <button
                        className="btn-primary w-full"
                        onClick={() => {
                          if (!step2PasteText.trim()) return;
                          saveScript({
                            id: crypto.randomUUID(),
                            weekId: activeWeek.id,
                            jpSource: values.topic || activeWeek.topicTitle,
                            enScript: step2PasteText.trim(),
                            createdAt: new Date().toISOString()
                          });
                          finishStep();
                        }}
                        disabled={!step2PasteText.trim()}
                      >
                        {t.saveScript}
                      </button>
                    </section>
                  )
                )}

                {simpleReadTaskIds.includes(task.id) && (
                  <section className="glass rounded-xl2 p-4 space-y-3">
                    <h3 className="text-base font-bold text-slate-900">{t.scriptPreview}</h3>
                    {!!readText.trim() ? (
                      <>
                        <article className="input whitespace-pre-wrap text-slate-900">{readText}</article>
                        {!sentenceStageDone ? (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-slate-900">{t.sentencePractice}</p>
                            <p className="text-sm text-slate-800">
                              {`${t.sentenceLabel} ${sentenceIndex + 1}/${sentences.length}`} / {sentenceRepeatCount}/{sentenceTarget}
                            </p>
                            <article className="input text-slate-900">{sentences[sentenceIndex]}</article>
                            <div className="flex gap-2">
                              <button className="btn-secondary flex-1" onClick={() => speak(sentences[sentenceIndex])}>
                                {t.playSentence}
                              </button>
                              <button className="btn-primary flex-1" onClick={countReading}>
                                {t.readOnce}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-slate-900">{t.allPractice}</p>
                            <p className="text-sm text-slate-800">
                              {`${t.allLabel} ${allRepeatCount}/${allTarget}`}
                            </p>
                            <div className="flex gap-2">
                              <button className="btn-secondary flex-1" onClick={() => speak(readText)}>
                                {t.playAll}
                              </button>
                              <button className="btn-primary flex-1" onClick={countReading} disabled={allRepeatCount >= allTarget}>
                                {t.readOnce}
                              </button>
                            </div>
                          </div>
                        )}
                        {readingGuideDone && (
                          <button className="btn-primary w-full" onClick={finishStep}>
                            {t.readingGuideDone}
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-800">{t.noScript}</p>
                    )}
                  </section>
                )}

                {dialogueReadTaskIds.includes(task.id) && (
                  <section className="glass rounded-xl2 p-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-900">{t.stepExplainTitle}</p>
                    <h3 className="text-base font-bold text-slate-900">{t.dialogueReadTitle}</h3>
                    <p className="text-sm text-slate-800">{t.step3RevisedExplain}</p>
                    {!!dialogueCards.length ? (
                      <>
                        {currentDialogueCard ? (
                          <>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900">
                              {t.dialoguePass}: {currentDialogueCard.pass}/3
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 space-y-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {t.exchangeTitle} {currentDialogueCard.exchange}
                              </p>
                              <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AI</p>
                                <p className="text-sm text-slate-900">{currentDialogueCard.ai}</p>
                                <button className="btn-secondary" onClick={() => speak(currentDialogueCard.ai)}>
                                  {t.replayAi}
                                </button>
                              </div>
                              <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">User</p>
                                <p className="text-sm text-slate-900">{currentDialogueCard.user}</p>
                              </div>
                            </div>
                            <button
                              className="btn-primary w-full"
                              onClick={() => {
                                stopSpeech();
                                setDialogueCardIndex((v) => Math.min(dialogueCards.length, v + 1));
                              }}
                              disabled={dialogueCardIndex >= dialogueCards.length}
                            >
                              {t.readExchangeDone}
                            </button>
                          </>
                        ) : (
                          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-900">
                            {t.dialoguePass}: 3/3
                          </div>
                        )}
                        {dialogueCardIndex >= dialogueCards.length && (
                          <button className="btn-primary w-full" onClick={finishStep}>
                            {t.finishDialogueRead}
                          </button>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-slate-800">{t.noScript}</p>
                    )}
                  </section>
                )}

                {task.id === "record_baseline" && (
                  <section className="space-y-3">
                    <section className="glass rounded-xl2 p-4 space-y-2">
                      <h3 className="text-base font-bold text-slate-900">{t.scriptPreview}</h3>
                      <article className="input whitespace-pre-wrap text-slate-900">{latestScript?.enScript || t.noScript}</article>
                    </section>
                    <Recorder
                      language={state.language}
                      onSave={(blobUrl) => {
                        saveAudio({
                          id: crypto.randomUUID(),
                          weekId: activeWeek.id,
                          type: task.id === "record_baseline" ? "baseline" : "review",
                          blobUrl,
                          memo: "",
                          createdAt: new Date().toISOString()
                        });
                        finishStep();
                      }}
                    />
                  </section>
                )}

                {(task.id === "step4_321" || task.id === "day4_321") && (
                  <section className="glass rounded-xl2 p-4 space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-base font-bold text-slate-900">{t.retellGuideTitle}</h3>
                      <p className="text-sm text-slate-800">{t.retellGuideBody}</p>
                    </div>
                    {!!retellSourceText.trim() ? (
                      <>
                        {day2Phase === "warmup" ? (
                          <div className="space-y-3">
                            <p className="text-sm font-semibold text-slate-900">{t.warmupTitle}</p>
                            <p className="text-sm text-slate-800">{t.warmupBody}</p>
                            <article className="input whitespace-pre-wrap text-slate-900">{retellSourceText}</article>
                            <div className="flex gap-2">
                              <button className="btn-secondary flex-1" onClick={() => speak(retellSourceText)}>
                                {t.playAll}
                              </button>
                              <button className="btn-primary flex-1" onClick={() => setDay2Phase("retell")}>
                                {t.startRetelling}
                              </button>
                            </div>
                          </div>
                        ) : day2Phase === "review" ? (
                          <div className="space-y-3">
                            <p className="text-sm font-semibold text-slate-900">{t.reviewTitle}</p>
                            <p className="text-sm text-slate-800">{t.reviewBody}</p>
                            {!!reviewText.trim() ? (
                              <>
                                <article className="input whitespace-pre-wrap text-slate-900">{reviewText}</article>
                                {!reviewSentenceStageDone ? (
                                  <div className="space-y-2">
                                    <p className="text-sm font-semibold text-slate-900">{t.reviewSentencePractice}</p>
                                    <p className="text-sm text-slate-800">
                                      {`${t.sentenceLabel} ${reviewSentenceIndex + 1}/${reviewSentences.length}`} / {reviewSentenceRepeatCount}/{reviewSentenceTarget}
                                    </p>
                                    <article className="input text-slate-900">{reviewSentences[reviewSentenceIndex]}</article>
                                    <div className="flex gap-2">
                                      <button className="btn-secondary flex-1" onClick={() => speak(reviewSentences[reviewSentenceIndex])}>
                                        {t.playSentence}
                                      </button>
                                      <button className="btn-primary flex-1" onClick={countReviewReading}>
                                        {t.readOnce}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <p className="text-sm font-semibold text-slate-900">{t.reviewAllPractice}</p>
                                    <p className="text-sm text-slate-800">
                                      {`${t.allLabel} ${reviewAllRepeatCount}/${reviewAllTarget}`}
                                    </p>
                                    <div className="flex gap-2">
                                      <button className="btn-secondary flex-1" onClick={() => speak(reviewText)}>
                                        {t.playAll}
                                      </button>
                                      <button className="btn-primary flex-1" onClick={countReviewReading} disabled={reviewAllRepeatCount >= reviewAllTarget}>
                                        {t.readOnce}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-sm text-slate-800">{t.noScript}</p>
                            )}
                            {reviewGuideDone && (
                              <button className="btn-primary w-full" onClick={finishStep}>
                                {t.finishDay2}
                              </button>
                            )}
                          </div>
                        ) : day2Phase === "ai" ? (
                          <div className="space-y-3">
                            <p className="text-sm font-semibold text-slate-900">{t.aiRoundTitle}</p>
                            <p className="text-sm text-slate-800">{t.aiRoundBody}</p>
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-slate-900">{t.keywordsTitle}</p>
                              <div className="flex flex-wrap gap-2">
                                {retellKeywords.map((keyword) => (
                                  <span key={keyword} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-900">
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <textarea className="input min-h-32 text-slate-900" value={retellAiPrompt} readOnly />
                            <button
                              className="btn-secondary w-full"
                              onClick={async () => {
                                await navigator.clipboard.writeText(retellAiPrompt);
                              }}
                            >
                              {t.copyPrompt}
                            </button>
                            <p className="text-sm font-semibold text-slate-900">{t.aiCorrectedTitle}</p>
                            <textarea
                              className="input min-h-28 text-slate-900"
                              placeholder={t.aiCorrectedPlaceholder}
                              value={retellTranscript}
                              onChange={(e) => setRetellTranscript(e.target.value)}
                            />
                            <button className="btn-primary w-full" onClick={completeRetellRound} disabled={!retellTranscript.trim()}>
                              {t.saveAiCorrection}
                            </button>
                          </div>
                        ) : day2Phase === "retell" && currentRetellRound ? (
                          <div className="space-y-3">
                            <div className="space-y-2">
                              <p className="text-sm font-semibold text-slate-900">{t.keywordsTitle}</p>
                              <div className="flex flex-wrap gap-2">
                                {retellKeywords.map((keyword) => (
                                  <span key={keyword} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-900">
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                              <p className="text-sm font-semibold text-slate-900">{ja ? currentRetellRound.labelJa : currentRetellRound.labelEn}</p>
                              <p className="text-xs text-slate-700">
                                {t.retellProgress}: {retellRoundIndex + 1}/{retellingRounds.length}
                              </p>
                            </div>
                            <p className="text-4xl font-black tabular-nums text-slate-900">{formatTimer(retellRemaining)}</p>
                            <div className="flex gap-2">
                              <button className="btn-primary flex-1" onClick={() => setRetellRunning(true)} disabled={retellRunning || retellRemaining === 0}>
                                {t.retellStart}
                              </button>
                              <button className="btn-secondary flex-1" onClick={() => setRetellRunning(false)} disabled={!retellRunning}>
                                {t.retellStop}
                              </button>
                            </div>
                            <button className="btn-primary w-full" onClick={completeRetellRound} disabled={retellElapsed <= 0}>
                              {retellRoundIndex === retellingRounds.length - 1 ? t.retellRoundDone : t.retellNext}
                            </button>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-sm text-slate-800">{t.noScript}</p>
                    )}
                  </section>
                )}

                {task.id === "day7_speech" && (
                  <section className="glass rounded-xl2 p-4 space-y-4">
                    <h3 className="text-base font-bold text-slate-900">{ja ? "1分スピーチ録音" : "1-min Speech Recording"}</h3>
                    <p className="text-4xl font-black tabular-nums text-slate-900">{formatTimer(day7SpeechRemaining)}</p>
                    <div className="flex gap-2">
                      <button className="btn-primary flex-1" onClick={startDay7SpeechRecording} disabled={day7SpeechRunning || day7Recording}>
                        {ja ? "録音とタイマーを開始" : "Start Recording + Timer"}
                      </button>
                      <button className="btn-secondary flex-1" onClick={stopDay7SpeechRecording} disabled={!day7Recording}>
                        {ja ? "停止" : "Stop"}
                      </button>
                    </div>
                    {!!day7RecordError && <p className="text-sm text-rose-600">{day7RecordError}</p>}
                    {day7PreviewUrl && (
                      <>
                        <audio src={day7PreviewUrl} controls className="w-full" />
                        <button
                          className="btn-primary w-full"
                          onClick={() => {
                        saveAudio({
                          id: crypto.randomUUID(),
                          weekId: activeWeek.id,
                          type: "review",
                              blobUrl: day7PreviewUrl,
                          memo: "day7_speech",
                          createdAt: new Date().toISOString()
                        });
                        finishStep();
                      }}
                          disabled={!day7PreviewUrl}
                        >
                          {ja ? "録音を保存して次へ" : "Save Recording and Continue"}
                        </button>
                      </>
                    )}
                  </section>
                )}

                {task.id === "day7_compare" && (
                  <section className="glass rounded-xl2 p-4 space-y-3">
                    <h3 className="text-base font-bold text-slate-900">{ja ? "録音比較" : "Recording Comparison"}</h3>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-900">{ja ? "初日の録音" : "Day 1 Baseline"}</p>
                      {baselineAudio ? <audio controls src={baselineAudio.blobUrl} className="w-full" /> : <p className="text-sm text-slate-700">{t.noScript}</p>}
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-900">{ja ? "今日の録音" : "Today Recording"}</p>
                      {latestReviewAudio ? <audio controls src={latestReviewAudio.blobUrl} className="w-full" /> : <p className="text-sm text-slate-700">{t.noScript}</p>}
                    </div>
                    <button className="btn-primary w-full" onClick={finishStep}>
                      {ja ? "比較完了" : "Finish Comparison"}
                    </button>
                  </section>
                )}

                {isRoleplayTask && (
                  <section className="glass rounded-xl2 p-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-900">{t.stepExplainTitle}</p>
                    <p className="text-sm text-slate-800">{t.step6Explain}</p>
                    <textarea className="input min-h-36 text-slate-900" value={step6} readOnly />
                    <button
                      className="btn-secondary w-full"
                      onClick={async () => {
                        await navigator.clipboard.writeText(step6);
                      }}
                    >
                      {t.copyPrompt}
                    </button>
                    <button
                      className="btn-primary w-full"
                      onClick={() => {
                        saveRoleplay({
                          id: crypto.randomUUID(),
                          weekId: activeWeek.id,
                          promptText: step6,
                          transcriptText: "",
                          correctionText: "",
                          materialDialogueText: "",
                          phrasesText: "",
                          createdAt: new Date().toISOString()
                        });
                        finishStep();
                      }}
                    >
                      {t.continueToSave}
                    </button>
                  </section>
                )}

                {saveDialogueTaskIds.includes(task.id) && (
                  <section className="glass rounded-xl2 p-4 space-y-3">
                    <p className="text-sm font-semibold text-slate-900">{t.stepExplainTitle}</p>
                    <p className="text-sm text-slate-800">{t.step7Explain}</p>
                    <h3 className="text-base font-bold text-slate-900">{t.day3PasteTitle}</h3>
                    <textarea
                      className="input min-h-32 text-slate-900"
                      placeholder={t.day3PastePlaceholder}
                      value={day3CorrectionText}
                      onChange={(e) => setDay3CorrectionText(e.target.value)}
                    />
                    <button
                      className="btn-primary w-full"
                      onClick={() => {
                        const corrected = day3CorrectionText.trim();
                        if (!corrected) return;
                        saveRoleplay({
                          id: crypto.randomUUID(),
                          weekId: activeWeek.id,
                          promptText: step6,
                          transcriptText: latestRoleplay?.transcriptText || "",
                          correctionText: corrected,
                          materialDialogueText: corrected,
                          phrasesText: corrected,
                          createdAt: new Date().toISOString()
                        });
                        finishStep();
                      }}
                      disabled={!day3CorrectionText.trim()}
                    >
                      {t.day3SaveDialogue}
                    </button>
                  </section>
                )}

              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-3">
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={goBack} disabled={transitioning || !canGoBack}>
              {t.back}
            </button>
            <button className="btn-secondary flex-1" onClick={skip} disabled={transitioning || !!dayWrap || startCardDay !== null}>
              {t.skip}
            </button>
          </div>
          <a href="/practice" className="btn-secondary w-full block text-center py-3">
            {t.openProgress}
          </a>
        </div>
      </section>
    </div>
  );
}

