"use client";

import { useRef, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { Language } from "@/lib/types";
import { getGoogleTtsBlob, playBlob, splitForTts } from "@/lib/google-tts-client";

const speeds = [0.7, 0.85, 1.0, 1.1];

export function TTSPlayer({ text, language }: { text: string; language: Language }) {
  const { state } = useAppState();
  const [speed, setSpeed] = useState(1.0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playIdRef = useRef(0);
  const ja = language === "ja";
  const sentences = splitForTts(text);

  const stopAll = () => {
    playIdRef.current += 1;
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

  const speakApi = async (payload: string) => {
    stopAll();
    const runId = playIdRef.current;
    const parts = splitForTts(payload);
    const provider = state.prefs.ttsEngine === "elevenlabs" ? "elevenlabs" : "google";
    for (const part of parts) {
      if (runId !== playIdRef.current) return;
      const blob = await getGoogleTtsBlob(part, speed, state.prefs.ttsModel, provider);
      if (!blob || runId !== playIdRef.current) return;
      await playBlob(blob, audioRef);
    }
  };

  const speak = async (payload: string) => {
    if (!payload) return;
    if (state.prefs.ttsEngine !== "web") {
      try {
        await speakApi(payload);
        return;
      } catch {
        speakWeb(payload);
        return;
      }
    }
    speakWeb(payload);
  };

  const engineLabel =
    state.prefs.ttsEngine === "google"
      ? `Google TTS (${state.prefs.ttsModel})`
      : state.prefs.ttsEngine === "elevenlabs"
        ? "ElevenLabs"
        : "Web Speech";

  return (
    <section className="glass rounded-xl2 p-4 space-y-3">
      <h3 className="text-base font-bold text-slate-900">{ja ? "読み上げ" : "TTS Player"}</h3>
      <p className="text-xs text-slate-700">{ja ? `エンジン: ${engineLabel}` : `Engine: ${engineLabel}`}</p>
      <div className="flex flex-wrap gap-2">
        {speeds.map((s) => (
          <button key={s} className={s === speed ? "btn-primary" : "btn-secondary"} onClick={() => setSpeed(s)}>
            x{s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" onClick={() => void speak(text)}>
          {ja ? "全文を再生" : "Play All"}
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
