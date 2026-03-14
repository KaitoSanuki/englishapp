"use client";

import { useMemo, useRef, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { Language } from "@/lib/types";

const speeds = [0.7, 0.85, 1.0, 1.1];

export function TTSPlayer({ text, language }: { text: string; language: Language }) {
  const { state } = useAppState();
  const [speed, setSpeed] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ja = language === "ja";
  const sentences = useMemo(() => text.split(/(?<=[.!?])\s+/).map((v) => v.trim()).filter(Boolean), [text]);

  const stopAll = () => {
    window.speechSynthesis.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
  };

  const speakWeb = (payload: string) => {
    stopAll();
    const u = new SpeechSynthesisUtterance(payload);
    u.rate = speed;
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  };

  const speakGoogle = async (payload: string) => {
    stopAll();
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: payload, speakingRate: speed })
    });
    if (!res.ok) throw new Error("Google TTS failed");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => URL.revokeObjectURL(url);
    await audio.play();
  };

  const speak = async (payload: string) => {
    if (!payload) return;
    if (state.prefs.ttsEngine === "google") {
      try {
        await speakGoogle(payload);
        return;
      } catch {
        speakWeb(payload);
        return;
      }
    }
    speakWeb(payload);
  };

  return (
    <section className="glass rounded-xl2 p-4 space-y-3">
      <h3 className="text-base font-bold text-slate-900">{ja ? "読み上げ" : "TTS Player"}</h3>
      <p className="text-xs text-slate-700">{ja ? `エンジン: ${state.prefs.ttsEngine === "google" ? "Google TTS" : "Web Speech"}` : `Engine: ${state.prefs.ttsEngine === "google" ? "Google TTS" : "Web Speech"}`}</p>
      <div className="flex flex-wrap gap-2">
        {speeds.map((s) => (
          <button key={s} className={s === speed ? "btn-primary" : "btn-secondary"} onClick={() => setSpeed(s)}>
            x{s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" onClick={() => void speak(text)}>
          {ja ? "全文再生" : "Play All"}
        </button>
        <button className="btn-secondary" onClick={() => window.speechSynthesis.pause()}>
          {ja ? "一時停止" : "Pause"}
        </button>
        <button className="btn-secondary" onClick={stopAll}>
          {ja ? "停止" : "Stop"}
        </button>
      </div>
      <div className="space-y-2">
        {sentences.map((line, i) => (
          <button key={i} className="input text-left text-slate-900" onClick={() => void speak(line)}>
            {i + 1}. {line}
          </button>
        ))}
      </div>
    </section>
  );
}

