"use client";

import { useMemo, useState } from "react";
import { Language } from "@/lib/types";

export function PromptCard({
  title,
  prompt,
  language,
  onSavePaste
}: {
  title: string;
  prompt: string;
  language: Language;
  onSavePaste?: (value: string) => void;
}) {
  const [text, setText] = useState("");
  const [toast, setToast] = useState("");
  const chars = useMemo(() => prompt.length, [prompt]);
  const ja = language === "ja";

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 1200);
  };

  return (
    <section className="glass rounded-xl2 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-slate-900">{title}</h3>
        <span className="text-xs text-slate-600">{chars} chars</span>
      </div>
      <textarea className="input min-h-36 text-slate-900" value={prompt} readOnly />
      <button
        className="btn-primary"
        onClick={async () => {
          await navigator.clipboard.writeText(prompt);
          notify(ja ? "コピーしました" : "Copied");
        }}
      >
        {ja ? "プロンプトをコピー" : "Copy Prompt"}
      </button>
      {onSavePaste && (
        <>
          <textarea
            className="input min-h-28 text-slate-900"
            placeholder={ja ? "ChatGPTの返答を貼り付け" : "Paste ChatGPT result"}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            className="btn-secondary"
            onClick={() => {
              onSavePaste(text);
              notify(ja ? "保存しました" : "Saved");
            }}
          >
            {ja ? "貼り付け内容を保存" : "Save Pasted Content"}
          </button>
        </>
      )}
      {toast && <p className="text-xs text-accent font-semibold">{toast}</p>}
    </section>
  );
}
