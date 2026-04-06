"use client";

import { useState } from "react";
import { useAppState } from "@/lib/app-state";
import { ExternalChatPrompt } from "@/lib/types";
import { jsonPost } from "@/components/lesson/api";
import { CardShell, DebugBlock, makeClientTrace, makeJob } from "@/components/lesson/ui";

export function ExternalChatTask({ dayIndex, onDone }: { dayIndex: number; onDone: () => void }) {
  const { activeWeek, state, saveExternalPrompt, markTaskComplete, addDebugTrace, setCurrentJob } = useAppState();
  const ja = state.language === "ja";
  const speech = activeWeek.speech;
  const prompt = activeWeek.externalPrompts.find((item) => item.dayIndex === dayIndex);
  const [error, setError] = useState("");

  const generatePrompt = async () => {
    if (!speech) {
      setError(ja ? "先に1分スピーチを作成してください。" : "Create the speech first.");
      return;
    }
    setError("");
    setCurrentJob(makeJob("podcast", dayIndex, ja ? "会話用プロンプトを準備しています" : "Preparing chat prompt", 1));
    try {
      const latestPodcastTitle = activeWeek.podcasts.find((item) => item.dayIndex === dayIndex - 1)?.title;
      const generated = await jsonPost<{ promptText: string }>({
        task: "external_chat",
        theme: activeWeek.theme,
        speechScript: speech.scriptText,
        podcastTitle: latestPodcastTitle,
        dayIndex: dayIndex as 6 | 7
      });
      if (generated.debug) addDebugTrace(makeClientTrace(generated.debug));
      const nextPrompt: ExternalChatPrompt = {
        id: crypto.randomUUID(),
        weekId: activeWeek.id,
        dayIndex,
        promptText: generated.data.promptText,
        createdAt: new Date().toISOString()
      };
      saveExternalPrompt(nextPrompt);
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
        footer={<button className="btn-primary" onClick={() => void generatePrompt()}>{ja ? "プロンプトを作る" : "Generate Prompt"}</button>}
      >
        <p className="text-sm text-slate-700">{ja ? "会話自体は外部アプリで行い、このアプリではプロンプトだけ用意します。" : "The conversation happens outside this app. Here we only prepare the prompt."}</p>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <DebugBlock feature="external_chat" />
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
      <DebugBlock feature="external_chat" />
    </CardShell>
  );
}

