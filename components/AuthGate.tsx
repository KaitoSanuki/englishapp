"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/lib/app-state";

type Mode = "menu" | "signup" | "signin" | "onboarding";

type OnboardingCard = {
  titleJa: string;
  bodyJa: string;
  titleEn: string;
  bodyEn: string;
  video?: boolean;
};

const ONBOARDING_CARDS: OnboardingCard[] = [
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

export function AuthGate() {
  const { state, auth, signIn, signUp } = useAppState();
  const ja = state.language === "ja";
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("menu");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [onboardingIndex, setOnboardingIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  const needsGate = !dismissed && (auth.mode !== "user" || mode === "onboarding");
  if (!needsGate) return null;

  const startOnboarding = () => {
    setOnboardingIndex(0);
    setMode("onboarding");
  };

  const closeForGuest = () => {
    setDismissed(true);
  };

  const card = ONBOARDING_CARDS[onboardingIndex];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-auto">
        {mode === "onboarding" ? (
          <>
            <header className="space-y-1">
              <h1 className="text-xl font-black text-slate-900">{ja ? card.titleJa : card.titleEn}</h1>
              <p className="text-sm text-slate-700">{ja ? card.bodyJa : card.bodyEn}</p>
            </header>

            {card.video && (
              <div className="space-y-2">
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
              </div>
            )}

            <div className="flex gap-2">
              <button className="btn-secondary flex-1" onClick={closeForGuest}>
                {ja ? "説明をスキップ" : "Skip"}
              </button>
              <button
                className="btn-primary flex-1"
                onClick={() => {
                  if (onboardingIndex >= ONBOARDING_CARDS.length - 1) {
                    closeForGuest();
                    return;
                  }
                  setOnboardingIndex((v) => v + 1);
                }}
              >
                {onboardingIndex >= ONBOARDING_CARDS.length - 1 ? (ja ? "始める" : "Start") : ja ? "次へ" : "Next"}
              </button>
            </div>
            <p className="text-xs text-slate-500 text-center">
              {onboardingIndex + 1} / {ONBOARDING_CARDS.length}
            </p>
          </>
        ) : (
          <>
            <header className="space-y-1">
              <h1 className="text-xl font-black text-slate-900">{ja ? "English Loop へようこそ" : "Welcome to English Loop"}</h1>
              <p className="text-sm text-slate-700">
                {ja ? "開始方法を選んでください。" : "Choose how you want to start."}
              </p>
            </header>

            {mode === "menu" ? (
              <div className="space-y-2">
                {auth.enabled && (
                  <>
                    <button className="btn-primary w-full" onClick={() => setMode("signup")}>
                      {ja ? "新しくアカウントを作成する" : "Create New Account"}
                    </button>
                    <button className="btn-secondary w-full" onClick={() => setMode("signin")}>
                      {ja ? "ログインする" : "Sign In"}
                    </button>
                  </>
                )}
                <button className="btn-secondary w-full" onClick={startOnboarding}>
                  {ja ? "ゲストで始める" : "Continue as Guest"}
                </button>
                {!auth.enabled && <p className="text-xs text-rose-700">{ja ? "Supabase未設定のためゲストのみ利用可能です。" : "Supabase is not configured. Guest mode only."}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <input className="input text-slate-900" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input className="input text-slate-900" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button
                  className="btn-primary w-full"
                  disabled={auth.busy || !email || !password}
                  onClick={async () => {
                    setMessage("");
                    try {
                      if (mode === "signup") {
                        await signUp(email.trim(), password);
                        startOnboarding();
                      } else {
                        await signIn(email.trim(), password);
                        setMode("menu");
                      }
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : ja ? "認証に失敗しました。" : "Authentication failed.");
                    }
                  }}
                >
                  {mode === "signup" ? (ja ? "アカウント作成して続ける" : "Create Account") : ja ? "ログインして開始" : "Sign In"}
                </button>
                <button className="btn-secondary w-full" onClick={() => setMode("menu")}>
                  {ja ? "戻る" : "Back"}
                </button>
                {(message || auth.error) && <p className="text-xs text-rose-700">{message || auth.error}</p>}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
