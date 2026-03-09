"use client";

import { useEffect, useState } from "react";
import { Language } from "@/lib/types";

export function Timer321({ onSave, language }: { onSave: (mode: "3" | "2" | "1", sec: number, rating: number, notes: string) => void; language: Language }) {
  const [mode, setMode] = useState<"3" | "2" | "1">("3");
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(180);
  const [rating, setRating] = useState(3);
  const [notes, setNotes] = useState("");
  const ja = language === "ja";

  useEffect(() => setRemaining(Number(mode) * 60), [mode]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  return (
    <section className="glass rounded-xl2 p-4 space-y-3">
      <h3 className="text-base font-bold text-slate-900">3-2-1 Timer</h3>
      <div className="flex gap-2">
        {(["3", "2", "1"] as const).map((m) => (
          <button key={m} className={m === mode ? "btn-primary" : "btn-secondary"} onClick={() => setMode(m)}>
            {m}:00
          </button>
        ))}
      </div>
      <p className="text-3xl font-black tabular-nums">
        {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
      </p>
      <div className="flex gap-2">
        <button className="btn-primary" onClick={() => setRunning((v) => !v)}>
          {running ? (ja ? "停止" : "Stop") : ja ? "開始" : "Start"}
        </button>
        <button className="btn-secondary" onClick={() => setRemaining(Number(mode) * 60)}>
          {ja ? "リセット" : "Reset"}
        </button>
      </div>
      <label className="text-sm text-slate-900">{ja ? `詰まり度: ${rating}` : `Hesitation: ${rating}`}</label>
      <input type="range" min={1} max={5} value={rating} onChange={(e) => setRating(Number(e.target.value))} className="w-full" />
      <textarea className="input text-slate-900" placeholder={ja ? "詰まった表現メモ" : "Where you got stuck"} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button className="btn-secondary" onClick={() => onSave(mode, Number(mode) * 60 - remaining, rating, notes)}>
        {ja ? "記録を保存" : "Save Record"}
      </button>
    </section>
  );
}
