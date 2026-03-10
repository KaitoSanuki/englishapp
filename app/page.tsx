"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { CEFR } from "@/lib/types";
import { step2Prompt, step5Prompt, step6Prompt, step7Prompt } from "@/lib/prompts";
import { PromptCard } from "@/components/PromptCard";
import { Recorder } from "@/components/Recorder";
import { Timer321 } from "@/components/Timer321";

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
type RetellingRound = {
  id: string;
  mode: "3" | "2" | "1";
  seconds: number;
  labelJa: string;
  labelEn: string;
  kind: "solo" | "ai";
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
    weekDoneBody: "\u9031\u6b21\u9032\u6357\u304b\u3089\u632f\u308a\u8fd4\u308a\u307e\u3057\u3087\u3046\u3002",
    openProgress: "\u9031\u9593\u9032\u6357\u3092\u898b\u308b",
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
    finishDay2: "2\u65e5\u76ee\u3092\u7d42\u3048\u308b"
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
    weekDoneBody: "Check your weekly progress and review.",
    openProgress: "Open Weekly Progress",
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
    finishDay2: "Finish Day 2"
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
      fields: [
        { key: "scene", en: "Scene?", ja: "\u30b7\u30fc\u30f3\u306f\uff1f", type: "text" },
        { key: "roleGoal", en: "Goal?", ja: "\u30b4\u30fc\u30eb\u306f\uff1f", type: "text" }
      ]
    },
    { id: "step7_correct", en: "Correction", ja: "\u6dfb\u524a", fields: [{ key: "transcript", en: "Paste transcript", ja: "\u6587\u5b57\u8d77\u3053\u3057\u3092\u8cbc\u308b", type: "textarea" }] },
    { id: "step3_revised", en: "Read revised text", ja: "\u4fee\u6b63\u7248\u3092\u97f3\u8aad", fields: [] }
  ],
  [
    { id: "step3_review", en: "Review reading", ja: "\u5fa9\u7fd2\u97f3\u8aad", fields: [] },
    { id: "step4_light", en: "Light 3-2-1", ja: "\u8efd\u30813-2-1", fields: [] }
  ],
  [{ id: "step6_advanced", en: "Advanced roleplay", ja: "\u5fdc\u7528\u30ed\u30fc\u30eb\u30d7\u30ec\u30a4", fields: [{ key: "advancedFocus", en: "What variation to try?", ja: "\u3069\u3093\u306a\u5fdc\u7528\u3092\u8a66\u3059\uff1f", type: "text" }] }],
  [{ id: "step6_extended", en: "Extended roleplay", ja: "\u62e1\u5f35\u30ed\u30fc\u30eb\u30d7\u30ec\u30a4", fields: [{ key: "extendedMinutes", en: "How many minutes?", ja: "\u4f55\u5206\u3084\u308b\uff1f", type: "select", options: ["5", "8", "10"] }] }],
  [
    { id: "step5_review", en: "Weekly correction review", ja: "\u9031\u6b21\u6dfb\u524a\u30ec\u30d3\u30e5\u30fc", fields: [{ key: "weekText", en: "Paste weekly speaking text", ja: "\u9031\u306e\u82f1\u8a9e\u3092\u8cbc\u308b", type: "textarea" }] },
    { id: "record_compare", en: "Compare recordings", ja: "\u9332\u97f3\u6bd4\u8f03", fields: [] }
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
    "step3_review",
    "step4_light",
    "step6_advanced",
    "step6_extended",
    "step5_review",
    "record_compare"
  ].includes(taskId);

const splitSentences = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((v) => v.trim())
    .filter(Boolean);

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

