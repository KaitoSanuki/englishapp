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
      return ja
        ? "メール認証が完了していません。確認メールのリンクから認証してください。"
        : "Email is not confirmed yet. Please verify from the link in your email.";
    }
    if (code === "invalid_credentials") {
      return ja ? "メールアドレスまたはパスワードが違います。" : "Invalid email or password.";
    }
    return msg;
  } catch {
    if (raw.includes("email_not_confirmed") || raw.includes("Email not confirmed")) {
      return ja
        ? "メール認証が完了していません。確認メールのリンクから認証してください。"
        : "Email is not confirmed yet. Please verify from the link in your email.";
    }
    if (raw.includes("invalid_credentials")) {
      return ja ? "メールアドレスまたはパスワードが違います。" : "Invalid email or password.";
    }
    return raw;
  }
};

export function AuthGate() {
  const { state, auth, signIn, signUp } = useAppState();
  const ja = state.language === "ja";

  const [mode, setMode] = useState<Mode>("menu");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showIntro, setShowIntro] = useState(false);
  const prevAuthModeRef = useRef(auth.mode);

  // Ensure first login (including email-link flow) opens intro unless user disabled it.
  useEffect(() => {
    const prev = prevAuthModeRef.current;
    if (prev === "guest" && auth.mode === "user" && !shouldSkipIntro()) {
      setShowIntro(true);
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
      const raw = error instanceof Error ? error.message : "Sign in failed.";
      setMessage(parseAuthError(raw, ja));
    }
  };

  const onSignUp = async () => {
    setMessage("");
    try {
      await signUp(email.trim(), password);
      setMode("verify");
      setPassword("");
    } catch (error) {
      const raw = error instanceof Error ? error.message : "Sign up failed.";
      setMessage(parseAuthError(raw, ja));
    }
  };

  const openIntro = () => {
    if (!shouldSkipIntro()) {
      setShowIntro(true);
    }
  };

  return (
    <>
      <AppIntroModal open={showIntro} language={state.language} onClose={() => setShowIntro(false)} />

      {auth.mode !== "user" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <section className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-3">
            <h1 className="text-2xl font-black text-slate-900">{ja ? "English Loop へようこそ" : "Welcome to English Loop"}</h1>
            <p className="text-sm text-slate-700">
              {ja ? "開始方法を選んでください。" : "Choose how you want to start."}
            </p>

            {mode === "menu" && (
              <div className="space-y-2 pt-1">
                <button className="btn-primary w-full" onClick={() => setMode("signin")}>
                  {ja ? "ログイン" : "Sign In"}
                </button>
                <button className="btn-secondary w-full" onClick={() => setMode("signup")}>
                  {ja ? "新しくアカウントを作成" : "Create Account"}
                </button>
                <button
                  className="btn-secondary w-full"
                  onClick={() => {
                    openIntro();
                  }}
                >
                  {ja ? "ゲストで始める" : "Continue as Guest"}
                </button>
              </div>
            )}

            {(mode === "signin" || mode === "signup") && (
              <div className="space-y-2 pt-1">
                <input
                  className="input text-slate-900"
                  type="email"
                  autoComplete="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <input
                  className="input text-slate-900"
                  type="password"
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  placeholder={ja ? "パスワード" : "Password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />

                <button
                  className="btn-primary w-full"
                  onClick={() => void (mode === "signin" ? onSignIn() : onSignUp())}
                  disabled={auth.busy || !email.trim() || !password}
                >
                  {mode === "signin"
                    ? ja
                      ? "ログイン"
                      : "Sign In"
                    : ja
                      ? "アカウントを作成して続ける"
                      : "Create Account and Continue"}
                </button>

                <button className="btn-secondary w-full" onClick={() => setMode("menu")} disabled={auth.busy}>
                  {ja ? "戻る" : "Back"}
                </button>
              </div>
            )}

            {mode === "verify" && (
              <div className="space-y-3 pt-1">
                <p className="text-sm text-slate-900">
                  {ja
                    ? "確認メールを送信しました。メール内のリンクを開いて認証してください。認証後、この画面でログインしてください。"
                    : "We sent a confirmation email. Open the link in your email to verify, then come back and sign in."}
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
