"use client";

import { useMemo, useState } from "react";
import { Language } from "@/lib/types";

const speeds = [0.7, 0.85, 1.0, 1.1];

export function TTSPlayer({ text, language }: { text: string; language: Language }) {
  const [speed, setSpeed] = useState(1.0);
  const ja = language === "ja";
  const sentences = useMemo(() => text.split(/(?<=[.!?])\s+/).map((v) => v.trim()).filter(Boolean), [text]);

  const speak = (payload: string) => {
    if (!payload) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(payload);
    u.rate = speed;
    u.lang = "en-US";
    window.speechSynthesis.speak(u);
  };

  return (
    <section className="glass rounded-xl2 p-4 space-y-3">
      <h3 className="text-base font-bold text-slate-900">TTS Player</h3>
      <div className="flex flex-wrap gap-2">
        {speeds.map((s) => (
          <button key={s} className={s === speed ? "btn-primary" : "btn-secondary"} onClick={() => setSpeed(s)}>
            x{s}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button className="btn-primary" onClick={() => speak(text)}>
          {ja ? "全文再生" : "Play All"}
        </button>
        <button className="btn-secondary" onClick={() => window.speechSynthesis.pause()}>
          {ja ? "一時停止" : "Pause"}
        </button>
        <button className="btn-secondary" onClick={() => window.speechSynthesis.cancel()}>
          {ja ? "停止" : "Stop"}
        </button>
      </div>
      <div className="space-y-2">
        {sentences.map((line, i) => (
          <button key={i} className="input text-left text-slate-900" onClick={() => speak(line)}>
            {i + 1}. {line}
          </button>
        ))}
      </div>
    </section>
  );
}
