"use client";

import { jsonPost } from "@/components/lesson/api";
import { getSpeechBlob } from "@/lib/audio-client";
import { pickPhraseCandidates, makeSegment } from "@/lib/lesson-utils";
import { phraseBank } from "@/lib/phrase-bank";
import { DebugTrace, ExternalChatPrompt, PhraseCard, PhraseSet, PodcastEpisode, RetellingSession, SpeechMaterial, UserPrefs, WeekRecord } from "@/lib/types";

type AuthLike = {
  mode: "guest" | "user";
  userId?: string;
  accessToken?: string;
};

type CloudScope = {
  userId: string;
  accessToken: string;
};

type CommonArgs = {
  week: WeekRecord;
  auth: AuthLike;
  addDebugTrace: (trace: DebugTrace) => void;
};

type PhraseArgs = CommonArgs & {
  phraseUsage: Record<string, number>;
  savePhraseSet: (phraseSet: PhraseSet) => void;
  incrementPhraseUsage: (phraseIds: string[]) => void;
};

type PodcastArgs = CommonArgs & {
  prefs: UserPrefs;
  savePodcast: (episode: PodcastEpisode) => void;
};

type RetellingArgs = CommonArgs & {
  saveRetelling: (retelling: RetellingSession) => void;
};

type ExternalPromptArgs = CommonArgs & {
  saveExternalPrompt: (prompt: ExternalChatPrompt) => void;
};

const pending = new Map<string, Promise<unknown>>();

const runOnce = <T,>(key: string, task: () => Promise<T>) => {
  const running = pending.get(key);
  if (running) return running as Promise<T>;
  const promise = task().finally(() => pending.delete(key));
  pending.set(key, promise);
  return promise;
};

const makeClientTrace = (debug: Omit<DebugTrace, "id" | "createdAt">): DebugTrace => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  ...debug
});

const normalizePhrase = (value: string) => value.toLowerCase().replace(/\s+/g, " ").trim();

const toCloudScope = (auth: AuthLike): CloudScope | undefined =>
  auth.mode === "user" && auth.userId && auth.accessToken ? { userId: auth.userId, accessToken: auth.accessToken } : undefined;

export const prewarmSpeechAudio = async (speech: SpeechMaterial, auth: AuthLike) => {
  const items = [
    ...speech.segments.map((segment) => ({ text: segment.text, voice: segment.voice })),
    {
      text: speech.segments.map((segment) => segment.text).join(" "),
      voice: speech.segments[0]?.voice ?? speech.segments[0]?.voice ?? "alloy"
    }
  ].filter((item) => item.text.trim());
  const cloudScope = toCloudScope(auth);
  await runOnce(`audio:speech:${speech.id}`, async () => {
    for (const item of items) {
      await getSpeechBlob(item.text, item.voice, cloudScope);
    }
  });
};

export const prewarmPhraseAudio = async (phraseSet: PhraseSet, auth: AuthLike) => {
  const cloudScope = toCloudScope(auth);
  await runOnce(`audio:phrases:${phraseSet.id}`, async () => {
    for (const card of phraseSet.cards) {
      await getSpeechBlob(card.segment.text, card.segment.voice, cloudScope);
    }
  });
};

export const prewarmPodcastAudio = async (episode: PodcastEpisode, auth: AuthLike) => {
  const cloudScope = toCloudScope(auth);
  await runOnce(`audio:podcast:${episode.id}`, async () => {
    for (const turn of episode.turns) {
      await getSpeechBlob(turn.text, turn.voice, cloudScope);
    }
  });
};

export const prewarmCorrectionAudio = async (session: RetellingSession, voice: string, auth: AuthLike) => {
  if (!session.correctionText?.trim()) return;
  const cloudScope = toCloudScope(auth);
  await runOnce(`audio:retelling-correction:${session.id}`, async () => {
    await getSpeechBlob(session.correctionText!, voice, cloudScope);
  });
};

