"use client";

import { useEffect, useState } from "react";
import { Language } from "@/lib/types";

export const INTRO_SKIP_KEY = "englishapp_intro_skip_v1";

type IntroCard = {
  titleJa: string;
  bodyJa: string;
  titleEn: string;
  bodyEn: string;
  video?: boolean;
};

const INTRO_CARDS: IntroCard[] = [
  {
    titleJa: "このアプリの目的",
    bodyJa: "次に何をするか迷わず、1週間の英会話トレーニングを回せるようにします。",
    titleEn: "What This App Does",
    bodyEn: "It guides you through a weekly speaking cycle so you never wonder what to do next."
  },
  {
    titleJa: "学習の進め方",
    bodyJa: "Promptを使ってAIと練習し、台本・音読・録音・レビューを1つの流れで進めます。",
    titleEn: "How You Train",
    bodyEn: "Use prompts to practice with AI, then keep scripts, read-aloud, recording, and review in one flow."
  },
  {
    titleJa: "元にしている動画",
    bodyJa: "この動画の学習フローをアプリ化しています。必要ならここで確認できます。",
    titleEn: "Base Learning Video",
    bodyEn: "This app is based on the workflow in this video. Watch it here when needed.",
    video: true
  },
  {
    titleJa: "準備OKです",
    bodyJa: "今日のレッスンタブに進んで、カードの案内に沿って進めてください。",
    titleEn: "You Are Ready",
    bodyEn: "Open Today Lesson and follow each card."
  }
];

export const shouldSkipIntro = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(INTRO_SKIP_KEY) === "1";
};

export function AppIntroModal({
  open,
  language,
  onClose
}: {
  open: boolean;
  language: Language;
  onClose: () => void;
}) {
  const ja = language === "ja";
  const [index, setIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  if (!open) return null;

  const card = INTRO_CARDS[index];

  const finish = () => {
    if (dontShowAgain && typeof window !== "undefined") {
      localStorage.setItem(INTRO_SKIP_KEY, "1");
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-auto">
        <header className="space-y-1">
          <h1 className="text-xl font-black text-slate-900">{ja ? card.titleJa : card.titleEn}</h1>
          <p className="text-sm text-slate-700">{ja ? card.bodyJa : card.bodyEn}</p>
        </header>

        {card.video && (
          <div className="relative w-full overflow-hidden rounded-xl border border-slate-200" style={{ paddingTop: "56.25%" }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src="https://www.youtube.com/embed/FBYdtxOQb18"
              title="English training flow video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={dontShowAgain} onChange={(e) => setDontShowAgain(e.target.checked)} />
          {ja ? "次からは表示しない" : "Do not show this again"}
        </label>

        <div className="flex gap-2">
          <button className="btn-secondary flex-1" onClick={finish}>
            {ja ? "説明をスキップ" : "Skip"}
          </button>
          <button
            className="btn-primary flex-1"
            onClick={() => {
              if (index >= INTRO_CARDS.length - 1) {
                finish();
              } else {
                setIndex((v) => v + 1);
              }
            }}
          >
            {index >= INTRO_CARDS.length - 1 ? (ja ? "始める" : "Start") : ja ? "次へ" : "Next"}
          </button>
        </div>
        <p className="text-xs text-slate-500 text-center">
          {index + 1} / {INTRO_CARDS.length}
        </p>
      </section>
    </div>
  );
}
