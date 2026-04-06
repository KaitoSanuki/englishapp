"use client";

import { useEffect, useState } from "react";
import { Language } from "@/lib/types";

export const INTRO_SKIP_KEY = "englishapp_intro_skip_v2";

type IntroCard = {
  titleJa: string;
  bodyJa: string;
  titleEn: string;
  bodyEn: string;
  video?: boolean;
};

const INTRO_CARDS: IntroCard[] = [
  {
    titleJa: "このアプリでやること",
    bodyJa: "1週間で1テーマを深めます。1分スピーチ、Oxford Phrase、Podcast、3-2-1リテリングを、迷わず順番どおり進めます。",
    titleEn: "What This App Does",
    bodyEn: "You go deep on one theme per week through a guided flow: speech, Oxford phrases, podcast, and retelling."
  },
  {
    titleJa: "学習の進め方",
    bodyJa: "学習中はカードだけに集中します。色付け音読やオーバーラッピングで、聞く・読む・話すをつなげて練習します。",
    titleEn: "How You Practice",
    bodyEn: "During lessons, you focus on one card at a time. Listening, marking rhythm, and overlapping are connected in one flow."
  },
  {
    titleJa: "もとにしている動画",
    bodyJa: "この動画で紹介されている学習フローを、毎日迷わず回せるようにアプリ化しています。必要なときにここで見返せます。",
    titleEn: "Base Learning Video",
    bodyEn: "This app is built around the study flow shown in this video. You can watch it again here whenever you want.",
    video: true
  },
  {
    titleJa: "準備できました",
    bodyJa: "「今日のレッスン」を開いて、その日のカードに沿って進めましょう。",
    titleEn: "You Are Ready",
    bodyEn: "Open Today Lesson and follow the cards for the day."
  }
];

export const shouldSkipIntro = () => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(INTRO_SKIP_KEY) === "1";
};

export function AppIntroModal({ open, language, onClose }: { open: boolean; language: Language; onClose: () => void }) {
  const ja = language === "ja";
  const [index, setIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (open) {
      setIndex(0);
      setDontShowAgain(false);
    }
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
                setIndex((value) => value + 1);
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