export const ensurePhraseSetReady = async ({ week, auth, phraseUsage, savePhraseSet, incrementPhraseUsage, addDebugTrace }: PhraseArgs, dayIndex: number) => {
  const existing = week.phraseSets.find((item) => item.dayIndex === dayIndex);
  if (existing) return existing;
  if (!week.speech) return null;

  return runOnce(`data:phrases:${week.id}:${dayIndex}`, async () => {
    const count = dayIndex === 1 ? 10 : 20;
    const picked = pickPhraseCandidates(phraseBank, week.cefr, phraseUsage, count);
    const generated = await jsonPost<{ items: Array<{ bankId: string; original: string; personalized: string; translation: string }> }>({
      task: "phrases",
      theme: week.theme,
      speechScript: week.speech!.scriptText,
      cefr: week.cefr,
      count,
      candidates: picked.items
    });
    if (generated.debug) addDebugTrace(makeClientTrace(generated.debug));
    const phraseSet: PhraseSet = {
      id: crypto.randomUUID(),
      weekId: week.id,
      dayIndex,
      cards: generated.data.items.map((item) => {
        const matchedCandidate = picked.items.find(
          (candidate) => candidate.id === item.bankId || normalizePhrase(candidate.phrase) === normalizePhrase(item.original)
        );
        return {
          id: crypto.randomUUID(),
          bankId: matchedCandidate?.id ?? item.bankId,
          original: matchedCandidate?.phrase ?? item.original,
          personalized: item.personalized,
          translation: item.translation,
          cefr: matchedCandidate?.cefr ?? "A1",
          dayIndex,
          cycle: picked.cycle,
          segment: makeSegment(item.personalized, week.podcastUserVoice, "user"),
          createdAt: new Date().toISOString()
        } satisfies PhraseCard;
      }),
      createdAt: new Date().toISOString()
    };
    savePhraseSet(phraseSet);
    incrementPhraseUsage(phraseSet.cards.map((card) => card.bankId));
    await prewarmPhraseAudio(phraseSet, auth);
    return phraseSet;
  });
};

export const ensurePodcastReady = async ({ week, auth, prefs, savePodcast, addDebugTrace }: PodcastArgs, dayIndex: number) => {
  const existing = week.podcasts.find((item) => item.dayIndex === dayIndex);
  if (existing) return existing;
  if (!week.speech) return null;

  return runOnce(`data:podcast:${week.id}:${dayIndex}`, async () => {
    const previousTitle = week.podcasts.find((item) => item.dayIndex === dayIndex - 1)?.title;
    const generated = await jsonPost<{ title: string; turns: Array<{ speaker: "Partner" | "User"; text: string }> }>({
      task: "podcast",
      theme: week.theme,
      note: week.note,
      speechScript: week.speech!.scriptText,
      dayIndex,
      previousTitle,
      userVoiceGender: prefs.podcastUserGender
    });
    if (generated.debug) addDebugTrace(makeClientTrace(generated.debug));
    const episode: PodcastEpisode = {
      id: crypto.randomUUID(),
      weekId: week.id,
      dayIndex,
      title: generated.data.title,
      wordCount: generated.data.turns.reduce((sum, turn) => sum + (turn.text.match(/[A-Za-z0-9']+/g) ?? []).length, 0),
      turns: generated.data.turns.map((turn) => ({
        id: crypto.randomUUID(),
        speaker: turn.speaker,
        text: turn.text,
        voice: turn.speaker === "Partner" ? week.podcastPartnerVoice : week.podcastUserVoice
      })),
      createdAt: new Date().toISOString()
    };
    savePodcast(episode);
    await prewarmPodcastAudio(episode, auth);
    return episode;
  });
};

export const ensureRetellingKeywordsReady = async ({ week, saveRetelling, addDebugTrace }: RetellingArgs, dayIndex: number) => {
  const existing = week.retellings.find((item) => item.dayIndex === dayIndex);
  if (existing) return existing;
  if (!week.speech) return null;

  return runOnce(`data:retelling:${week.id}:${dayIndex}`, async () => {
    const generated = await jsonPost<{ lines: Array<{ sourceText: string; keywords: string[] }> }>({
      task: "retell_keywords",
      sourceText: week.speech!.scriptText
    });
    if (generated.debug) addDebugTrace(makeClientTrace(generated.debug));
    const session: RetellingSession = {
      id: crypto.randomUUID(),
      weekId: week.id,
      dayIndex,
      keywordLines: generated.data.lines.map((line) => ({
        id: crypto.randomUUID(),
        sourceText: line.sourceText,
        keywords: line.keywords
      })),
      rounds: [
        { mode: "3", retries: 0 },
        { mode: "2", retries: 0 },
        { mode: "1", retries: 0 }
      ],
      createdAt: new Date().toISOString()
    };
    saveRetelling(session);
    return session;
  });
};

export const ensureExternalPromptReady = async ({ week, saveExternalPrompt, addDebugTrace }: ExternalPromptArgs, dayIndex: 6 | 7) => {
  const existing = week.externalPrompts.find((item) => item.dayIndex === dayIndex);
  if (existing) return existing;
  if (!week.speech) return null;

  return runOnce(`data:external-chat:${week.id}:${dayIndex}`, async () => {
    const latestPodcastTitle = week.podcasts.find((item) => item.dayIndex === dayIndex - 1)?.title;
    const generated = await jsonPost<{ promptText: string }>({
      task: "external_chat",
      theme: week.theme,
      speechScript: week.speech!.scriptText,
      podcastTitle: latestPodcastTitle,
      dayIndex
    });
    if (generated.debug) addDebugTrace(makeClientTrace(generated.debug));
    const prompt: ExternalChatPrompt = {
      id: crypto.randomUUID(),
      weekId: week.id,
      dayIndex,
      promptText: generated.data.promptText,
      createdAt: new Date().toISOString()
    };
    saveExternalPrompt(prompt);
    return prompt;
  });
};
