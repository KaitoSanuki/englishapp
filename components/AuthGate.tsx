"use client";

import { useEffect, useRef, useState } from "react";
import { AppIntroModal, shouldSkipIntro } from "@/components/AppIntroModal";
import { useAppState } from "@/lib/app-state";

type Mode = "menu" | "signin" | "signup" | "verify";

const parseAuthError = (raw: string | undefined, ja: boolean) => {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as { msg?: string; error_code?: string };
    const code = parsed.error_code ?? "";
    const msg = parsed.msg ?? raw;
    if (code === "email_not_confirmed") {
      return ja ? "まだメール確認が完了していません。Supabase Auth から届いた確認メールのリンクを開いて認証してください。" : "Email is not confirmed yet. Open the link from the Supabase Auth confirmation email.";
    }
    if (code === "invalid_credentials") {
      return ja ? "メールアドレスまたはパスワードが違います。" : "Invalid email or password.";
    }
    if (code === "network_error") {
      return ja
        ? "Supabase に接続できませんでした。通信環境、広告ブロッカー、Vercel の環境変数、または Supabase 側の状態を確認してください。"
        : "Could not connect to Supabase. Check your network, blockers, Vercel environment variables, or Supabase status.";
    }
    return msg;
  } catch {
    if (raw === "Failed to fetch") {
      return ja
        ? "Supabase に接続できませんでした。通信環境、広告ブロッカー、Vercel の環境変数、または Supabase 側の状態を確認してください。"
        : "Could not connect to Supabase. Check your network, blockers, Vercel environment variables, or Supabase status.";
    }
    return raw;
  }
};

export function AuthGate() {
  const { state, auth, signIn, signUp } = useAppState();
  const ja = state.language === "ja";
  const [mode, setMode] = useState<Mode>("menu");
  const [allowGuest, setAllowGuest] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showIntro, setShowIntro] = useState(false);
  const prevAuthModeRef = useRef(auth.mode);

  useEffect(() => {
    const prev = prevAuthModeRef.current;
    if (prev === "guest" && auth.mode === "user" && !shouldSkipIntro()) {
      setShowIntro(true);
    }
    if (prev === "user" && auth.mode === "guest") {
      setAllowGuest(false);
      setMode("menu");
    }
    prevAuthModeRef.current = auth.mode;
  }, [auth.mode]);

  useEffect(() => {
    if (auth.mode === "user") {
      setMode("menu");
      setMessage("");
      setPassword("");
    }
  }, [auth.mode]);

  const onSignIn = async () => {
    setMessage("");
    try {
      await signIn(email.trim(), password);
    } catch (error) {
      setMessage(parseAuthError(error instanceof Error ? error.message : "", ja));
    }
  };

  const onSignUp = async () => {
    setMessage("");
    try {
      await signUp(email.trim(), password);
      setMode("verify");
      setPassword("");
    } catch (error) {
      setMessage(parseAuthError(error instanceof Error ? error.message : "", ja));
    }
  };

  const needsGate = auth.mode !== "user" && !allowGuest;

  return (
    <>
      <AppIntroModal open={showIntro} language={state.language} onClose={() => setShowIntro(false)} />
      {needsGate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-3">
            <h1 className="text-2xl font-black text-slate-900">{ja ? "English Loopへようこそ" : "Welcome to English Loop"}</h1>
            <p className="text-sm text-slate-700">{ja ? "始め方を選んでください。" : "Choose how you want to start."}</p>

            {mode === "menu" && (
              <div className="space-y-2 pt-1">
                <button className="btn-primary w-full" onClick={() => setMode("signin")}>
                  {ja ? "ログイン" : "Sign In"}
                </button>
                <button className="btn-secondary w-full" onClick={() => setMode("signup")}>
                  {ja ? "新しくアカウントを作成する" : "Create Account"}
                </button>
                <button
                  className="btn-secondary w-full"
                  onClick={() => {
                    setAllowGuest(true);
                    if (!shouldSkipIntro()) {
                      setShowIntro(true);
                    }
                  }}
                >
                  {ja ? "ゲストで始める" : "Continue as Guest"}
                </button>
              </div>
            )}

            {(mode === "signin" || mode === "signup") && (
              <div className="space-y-2 pt-1">
                <input className="input text-slate-900" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input
                  className="input text-slate-900"
                  type="password"
                  placeholder={ja ? "パスワード" : "Password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  className="btn-primary w-full"
                  onClick={() => void (mode === "signin" ? onSignIn() : onSignUp())}
                  disabled={auth.busy || !email.trim() || !password}
                >
                  {mode === "signin" ? (ja ? "ログイン" : "Sign In") : ja ? "アカウント作成して続ける" : "Create Account and Continue"}
                </button>
                <button className="btn-secondary w-full" onClick={() => setMode("menu")}>
                  {ja ? "戻る" : "Back"}
                </button>
              </div>
            )}

            {mode === "verify" && (
              <div className="space-y-3 pt-1">
                <p className="text-sm text-slate-900">
                  {ja
                    ? "Supabase Authから確認メールが届きます。メール内のリンクを開いて認証してください。"
                    : "Supabase Auth will send you a confirmation email. Open the link in the email to verify your account."}
                </p>
                <button className="btn-secondary w-full" onClick={() => setMode("menu")}>
                  {ja ? "メニューに戻る" : "Back to Menu"}
                </button>
              </div>
            )}

            {(message || auth.error) && <p className="text-xs text-rose-700">{message || parseAuthError(auth.error, ja)}</p>}
          </section>
        </div>
      )}
    </>
  );
}

