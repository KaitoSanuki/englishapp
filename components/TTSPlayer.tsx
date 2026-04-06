"use client";

import { useRef, useState } from "react";
import { Language } from "@/lib/types";
import { getSpeechBlob, playBlob, stopAudio } from "@/lib/audio-client";

export function TTSPlayer({ text, language, voice = "alloy" }: { text: string; language: Language; voice?: string }) {
  const ja = language === "ja";
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const play = async () => {
    if (!text.trim()) return;
    setPlaying(true);
    try {
      const blob = await getSpeechBlob(text, voice);
      if (!blob) return;
      await playBlob(blob, audioRef);
    } finally {
      setPlaying(false);
    }
  };

  return (
    <section className="glass rounded-xl2 p-4 space-y-3">
      <h3 className="text-base font-bold text-slate-900">{ja ? "読み上げ" : "Audio"}</h3>
      <p className="text-sm text-slate-900 whitespace-pre-wrap">{text}</p>
      <div className="flex gap-2">
        <button className="btn-primary" onClick={() => void play()} disabled={playing}>
          {playing ? (ja ? "再生中..." : "Playing...") : ja ? "再生" : "Play"}
        </button>
        <button className="btn-secondary" onClick={() => stopAudio(audioRef)}>
          {ja ? "停止" : "Stop"}
        </button>
      </div>
    </section>
  );
}

