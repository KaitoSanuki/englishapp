"use client";

import { useMemo, useRef, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { getGoogleTtsBlob, playBlob, splitForTts } from "@/lib/google-tts-client";

export default function MaterialsPage() {
  const { state, activeWeek, setActiveWeek, toggleWeekFavorite } = useAppState();
  const ja = state.language === "ja";
  const favoriteCount = state.weeks.filter((w) => w.isFavorite).length;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playIdRef = useRef(0);
  const [playingKey, setPlayingKey] = useState("");

  const orderedWeeks = useMemo(
    () => [...state.weeks].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()),
    [state.weeks]
  );

  const stopPlayback = () => {
    playIdRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingKey("");
  };

  const playMaterialAudio = async (key: string, text: string, model: "standard" | "wavenet", rate: number) => {
    if (!text.trim()) return;
    stopPlayback();
    const runId = playIdRef.current;
    setPlayingKey(key);
    try {
      for (const part of splitForTts(text)) {
        if (runId !== playIdRef.current) return;
        const blob = await getGoogleTtsBlob(part, rate, model);
        if (!blob || runId !== playIdRef.current) return;
        await playBlob(blob, audioRef);
      }
    } finally {
      if (runId === playIdRef.current) setPlayingKey("");
    }
  };

  return (
    <div className="space-y-4">
      <section className="glass rounded-xl2 p-4">
        <h1 className="text-xl font-black text-slate-900">{ja ? "教材" : "Materials"}</h1>
        <p className="text-sm text-slate-900">{ja ? "テーマごとの台本・教材音声・録音を見返せます（最新10件 + お気に入り）" : "Review scripts, model audios, and recordings by theme (latest 10 + favorites)."}</p>
      </section>

      {orderedWeeks.map((week) => {
        const day1Script = [...state.scripts]
          .filter((s) => s.weekId === week.id)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
        const day2Script = [...state.roleplays]
          .filter((r) => r.weekId === week.id)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
        const audios = [...state.audioRecords].filter((a) => a.weekId === week.id).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const materialDay1 = state.materialAudios.find((m) => m.weekId === week.id && m.kind === "day1_full");
        const materialDay2 = state.materialAudios.find((m) => m.weekId === week.id && m.kind === "day2_full");

        return (
          <section key={week.id} className={`glass rounded-xl2 p-4 space-y-3 ${week.id === activeWeek.id ? "ring-2 ring-accent/40" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">{week.topicTitle}</h2>
                <p className="text-xs text-slate-700">
                  {week.startDate} / CEFR {week.cefr}
                </p>
              </div>
              <div className="flex gap-2">
                <button className="btn-secondary" onClick={() => setActiveWeek(week.id)}>
                  {ja ? "開く" : "Open"}
                </button>
                <button className="btn-secondary" onClick={() => toggleWeekFavorite(week.id)} disabled={!week.isFavorite && favoriteCount >= 9}>
                  {week.isFavorite ? (ja ? "★ お気に入り" : "★ Favorite") : ja ? "☆ お気に入り" : "☆ Favorite"}
                </button>
              </div>
            </div>

            <article className="input">
              <p className="text-xs font-semibold text-slate-700">{ja ? "1日目 台本" : "Day 1 Script"}</p>
              <p className="text-sm text-slate-900 whitespace-pre-wrap">{day1Script?.enScript || (ja ? "まだありません。" : "No data yet.")}</p>
            </article>

            <article className="input">
              <p className="text-xs font-semibold text-slate-700">{ja ? "2日目 添削台本" : "Day 2 Corrected Script"}</p>
              <p className="text-sm text-slate-900 whitespace-pre-wrap">{day2Script?.correctionText || (ja ? "まだありません。" : "No data yet.")}</p>
            </article>

            <article className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">{ja ? "教材音声（全文）" : "Model Audio (Full Script)"}</p>
              <div className="input space-y-2">
                <p className="text-sm text-slate-900">{ja ? "1日目台本 音声" : "Day 1 script audio"}</p>
                {materialDay1 ? (
                  <button className="btn-secondary" onClick={() => void playMaterialAudio(`${week.id}:day1`, materialDay1.text, materialDay1.model, materialDay1.speakingRate)}>
                    {playingKey === `${week.id}:day1` ? (ja ? "再生中..." : "Playing...") : ja ? "再生" : "Play"}
                  </button>
                ) : (
                  <p className="text-sm text-slate-700">{ja ? "まだ保存されていません。" : "Not saved yet."}</p>
                )}
              </div>
              <div className="input space-y-2">
                <p className="text-sm text-slate-900">{ja ? "2日目台本 音声" : "Day 2 script audio"}</p>
                {materialDay2 ? (
                  <button className="btn-secondary" onClick={() => void playMaterialAudio(`${week.id}:day2`, materialDay2.text, materialDay2.model, materialDay2.speakingRate)}>
                    {playingKey === `${week.id}:day2` ? (ja ? "再生中..." : "Playing...") : ja ? "再生" : "Play"}
                  </button>
                ) : (
                  <p className="text-sm text-slate-700">{ja ? "まだ保存されていません。" : "Not saved yet."}</p>
                )}
              </div>
              {playingKey && (
                <button className="btn-secondary" onClick={stopPlayback}>
                  {ja ? "停止" : "Stop"}
                </button>
              )}
            </article>

            <article className="space-y-2">
              <p className="text-xs font-semibold text-slate-700">{ja ? "録音" : "Recordings"}</p>
              {audios.length ? (
                audios.map((audio) => (
                  <div key={audio.id} className="input space-y-1">
                    <p className="text-xs text-slate-700">
                      {audio.type} / {new Date(audio.createdAt).toLocaleString()}
                    </p>
                    <audio controls src={audio.blobUrl} className="w-full" />
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-900">{ja ? "まだありません。" : "No data yet."}</p>
              )}
            </article>
          </section>
        );
      })}
    </div>
  );
}

