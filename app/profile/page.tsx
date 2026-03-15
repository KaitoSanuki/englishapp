"use client";

import { useState } from "react";
import { useAppState } from "@/lib/app-state";
import { CEFR } from "@/lib/types";
import { AppIntroModal } from "@/components/AppIntroModal";

const cefrs: CEFR[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const JA = {
  title: "設定 / ヘルプ",
  desc: "Prompt-first運用。v0.xではAPI連携なし。",
  language: "表示言語",
  auth: "アカウント",
  ttsEngine: "読み上げエンジン",
  ttsModel: "Google音声モデル",
  defaultCefr: "デフォルト CEFR",
  defaultDesc: "「今日のレッスン」タブでデフォルトとして提案されます。",
  glossary: "用語ヘルプ"
};

const glossaryEn = [
  ["Personal topic", "A topic from your real life that you actually use in conversation."],
  ["Backward design", "Define speaking goal first, then learn only what you need."],
  ["Stacking learning", "Input-heavy learning before speaking practice."],
  ["1-minute speech", "Your own script that can be spoken in around one minute."],
  ["Model audio", "Reference audio for checking pronunciation and rhythm."],
  ["Read aloud", "Reading text aloud to internalize sounds and rhythm."],
  ["Shadowing", "Repeat right after audio with a small delay."],
  ["Retelling", "Re-express content in your own words."],
  ["3-2-1 retelling", "Retell in 3, 2, then 1 minute."],
  ["Materialization", "Turn corrected output into reusable study material."]
];

const glossaryJa = [
  ["自分ごとトピック", "実際に話す機会がある話題。"],
  ["逆算型学習", "先に話せる状態を決めて必要な部分だけ学ぶ方法。"],
  ["積み上げ型学習", "大量インプットを先に積む学習法。"],
  ["1分間スピーチ", "1分程度で話せる自分専用の台本。"],
  ["モデル音声", "発音とリズム確認のための参考音声。"],
  ["音読", "英文を声に出して読む練習。"],
  ["シャドーイング", "音声に少し遅れて追従する練習。"],
  ["リテリング", "内容を自分の言葉で言い直す練習。"],
  ["3-2-1リテリング", "3分→2分→1分で同内容を話す。"],
  ["教材化", "添削結果を復習教材として再利用すること。"]
];

export default function ProfilePage() {
  const { state, auth, setLanguage, setDefaultCefr, setTtsEngine, setTtsModel, signIn, signUp, signOut, syncNow } = useAppState();
  const ja = state.language === "ja";
  const glossary = ja ? glossaryJa : glossaryEn;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showIntro, setShowIntro] = useState(false);

  const doSignIn = async () => {
    setMessage("");
    try {
      await signIn(email.trim(), password);
      setMessage(ja ? "ログインしました。" : "Signed in.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign in failed.");
    }
  };

  const doSignUp = async () => {
    setMessage("");
    try {
      await signUp(email.trim(), password);
      setMessage(ja ? "Supabase Authから確認メールが届きます。メール確認後にログインしてください。" : "Confirmation email sent. Confirm email, then sign in.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Sign up failed.");
    }
  };

  const canUseGoogleTts = auth.mode === "user";
  const canUseElevenLabs = auth.mode === "user" && auth.plan === "pro";

  return (
    <div className="space-y-4">
      <AppIntroModal open={showIntro} language={state.language} onClose={() => setShowIntro(false)} />

      <section className="glass rounded-xl2 p-4">
        <h1 className="text-xl font-black text-slate-900">{ja ? JA.title : "Profile / Help"}</h1>
        <p className="text-sm text-slate-900">{ja ? JA.desc : "Prompt-first workflow. API execution is out of scope in v0.x."}</p>
      </section>

      <section className="glass rounded-xl2 p-4 space-y-3">
        <h2 className="text-base font-bold text-slate-900">{ja ? JA.auth : "Account"}</h2>
        {!auth.enabled && <p className="text-sm text-rose-700">{ja ? "Supabaseの環境変数が未設定です。" : "Supabase env vars are missing."}</p>}
        <p className="text-sm text-slate-900">
          {auth.mode === "user"
            ? `${ja ? "ログイン中" : "Signed in"}: ${auth.email || auth.userId} / Plan: ${auth.plan.toUpperCase()}`
            : ja
              ? "現在はゲストモードです。"
              : "Currently in guest mode."}
        </p>
        {auth.mode !== "user" ? (
          <div className="space-y-2">
            <input className="input text-slate-900" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="input text-slate-900" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="flex gap-2">
              <button className="btn-primary" onClick={() => void doSignIn()} disabled={auth.busy || !email || !password}>
                {ja ? "ログイン" : "Sign In"}
              </button>
              <button className="btn-secondary" onClick={() => void doSignUp()} disabled={auth.busy || !email || !password}>
                {ja ? "新規登録" : "Sign Up"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => void syncNow()}>
              {ja ? "今すぐ同期" : "Sync Now"}
            </button>
            <button className="btn-secondary" onClick={signOut}>
              {ja ? "ログアウト" : "Sign Out"}
            </button>
          </div>
        )}
        <button className="btn-secondary w-full" onClick={() => setShowIntro(true)}>
          {ja ? "アプリ説明を見る" : "View App Intro"}
        </button>
        {(message || auth.error) && <p className="text-xs text-slate-900">{message || auth.error}</p>}
      </section>

      <section className="glass rounded-xl2 p-4 space-y-3">
        <h2 className="text-base font-bold text-slate-900">{ja ? JA.language : "Display Language"}</h2>
        <div className="flex gap-2">
          <button className={state.language === "en" ? "btn-primary" : "btn-secondary"} onClick={() => setLanguage("en")}>
            English
          </button>
          <button className={state.language === "ja" ? "btn-primary" : "btn-secondary"} onClick={() => setLanguage("ja")}>
            日本語
          </button>
        </div>
      </section>

      <section className="glass rounded-xl2 p-4 space-y-3">
        <h2 className="text-base font-bold text-slate-900">{ja ? JA.ttsEngine : "TTS Engine"}</h2>
        <div className="flex flex-wrap gap-2">
          <button className={state.prefs.ttsEngine === "web" ? "btn-primary" : "btn-secondary"} onClick={() => setTtsEngine("web")}>
            Web Speech
          </button>
          <button
            className={state.prefs.ttsEngine === "google" ? "btn-primary" : "btn-secondary"}
            onClick={() => setTtsEngine("google")}
            disabled={!canUseGoogleTts}
          >
            Google TTS
          </button>
          <button
            className={state.prefs.ttsEngine === "elevenlabs" ? "btn-primary" : "btn-secondary"}
            onClick={() => setTtsEngine("elevenlabs")}
            disabled={!canUseElevenLabs}
          >
            ElevenLabs
          </button>
        </div>
        <p className="text-xs text-slate-900">{ja ? "ElevenLabs は Pro プラン専用です。" : "ElevenLabs is available for Pro plan only."}</p>
        {auth.mode !== "user" && <p className="text-xs text-slate-900">{ja ? "ゲストは Web Speech のみ利用できます。" : "Guest mode supports Web Speech only."}</p>}
      </section>

      {state.prefs.ttsEngine === "google" && (
        <section className="glass rounded-xl2 p-4 space-y-3">
          <h2 className="text-base font-bold text-slate-900">{ja ? JA.ttsModel : "Google Model"}</h2>
          <div className="flex gap-2">
            <button className={state.prefs.ttsModel === "standard" ? "btn-primary" : "btn-secondary"} onClick={() => setTtsModel("standard")}>
              Standard
            </button>
            <button className={state.prefs.ttsModel === "wavenet" ? "btn-primary" : "btn-secondary"} onClick={() => setTtsModel("wavenet")}>
              WaveNet
            </button>
          </div>
        </section>
      )}

      <section className="glass rounded-xl2 p-4 space-y-3">
        <h2 className="text-base font-bold text-slate-900">{ja ? JA.defaultCefr : "Default CEFR"}</h2>
        <select className="input text-slate-900" value={state.prefs.defaultCefr} onChange={(e) => setDefaultCefr(e.target.value as CEFR)}>
          {cefrs.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-900">{ja ? JA.defaultDesc : "Used as suggested CEFR in the Today tab flow."}</p>
      </section>

      <section className="glass rounded-xl2 p-4 space-y-2">
        <h2 className="text-base font-bold text-slate-900">{ja ? JA.glossary : "Glossary"}</h2>
        {glossary.map(([term, desc]) => (
          <article className="input" key={term}>
            <p className="font-semibold text-slate-900">{term}</p>
            <p className="text-sm text-slate-900">{desc}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
