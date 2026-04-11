import { AnnotatedToken, CEFR, LessonSegment, PhraseBankItem, PhraseCard, RetellingKeywordLine } from "@/lib/types";
import { cefrRank } from "@/lib/phrase-bank";

const sentenceBoundary = /(?<=[.!?])\s+/;
const wordPattern = /([A-Za-z0-9']+|[^A-Za-z0-9'\s]|\s+)/g;

export const TODAY = new Date().toISOString();
export const guestSampleDays = [1, 5, 6] as const;
export const podcastAxes = {
  1: "Understanding",
  2: "Example",
  3: "Comparison",
  4: "Perspective",
  5: "Trade-off + Emotion",
  6: "Future / Extreme",
  7: "Personal + Meta"
} as const;

export const splitSentences = (text: string) =>
  text
    .split(sentenceBoundary)
    .map((value) => value.trim())
    .filter(Boolean);

export const countWords = (text: string) => (text.match(/[A-Za-z0-9']+/g) ?? []).length;

export const tokenizeText = (text: string): AnnotatedToken[] => {
  const parts = text.match(wordPattern) ?? [];
  return parts.map((part, index) => ({
    id: `${index}`,
    text: part,
    kind: /^\s+$/.test(part) ? "space" : /^[A-Za-z0-9']+$/.test(part) ? "word" : "punct",
    weight: 0
  }));
};

export const makeSegment = (text: string, voice: string, speaker: LessonSegment["speaker"] = "narrator"): LessonSegment => ({
  id: crypto.randomUUID(),
  text,
  speaker,
  voice,
  tokens: tokenizeText(text)
});

export const withUpdatedTokens = (segment: LessonSegment, tokens: AnnotatedToken[]): LessonSegment => ({ ...segment, tokens });

export const getTokenStyle = (weight: number) => {
  if (weight > 0) {
    return {
      color: "#fb7185",
      fontSize: `${1 + Math.min(weight, 3) * 0.08}em`
    };
  }
  if (weight < 0) {
    return {
      color: "#60a5fa",
      fontSize: `${1 - Math.min(Math.abs(weight), 3) * 0.07}em`
    };
  }
  return {
    color: "#f6f1dc",
    fontSize: "1em"
  };
};

export const pickPhraseCandidates = (bank: PhraseBankItem[], targetCefr: CEFR, usage: Record<string, number>, count: number) => {
  const eligible = bank.filter((item) => cefrRank[item.cefr] <= cefrRank[targetCefr === "C2" ? "C1" : targetCefr]);
  const minUsage = Math.min(...eligible.map((item) => usage[item.id] ?? 0));
  const pool = eligible.filter((item) => (usage[item.id] ?? 0) === minUsage);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const taken = shuffled.slice(0, Math.min(count, shuffled.length));
  if (taken.length >= count) {
    return {
      cycle: minUsage + 1,
      items: taken
    };
  }
  const more = eligible
    .filter((item) => !taken.some((candidate) => candidate.id === item.id))
    .sort((a, b) => (usage[a.id] ?? 0) - (usage[b.id] ?? 0) || Math.random() - 0.5)
    .slice(0, count - taken.length);
  return {
    cycle: minUsage + 1,
    items: [...taken, ...more]
  };
};

export const clonePhraseCardsWithDay = (cards: PhraseCard[], dayIndex: number) => cards.map((card) => ({ ...card, dayIndex }));

export const buildKeywordPreview = (lines: RetellingKeywordLine[]) => lines.map((line) => `${line.keywords.join(" / ")}`).join("\n");

export const todayLabel = (dayIndex: number, lang: "ja" | "en") => (lang === "ja" ? `${dayIndex}日目` : `Day ${dayIndex}`);

export const makeMonday = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const result = new Date(now);
  result.setDate(now.getDate() + diff);
  return result.toISOString().slice(0, 10);
};

export const createEmptyDayStatuses = () =>
  Array.from({ length: 7 }, (_, index) => ({
    dayIndex: index + 1,
    completed: false,
    tasks: {
      speech: false,
      phrases: false,
      podcast: false,
      retelling: false,
      externalChat: false
    }
  }));