export default function TodayLessonPage() {
  const { state, activeWeek, saveTaskRun, saveWeek, setWizardAnswer, undoLastCompletedTask, saveScript, saveRoleplay, saveRetelling, saveAudio } = useAppState();
  const ja = state.language === "ja";
  const t = ja ? TX.ja : TX.en;

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

  const completedByDay = useMemo(() => {
    const map = weekPlan.map(() => new Set<string>());
    for (const run of state.taskRuns) {
      if (run.weekId === activeWeek.id && run.completed && run.dayOfWeek >= 0 && run.dayOfWeek <= 6) map[run.dayOfWeek].add(run.taskType);
    }
    return map;
  }, [activeWeek.id, state.taskRuns]);

  const dayIdx = completedByDay.findIndex((set, i) => set.size < weekPlan[i].length);
  const flowDay = dayIdx === -1 ? 6 : dayIdx;
  const frozenDay = dayWrap?.fromDay ?? flowDay;
  const dayTasks = weekPlan[frozenDay];
  const completedIds = completedByDay[frozenDay];
  const pendingIndex = dayTasks.findIndex((x) => !completedIds.has(x.id));
  const task = pendingIndex === -1 ? dayTasks[dayTasks.length - 1] : dayTasks[pendingIndex];
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
  }, [frozenDay, task.id]);

  useEffect(() => {
    if (task.id !== "step4_321") return;
    if (day2Phase !== "retell") return;
    const currentRound = retellingRounds[retellRoundIndex];
    if (!currentRound) return;
    setRetellRunning(false);
    setRetellRemaining(currentRound.seconds);
  }, [day2Phase, retellRoundIndex, task.id]);

  useEffect(() => {
    if (!transitioning) return;
    setTransitionProgress(0);
    const id = setInterval(() => {
      setTransitionProgress((p) => {
        const next = p + 2;
        if (next >= 100) {
          clearInterval(id);
          setTransitioning(false);
          return 100;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [transitioning]);

  useEffect(() => {
    if (task.id !== "step4_321" || day2Phase !== "retell" || !retellRunning) return;
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

  const save = (key: string, value: string) => setWizardAnswer(fkey(activeWeek.id, task.id, key), value);
  const say = (v: string) => t.chat.replace("{v}", v);

  const finishStep = () => {
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
    if (!current || !draft.trim()) return;
    save(current.key, draft.trim());
    setFeedback(say(draft.trim()));
    if (isFinalQuestion(current.key) && !taskHasAction(task.id)) setTimeout(finishStep, 220);
  };

  const submitYesNo = (v: "yes" | "no") => {
    if (!current) return;
    save(current.key, v);
    setFeedback(say(v === "yes" ? t.yes : t.no));
    if (isFinalQuestion(current.key) && !taskHasAction(task.id)) setTimeout(finishStep, 220);
  };

  const goBack = () => {
    if (task.id === "step2_script" && !current && step2Phase === "paste") {
      setStep2Phase("prompt");
      return;
    }
    if (task.id === "step4_321" && !current) {
      if (day2Phase === "review") {
        setDay2Phase("ai");
        return;
      }
      if (day2Phase === "ai") {
        setDay2Phase("retell");
        setRetellRoundIndex(retellingRounds.length - 1);
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
    if (lastAnswered) {
      save(lastAnswered.key, "");
      return;
    }
    if (hasAnyCompleted) undoLastCompletedTask(activeWeek.id);
  };

  const skip = () => {
    if (current) {
      save(current.key, "__skip__");
      setFeedback(say(t.skipped));
      if (isFinalQuestion(current.key) && !taskHasAction(task.id)) setTimeout(finishStep, 220);
      return;
    }
    if (task.id === "step4_321" && !current) {
      if (day2Phase === "warmup") {
        setDay2Phase("retell");
        return;
      }
      if (day2Phase === "retell") {
        if (retellRoundIndex < retellingRounds.length - 1) {
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
    if (!current && taskHasAction(task.id)) {
      finishStep();
      return;
    }
    goBack();
  };

  const closeDay = () => {
    if (!dayWrap) return;
    if (dayWrap.nextDay !== null) setStartCardDay(dayWrap.nextDay);
    setDayWrap(null);
  };

  const startNextDay = () => {
    setStartCardDay(null);
  };

  const step2 = step2Prompt(effectiveCefr, values.topic || activeWeek.topicTitle, state.language);
  const step6 = step6Prompt(effectiveCefr, values.scene || "", values.roleGoal || "", Number(values.extendedMinutes || 5), state.language);
  const step7 = step7Prompt(effectiveCefr, values.transcript || "", state.language);
  const step5 = step5Prompt(effectiveCefr, values.weekText || "", state.language);
  const displayDay = startCardDay ?? dayWrap?.fromDay ?? flowDay;
  const hideProgress = !!dayWrap || startCardDay !== null;
  const readText = task.id === "step3_read" ? latestScript?.enScript || "" : latestRoleplay?.correctionText || latestScript?.enScript || "";
  const retellSourceText = latestScript?.enScript || "";
  const retellKeywords = extractKeywords(retellSourceText);
  const currentRetellRound = retellingRounds[retellRoundIndex];
  const retellElapsed = currentRetellRound ? currentRetellRound.seconds - retellRemaining : 0;
  const latestDay2Correction = latestRoleplay?.correctionText || "";
  const sentences = useMemo(() => splitSentences(readText), [readText]);
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

  const speak = (payload: string) => {
    if (!payload) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(payload);
    u.lang = "en-US";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
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

  const formatTimer = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  const completeRetellRound = () => {
    if (!currentRetellRound) return;
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
      setDay2Phase("ai");
      return;
    }
    setRetellRoundIndex((v) => v + 1);
  };

  const canGoBack =
    !!dayWrap ||
    startCardDay !== null
      ? false
      : task.id === "step4_321" && !current
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
                <button className="btn-primary w-full" onClick={closeDay}>
                  {t.finishDay}
                </button>
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

                {(task.id === "step3_read" || task.id === "step3_revised" || task.id === "step3_review") && (
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

                {(task.id === "record_baseline" || task.id === "record_compare") && (
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

                {task.id === "step4_321" && (
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

                {task.id === "step4_light" && (
                  <Timer321
                    language={state.language}
                    onSave={(mode, sec, rating, notes) => {
                      saveRetelling({ id: crypto.randomUUID(), weekId: activeWeek.id, mode, actualTimeSec: sec, rating, notes, createdAt: new Date().toISOString() });
                      finishStep();
                    }}
                  />
                )}

                {(task.id === "step6_roleplay" || task.id === "step6_advanced" || task.id === "step6_extended") && (
                  <PromptCard
                    title="Step6 Prompt"
                    prompt={step6}
                    language={state.language}
                    onSavePaste={(text) => {
                      saveRoleplay({
                        id: crypto.randomUUID(),
                        weekId: activeWeek.id,
                        promptText: step6,
                        transcriptText: text,
                        correctionText: "",
                        materialDialogueText: "",
                        phrasesText: "",
                        createdAt: new Date().toISOString()
                      });
                      finishStep();
                    }}
                  />
                )}

                {task.id === "step7_correct" && (
                  <PromptCard
                    title="Step7 Prompt"
                    prompt={step7}
                    language={state.language}
                    onSavePaste={(text) => {
                      saveRoleplay({
                        id: crypto.randomUUID(),
                        weekId: activeWeek.id,
                        promptText: step6,
                        transcriptText: values.transcript || "",
                        correctionText: text,
                        materialDialogueText: text,
                        phrasesText: text,
                        createdAt: new Date().toISOString()
                      });
                      finishStep();
                    }}
                  />
                )}

                {task.id === "step5_review" && <PromptCard title="Step5 Prompt" prompt={step5} language={state.language} onSavePaste={() => finishStep()} />}
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

