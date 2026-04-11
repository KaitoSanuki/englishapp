"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { ensureExternalPromptReady, ensurePodcastReady } from "@/lib/lesson-preload";
import { CardShell, makeJob } from "@/components/lesson/ui";

export function ExternalChatTask({ dayIndex, onDone }: { dayIndex: number; onDone: () => void }) {
  const { activeWeek, auth, state, saveExternalPrompt, savePodcast, markTaskComplete, addDebugTrace, setCurrentJob } = useAppState();
  const ja = state.language === "ja";
  const speech = activeWeek.speech;
  const prompt = activeWeek.externalPrompts.find((item) => item.dayIndex === dayIndex);
  const [error, setError] = useState("");
  const [autoPreparing, setAutoPreparing] = useState(false);

  useEffect(() => {
    if (!speech || prompt) return;
    let cancelled = false;
    setAutoPreparing(true);
    void ensureExternalPromptReady(
      {
        week: activeWeek,
        auth,
        saveExternalPrompt,
        addDebugTrace
      },
      dayIndex as 6 | 7
    )
      .catch(() => {
        // keep manual retry available
      })
      .finally(() => {
        if (!cancelled) setAutoPreparing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [speech, prompt, activeWeek, auth, saveExternalPrompt, addDebugTrace, dayIndex]);

  useEffect(() => {
    if (!speech) return;
    void ensurePodcastReady(
      {
        week: activeWeek,
        auth,
        prefs: state.prefs,
        savePodcast,
        addDebugTrace
      },
      dayIndex
    );
  }, [speech, activeWeek, auth, state.prefs, savePodcast, addDebugTrace, dayIndex]);

  const generatePrompt = async () => {
    if (!speech) {
      setError(ja ? "先に1分スピーチを作成してください。" : "Create the speech first.");
      return;
    }
    setError("");
    setCurrentJob(makeJob("podcast", dayIndex, ja ? "会話用プロンプトを準備しています" : "Preparing chat prompt", 1));
    try {
      await ensureExternalPromptReady(
        {
          week: activeWeek,
          auth,
          saveExternalPrompt,
          addDebugTrace
        },
        dayIndex as 6 | 7
      );
      setCurrentJob(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : ja ? "生成に失敗しました。" : "Generation failed.");
    }
  };

  const finishTask = () => {
    markTaskComplete(dayIndex, "externalChat");
    onDone();
  };

  if (!prompt) {
    return (
      <CardShell
        title={ja ? "外部AI会話のプロンプト" : "External AI Chat Prompt"}
        subtitle={ja ? "このアプリの外で会話するときに使います。" : "Use this in your external AI chat app."}
        footer={
          <button className="btn-primary" onClick={() => void generatePrompt()} disabled={autoPreparing}>
            {autoPreparing ? (ja ? "裏で準備しています..." : "Preparing in the background...") : ja ? "プロンプトを作る" : "Generate Prompt"}
          </button>
        }
      >
        <p className="text-sm text-slate-700">{ja ? "会話自体は外部アプリで行い、このアプリではプロンプトだけ用意します。" : "The conversation happens outside this app. Here we only prepare the prompt."}</p>
        {error && <p className="text-sm text-rose-700">{error}</p>}
      </CardShell>
    );
  }

  return (
    <CardShell
      title={ja ? "外部AI会話" : "External AI Chat"}
      subtitle={ja ? "コピーして他のアプリに貼り付けてください。" : "Copy this and paste it into the external app."}
      footer={
        <>
          <button className="btn-secondary" onClick={() => void navigator.clipboard.writeText(prompt.promptText)}>
            {ja ? "プロンプトをコピー" : "Copy Prompt"}
          </button>
          <button className="btn-primary" onClick={finishTask}>{ja ? "外部AI会話を完了" : "Finish External Chat"}</button>
        </>
      }
    >
      <textarea className="input min-h-72 text-slate-900" value={prompt.promptText} readOnly />
    </CardShell>
  );
}

