"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { AppIntroModal, shouldSkipIntro } from "@/components/AppIntroModal";

type Mode = "menu" | "signup" | "signin";

export function AuthGate() {
  const { state, auth, signIn, signUp } = useAppState();
  const ja = state.language === "ja";
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<Mode>("menu");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [showIntro, setShowIntro] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return null;

  const closeGate = () => setDismissed(true);
  const needsGate = !dismissed && auth.mode !== "user";

  return (
    <>
      <AppIntroModal open={showIntro} language={state.language} onClose={() => setShowIntro(false)} />

      {needsGate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-auto">
            <header className="space-y-1">
              <h1 className="text-xl font-black text-slate-900">{ja ? "English Loop へようこそ" : "Welcome to English Loop"}</h1>
              <p className="text-sm text-slate-700">{ja ? "開始方法を選んでください。" : "Choose how you want to start."}</p>
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
                <button
                  className="btn-secondary w-full"
                  onClick={() => {
                    closeGate();
                    if (!shouldSkipIntro()) setShowIntro(true);
                  }}
                >
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
                        setMode("signin");
                        setPassword("");
                        setMessage(
                          ja
                            ? "確認メールを送信しました。メール内リンクを開いてからログインしてください。"
                            : "Confirmation email sent. Open the link in your email, then sign in."
                        );
                        return;
                      }

                      await signIn(email.trim(), password);
                      closeGate();
                      if (!shouldSkipIntro()) setShowIntro(true);
                    } catch (error) {
                      setMessage(error instanceof Error ? error.message : ja ? "認証に失敗しました。" : "Authentication failed.");
                    }
                  }}
                >
                  {mode === "signup" ? (ja ? "アカウント作成して続ける" : "Create Account and Continue") : ja ? "ログイン" : "Sign In"}
                </button>
                <button className="btn-secondary w-full" onClick={() => setMode("menu")}>
                  {ja ? "戻る" : "Back"}
                </button>
                {(message || auth.error) && <p className="text-xs text-slate-900">{message || auth.error}</p>}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
