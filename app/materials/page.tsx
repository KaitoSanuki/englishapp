"use client";

import { useMemo, useRef, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { phraseBank, cefrRank } from "@/lib/phrase-bank";
import { getTokenStyle } from "@/lib/lesson-utils";
import { getSpeechBlob, playBlob, stopAudio } from "@/lib/audio-client";
import { CEFR, LessonSegment, PhraseCard, PodcastEpisode, SpeechMaterial } from "@/lib/types";

const cefrs: Exclude<CEFR, "C2">[] = ["A1", "A2", "B1", "B2", "C1"];

type MaterialTab = "speech" | "podcast" | "phrases";

function SegmentText({ segment }: { segment: LessonSegment }) {
  return (
    <p className="text-sm leading-7 text-slate-900 whitespace-pre-wrap">
      {segment.tokens.map((token) => {
        const style = getTokenStyle(token.weight);
        return (
          <span key={token.id} style={style}>
            {token.text}
          </span>
        );
      })}
    </p>
  );
}

export default function MaterialsPage() {
  const { state, activeWeek, setActiveWeek } = useAppState();
  const ja = state.language === "ja";
  const [tab, setTab] = useState<MaterialTab>("speech");
  const [selectedPodcastId, setSelectedPodcastId] = useState<string | undefined>(activeWeek.podcasts[0]?.id);
  const [selectedStamp, setSelectedStamp] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingKey, setPlayingKey] = useState("");

  const orderedWeeks = useMemo(
    () => [...state.weeks].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [state.weeks]
  );

  const selectedPodcast = activeWeek.podcasts.find((episode) => episode.id === selectedPodcastId) ?? activeWeek.podcasts[0];

  const playText = async (key: string, text: string, voice: string) => {
    if (!text.trim()) return;
    stopAudio(audioRef);
    setPlayingKey(key);
    try {
      const blob = await getSpeechBlob(text, voice);
      if (!blob) return;
      await playBlob(blob, audioRef);
    } finally {
      setPlayingKey("");
    }
  };

  const playPodcastEpisode = async (episode: PodcastEpisode) => {
    stopAudio(audioRef);
    setPlayingKey(`podcast:${episode.id}`);
    try {
      for (const turn of episode.turns) {
        const blob = await getSpeechBlob(turn.text, turn.voice);
        if (!blob) return;
        await playBlob(blob, audioRef);
      }
    } finally {
      setPlayingKey("");
    }
  };

  const phraseHistory = useMemo(() => {
    const map = new Map<string, PhraseCard[]>();
    for (const week of state.weeks) {
      for (const set of week.phraseSets) {
        for (const card of set.cards) {
          const current = map.get(card.bankId) ?? [];
          current.push(card);
          map.set(card.bankId, current);
        }
      }
    }
    return map;
  }, [state.weeks]);

  const currentCefrLimit = activeWeek.cefr === "C2" ? "C1" : activeWeek.cefr;

  return (
    <div className="space-y-4">
      <section className="glass rounded-xl2 p-4 space-y-2">
        <h1 className="text-xl font-black text-slate-900">{ja ? "教材" : "Materials"}</h1>
        <p className="text-sm text-slate-700">
          {ja ? "1分スピーチ・Podcast・Oxford Phrase をいつでも見返せます。" : "Review your weekly speech, podcasts, and Oxford Phrase cards anytime."}
        </p>
      </section>

      <section className="glass rounded-xl2 p-4 space-y-3">
        <h2 className="text-base font-bold text-slate-900">{ja ? "週を選ぶ" : "Choose Week"}</h2>
        <div className="flex flex-wrap gap-2">
          {orderedWeeks.map((week) => (
            <button key={week.id} className={week.id === activeWeek.id ? "btn-primary" : "btn-secondary"} onClick={() => setActiveWeek(week.id)}>
              {week.theme || (ja ? "未設定テーマ" : "Untitled Theme")}
            </button>
          ))}
        </div>
      </section>

      <section className="glass rounded-xl2 p-4 space-y-3">
        <div className="flex gap-2">
          {([
            ["speech", ja ? "1分スピーチ" : "Speech"],
            ["podcast", "Podcast"],
            ["phrases", "Oxford Phrase"]
          ] as const).map(([value, label]) => (
            <button key={value} className={tab === value ? "btn-primary" : "btn-secondary"} onClick={() => setTab(value)}>
              {label}
            </button>
          ))}
        </div>

        {tab === "speech" && (
          <div className="space-y-3">
            {activeWeek.speech ? (
              <>
                <article className="input space-y-2">
                  <p className="text-xs font-semibold text-slate-700">{ja ? "テーマ" : "Theme"}</p>
                  <p className="text-base font-bold text-slate-900">{activeWeek.speech.theme}</p>
                  <p className="text-xs font-semibold text-slate-700">CEFR {activeWeek.speech.cefr}</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{activeWeek.speech.note}</p>
                </article>
                <article className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary"
                      onClick={() =>
                        void playText(
                          "speech:full",
                          activeWeek.speech?.segments.map((segment) => segment.text).join(" ") ?? "",
                          activeWeek.speech?.segments[0]?.voice ?? activeWeek.podcastUserVoice
                        )
                      }
                    >
                      {playingKey === "speech:full" ? (ja ? "再生中..." : "Playing...") : ja ? "全文を再生" : "Play Full Script"}
                    </button>
                    <button className="btn-secondary" onClick={() => stopAudio(audioRef)}>
                      {ja ? "停止" : "Stop"}
                    </button>
                  </div>
                  {activeWeek.speech.segments.map((segment, index) => (
                    <div key={segment.id} className="input space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-slate-700">{ja ? `文 ${index + 1}` : `Sentence ${index + 1}`}</p>
                        <button className="btn-secondary" onClick={() => void playText(`speech:${segment.id}`, segment.text, segment.voice)}>
                          {playingKey === `speech:${segment.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "再生" : "Play"}
                        </button>
                      </div>
                      <SegmentText segment={segment} />
                    </div>
                  ))}
                </article>
              </>
            ) : (
              <p className="text-sm text-slate-700">{ja ? "まだ1分スピーチは生成されていません。" : "The 1-minute speech has not been generated yet."}</p>
            )}
          </div>
        )}

        {tab === "podcast" && (
          <div className="space-y-3">
            {activeWeek.podcasts.length ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {activeWeek.podcasts
                    .slice()
                    .sort((a, b) => a.dayIndex - b.dayIndex)
                    .map((episode) => (
                      <button
                        key={episode.id}
                        className={selectedPodcast?.id === episode.id ? "btn-primary" : "btn-secondary"}
                        onClick={() => setSelectedPodcastId(episode.id)}
                      >
                        {ja ? `${episode.dayIndex}日目` : `Day ${episode.dayIndex}`}
                      </button>
                    ))}
                </div>
                {selectedPodcast && (
                  <article className="space-y-3">
                    <div className="input space-y-1">
                      <p className="text-xs font-semibold text-slate-700">{ja ? `Day ${selectedPodcast.dayIndex}` : `Day ${selectedPodcast.dayIndex}`}</p>
                      <h3 className="text-lg font-bold text-slate-900">{selectedPodcast.title}</h3>
                      <p className="text-sm text-slate-600">{selectedPodcast.wordCount} words</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="btn-secondary" onClick={() => void playPodcastEpisode(selectedPodcast)}>
                        {playingKey === `podcast:${selectedPodcast.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "通しで再生" : "Play Episode"}
                      </button>
                      <button className="btn-secondary" onClick={() => stopAudio(audioRef)}>
                        {ja ? "停止" : "Stop"}
                      </button>
                    </div>
                    <div className="space-y-2">
                      {selectedPodcast.turns.map((turn, index) => (
                        <div key={turn.id} className="input space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold text-slate-700">
                              {turn.speaker} {index + 1}
                            </p>
                            <button className="btn-secondary" onClick={() => void playText(`turn:${turn.id}`, turn.text, turn.voice)}>
                              {playingKey === `turn:${turn.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "再生" : "Play"}
                            </button>
                          </div>
                          <p className="text-sm text-slate-900 whitespace-pre-wrap">{turn.text}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-700">{ja ? "まだPodcastは生成されていません。" : "No podcast has been generated yet."}</p>
            )}
          </div>
        )}

        {tab === "phrases" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-700">
              {ja
                ? "押されたスタンプをタップすると、そのフレーズの過去カードを見返せます。"
                : "Tap a stamped phrase to review its past personalized cards."}
            </p>
            {cefrs.map((cefr) => {
              const bankItems = phraseBank.filter((item) => item.cefr === cefr);
              const locked = cefrRank[cefr] > cefrRank[currentCefrLimit];
              return (
                <article key={cefr} className="space-y-2 rounded-2xl border border-slate-200 bg-white/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-slate-900">{cefr}</h3>
                    {locked && <span className="text-xs font-semibold text-slate-500">{ja ? "ロック中" : "Locked"}</span>}
                  </div>
                  <div className="grid grid-cols-5 gap-2 sm:grid-cols-6">
                    {bankItems.map((item) => {
                      const used = phraseHistory.get(item.id)?.length ?? 0;
                      return (
                        <button
                          key={item.id}
                          className={`rounded-full border px-2 py-3 text-xs font-semibold ${
                            used > 0 ? "border-accent bg-accent/10 text-accent" : locked ? "border-slate-200 bg-slate-100 text-slate-400" : "border-slate-300 bg-white text-slate-500"
                          }`}
                          disabled={used === 0}
                          onClick={() => setSelectedStamp(item.id)}
                        >
                          {used > 0 ? used : "-"}
                        </button>
                      );
                    })}
                  </div>
                </article>
              );
            })}
            {selectedStamp && (
              <article className="rounded-2xl border border-slate-200 bg-white/80 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">{ja ? "過去カード" : "Past Cards"}</h3>
                  <button className="btn-secondary" onClick={() => setSelectedStamp(null)}>
                    {ja ? "閉じる" : "Close"}
                  </button>
                </div>
                {(phraseHistory.get(selectedStamp) ?? []).map((card) => (
                  <div key={card.id} className="input space-y-2">
                    <p className="text-xs text-slate-500">{card.cefr} / Day {card.dayIndex} / cycle {card.cycle}</p>
                    <p className="text-xs text-slate-500">{card.original}</p>
                    <p className="text-base font-bold text-slate-900">{card.personalized}</p>
                    <p className="text-sm text-slate-700">{card.translation}</p>
                    <SegmentText segment={card.segment} />
                    <button className="btn-secondary" onClick={() => void playText(`phrase:${card.id}`, card.segment.text, card.segment.voice)}>
                      {playingKey === `phrase:${card.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "再生" : "Play"}
                    </button>
                  </div>
                ))}
              </article>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

