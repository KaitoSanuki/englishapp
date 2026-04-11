"use client";

import { useMemo, useState } from "react";
import { AppIntroModal } from "@/components/AppIntroModal";
import { useAppState } from "@/lib/app-state";
import { CEFR } from "@/lib/types";

const cefrs: CEFR[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const formatDebugValue = (value: unknown) => {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

function DebugValueBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-700">{label}</p>
      <pre className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-2xl bg-slate-50 p-3 text-xs text-slate-700">
        {formatDebugValue(value)}
      </pre>
    </div>
  );
}

export default function ProfilePage() {
  const {
    state,
    auth,
    canUseAdminMode,
    setLanguage,
    setDefaultCefr,
    setPodcastUserGender,
    setAdminDebugEnabled,
    signIn,
    signUp,
    signOut,
    syncNow,
    clearDebugTraces
  } = useAppState();
  const ja = state.language === "ja";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showIntro, setShowIntro] = useState(false);

  const guestDays = useMemo(() => state.guestTrial.completedDayIndices.length, [state.guestTrial.completedDayIndices.length]);

  const submitSignIn = async () => {
    setMessage("");
    try {
      await signIn(email.trim(), password);
      setMessage(ja ? "ログインしました。" : "Signed in.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : ja ? "ログインに失敗しました。" : "Sign in failed.");
    }
  };

  const submitSignUp = async () => {
    setMessage("");
    try {
      await signUp(email.trim(), password);
      setMessage(
        ja
          ? "Supabase Authから確認メールが届きます。メール確認後にログインしてください。"
          : "Supabase Auth will send a confirmation email. Sign in after verifying your email."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : ja ? "アカウント作成に失敗しました。" : "Sign up failed.");
    }
  };

  return (
    <div className="space-y-4">
      <AppIntroModal open={showIntro} language={state.language} onClose={() => setShowIntro(false)} />

      <section className="glass rounded-xl2 p-4 space-y-2">
        <h1 className="text-xl font-black text-slate-900">{ja ? "設定" : "Settings"}</h1>
        <p className="text-sm text-slate-700">
          {ja
            ? "1週間1テーマの学習を回すための基本設定です。"
            : "These are the core settings for your weekly theme-based study flow."}
        </p>
      </section>

      <section className="glass rounded-xl2 p-4 space-y-3">
        <h2 className="text-base font-bold text-slate-900">{ja ? "アカウント" : "Account"}</h2>
        <div className="text-sm text-slate-900 space-y-1">
          <p>
            {auth.mode === "user"
              ? ja
                ? `ログイン中: ${auth.email ?? auth.userId}`
                : `Signed in as ${auth.email ?? auth.userId}`
              : ja
                ? "現在はゲスト利用です。"
                : "You are currently using guest mode."}
          </p>
          <p>{ja ? `プラン: ${auth.plan.toUpperCase()}` : `Plan: ${auth.plan.toUpperCase()}`}</p>
          {auth.mode === "user" && <p>{ja ? `権限: ${canUseAdminMode ? "ADMIN" : "USER"}` : `Role: ${canUseAdminMode ? "ADMIN" : "USER"}`}</p>}
          {auth.mode === "guest" && (
            <p className="text-slate-600">{ja ? `体験版の完了日数: ${guestDays} / 3` : `Guest trial days completed: ${guestDays} / 3`}</p>
          )}
        </div>

        {auth.mode !== "user" ? (
          <div className="space-y-2">
            <input className="input text-slate-900" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input
              className="input text-slate-900"
              type="password"
              placeholder={ja ? "パスワード" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <div className="flex gap-2">
              <button className="btn-primary" disabled={!email.trim() || !password || auth.busy} onClick={() => void submitSignIn()}>
                {ja ? "ログイン" : "Sign In"}
              </button>
              <button className="btn-secondary" disabled={!email.trim() || !password || auth.busy} onClick={() => void submitSignUp()}>
                {ja ? "新規作成" : "Create Account"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => void syncNow()}>
              {ja ? "今すぐ同期" : "Sync Now"}
            </button>
            <button className="btn-secondary" onClick={signOut}>
              {ja ? "ログアウト" : "Sign Out"}
            </button>
          </div>
        )}

        {message && <p className="text-sm text-rose-700">{message}</p>}
      </section>

      <section className="glass rounded-xl2 p-4 space-y-3">
        <h2 className="text-base font-bold text-slate-900">{ja ? "学習設定" : "Learning Preferences"}</h2>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900">{ja ? "表示言語" : "Language"}</label>
          <div className="flex gap-2">
            <button className={state.language === "ja" ? "btn-primary" : "btn-secondary"} onClick={() => setLanguage("ja")}>
              日本語
            </button>
            <button className={state.language === "en" ? "btn-primary" : "btn-secondary"} onClick={() => setLanguage("en")}>
              English
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900">{ja ? "デフォルトCEFR" : "Default CEFR"}</label>
          <div className="flex flex-wrap gap-2">
            {cefrs.map((cefr) => (
              <button key={cefr} className={state.prefs.defaultCefr === cefr ? "btn-primary" : "btn-secondary"} onClick={() => setDefaultCefr(cefr)}>
                {cefr}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-600">
            {ja ? "Day1 の1分スピーチ作成時に最初から入る値です。" : "This is pre-filled on Day 1 when you create the 1-minute speech."}
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900">{ja ? "PodcastのUser役の声" : "Podcast User Voice"}</label>
          <div className="flex gap-2">
            <button
              className={state.prefs.podcastUserGender === "female" ? "btn-primary" : "btn-secondary"}
              onClick={() => setPodcastUserGender("female")}
            >
              {ja ? "女性" : "Female"}
            </button>
            <button className={state.prefs.podcastUserGender === "male" ? "btn-primary" : "btn-secondary"} onClick={() => setPodcastUserGender("male")}>
              {ja ? "男性" : "Male"}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-900">{ja ? "音声生成" : "Audio Generation"}</label>
          <p className="text-sm text-slate-700">{ja ? "音声生成は OpenAI API を使います。" : "Audio generation uses the OpenAI API."}</p>
        </div>
      </section>

      <section className="glass rounded-xl2 p-4 space-y-3">
        <h2 className="text-base font-bold text-slate-900">{ja ? "アプリ説明" : "App Intro"}</h2>
        <p className="text-sm text-slate-700">
          {ja ? "学習コンセプトと参考動画をいつでも見返せます。" : "You can reopen the learning concept cards and embedded reference video anytime."}
        </p>
        <button className="btn-secondary" onClick={() => setShowIntro(true)}>
          {ja ? "説明カードを見る" : "Open Intro Cards"}
        </button>
      </section>

      {canUseAdminMode && (
        <section className="glass rounded-xl2 p-4 space-y-3">
          <h2 className="text-base font-bold text-slate-900">{ja ? "管理者モード" : "Admin Mode"}</h2>
          <label className="flex items-center gap-2 text-sm text-slate-900">
            <input type="checkbox" checked={state.prefs.adminDebugEnabled} onChange={(e) => setAdminDebugEnabled(e.target.checked)} />
            {ja ? "デバッグログを記録する" : "Record debug traces"}
          </label>
          <p className="text-xs text-slate-600">
            {ja
              ? "ONの間だけ、生成時のプロンプト・入力・返答をこの設定タブに保存します。保存期間は直近7日間です。"
              : "When enabled, generation prompts, inputs, and responses are saved here in Settings for the last 7 days only."}
          </p>
          {state.debugTraces.length > 0 && (
            <div className="space-y-2">
              <button className="btn-secondary" onClick={clearDebugTraces}>
                {ja ? "デバッグ表示をクリア" : "Clear Debug Traces"}
              </button>
              {state.debugTraces.map((trace) => (
                <details key={trace.id} className="input text-sm text-slate-900">
                  <summary className="cursor-pointer font-semibold">
                    {trace.feature} / {new Date(trace.createdAt).toLocaleString(ja ? "ja-JP" : "en-US")}
                  </summary>
                  <div className="mt-3 max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                    <DebugValueBlock label="Prompt" value={trace.promptJa} />
                    <DebugValueBlock label="Request Payload" value={trace.requestPayload} />
                    <DebugValueBlock label="Raw Response" value={trace.rawResponse} />
                    <DebugValueBlock label="Parsed Response" value={trace.parsedResponse} />
                  </div>
                </details>
              ))}
            </div>
          )}
          {state.debugTraces.length === 0 && (
            <p className="text-xs text-slate-600">
              {ja
                ? "まだデバッグログはありません。ONにした状態で生成すると、ここに表示されます。"
                : "No debug traces yet. Enable recording and generate something to show traces here."}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

