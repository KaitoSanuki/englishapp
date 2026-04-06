"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAppState } from "@/lib/app-state";
import { guestSampleDays } from "@/lib/lesson-utils";
import { DayTaskKey } from "@/lib/types";
import { CardShell } from "@/components/lesson/ui";
import { SpeechTask } from "@/components/lesson/SpeechTask";
import { PhraseTask } from "@/components/lesson/PhraseTask";
import { PodcastTask } from "@/components/lesson/PodcastTask";
import { RetellingTask } from "@/components/lesson/RetellingTask";
import { ExternalChatTask } from "@/components/lesson/ExternalChatTask";

const dayTaskMap: Record<number, DayTaskKey[]> = {
  1: ["speech", "phrases", "podcast"],
  2: ["speech", "phrases", "podcast"],
  3: ["speech", "phrases", "podcast"],
  4: ["speech", "phrases", "podcast"],
  5: ["retelling", "phrases", "podcast"],
  6: ["retelling", "externalChat", "podcast"],
  7: ["retelling", "externalChat", "podcast"]
};

const dayTaskLabels = {
  ja: {
    speech: "1分スピーチ",
    phrases: "Oxford Phrase",
    podcast: "Podcast",
    retelling: "3-2-1リテリング",
    externalChat: "外部AI会話"
  },
  en: {
    speech: "1-Min Speech",
    phrases: "Oxford Phrase",
    podcast: "Podcast",
    retelling: "3-2-1 Retelling",
    externalChat: "External AI Chat"
  }
} as const;

const dayDescriptions = {
  ja: {
    1: "今週の軸になる1分スピーチを作り、Oxford PhraseとPodcastでテーマを広げます。",
    2: "昨日の1分スピーチを土台に、表現と話題の幅を広げます。",
    3: "色付け済みの1分スピーチを復習しながら、PodcastとPhraseで理解を厚くします。",
    4: "インプットの最終日です。明日のリテリングにつながる材料を整えます。",
    5: "最初に3-2-1リテリングで出力し、そのあとPhraseとPodcastで補強します。",
    6: "リテリングで話す筋肉を使ってから、外部AI会話とPodcastで広げます。",
    7: "最後の日です。リテリングと外部AI会話で締めて、Podcastで週をつなぎます。"
  },
  en: {
    1: "Build the weekly 1-minute speech, then expand it through Oxford Phrase and Podcast.",
    2: "Reuse yesterday's speech as the base and widen your language through phrases and podcast.",
    3: "Review the saved speech rhythm, then deepen the topic with podcast and phrases.",
    4: "Final input day. You prepare material for tomorrow's retelling.",
    5: "Start with 3-2-1 retelling, then reinforce with phrases and podcast.",
    6: "Use retelling first, then move into external AI chat and finish with the podcast.",
    7: "Final day. Finish with retelling, external AI chat, and the closing podcast."
  }
} as const;

export default function HomePage() {
  const { state, auth, activeWeek, setLessonFocusActive, setLessonSession, createNextWeek, completeDay, markGuestTrialDay } = useAppState();
  const ja = state.language === "ja";

  const nextUserDay = useMemo(() => activeWeek.dayStatuses.find((status) => !status.completed)?.dayIndex ?? 8, [activeWeek.dayStatuses]);
  const nextGuestDay = useMemo(() => guestSampleDays.find((day) => !state.guestTrial.completedDayIndices.includes(day)) ?? null, [state.guestTrial.completedDayIndices]);
  const targetDay = auth.mode === "guest" ? nextGuestDay : nextUserDay <= 7 ? nextUserDay : null;
  const trialEnded = auth.mode === "guest" && nextGuestDay === null;
  const weekCompleted = auth.mode === "user" && targetDay === null;
  const previewTasks = targetDay ? dayTaskMap[targetDay] : [];
  const labels = ja ? dayTaskLabels.ja : dayTaskLabels.en;

  const startLesson = () => {
    if (!targetDay) return;
    const existingIndex = state.lessonSession?.dayIndex === targetDay ? state.lessonSession.cardIndex : 0;
    setLessonSession({ active: true, dayIndex: targetDay, cardIndex: existingIndex });
    setLessonFocusActive(true);
  };

  const stopLesson = () => {
    if (!state.lessonSession) return;
    setLessonSession({ ...state.lessonSession, active: false });
    setLessonFocusActive(false);
  };

  const advanceCard = () => {
    if (!state.lessonSession) return;
    setLessonSession({ ...state.lessonSession, active: true, cardIndex: state.lessonSession.cardIndex + 1 });
  };

  const finishDay = () => {
    if (!targetDay) return;
    completeDay(targetDay);
    if (auth.mode === "guest") markGuestTrialDay(targetDay);
    setLessonFocusActive(false);
    setLessonSession(undefined);
  };

  const renderTaskCard = () => {
    if (!targetDay || !state.lessonSession) return null;
    const taskIndex = state.lessonSession.cardIndex - 1;
    const task = previewTasks[taskIndex];
    if (!task) {
      return (
        <CardShell
          title={ja ? "お疲れさまでした" : "All Done"}
          subtitle={ja ? "今日のレッスンはここまでです。" : "Today's lesson is complete."}
          footer={<button className="btn-primary" onClick={finishDay}>{ja ? "レッスンを閉じる" : "Close Lesson"}</button>}
        >
          <p className="text-sm text-slate-700">{ja ? "今日はここまでです。" : "That's it for today."}</p>
        </CardShell>
      );
    }
    if (task === "speech") return <SpeechTask dayIndex={targetDay} onDone={advanceCard} />;
    if (task === "phrases") return <PhraseTask dayIndex={targetDay} onDone={advanceCard} />;
    if (task === "podcast") return <PodcastTask dayIndex={targetDay} onDone={advanceCard} />;
    if (task === "retelling") return <RetellingTask dayIndex={targetDay} onDone={advanceCard} />;
    return <ExternalChatTask dayIndex={targetDay} onDone={advanceCard} />;
  };

  return (
    <div className="space-y-4">
      <section className="glass rounded-xl2 p-4 space-y-2">
        <h1 className="text-xl font-black text-slate-900">{ja ? "今日のレッスン" : "Today Lesson"}</h1>
        <p className="text-sm text-slate-700">{activeWeek.theme || (ja ? "今週のテーマはまだこれから作ります。" : "This week's theme will be created in the lesson.")}</p>
      </section>

      {trialEnded ? (
        <section className="glass rounded-xl2 p-4 space-y-3">
          <h2 className="text-lg font-black text-slate-900">{ja ? "体験版はここまでです" : "The Trial Ends Here"}</h2>
          <p className="text-sm text-slate-700">
            {ja ? "Day1・Day5・Day6 の体験が完了しました。続けるにはアカウントを作成してください。" : "You completed the Day 1, Day 5, and Day 6 trial lessons. Create an account to continue."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link className="btn-primary" href="/profile">
              {ja ? "アカウントを作成・ログイン" : "Create Account / Sign In"}
            </Link>
          </div>
        </section>
      ) : weekCompleted ? (
        <section className="glass rounded-xl2 p-4 space-y-3">
          <h2 className="text-lg font-black text-slate-900">{ja ? "1テーマ完了しました" : "You Finished This Theme"}</h2>
          <p className="text-sm text-slate-700">{ja ? "次のテーマで新しい1週間を始められます。" : "You can start a fresh week with a new theme."}</p>
          <button className="btn-primary" onClick={createNextWeek}>{ja ? "新しいテーマで始める" : "Start a New Theme"}</button>
        </section>
      ) : targetDay ? (
        <>
          <section className="glass rounded-xl2 p-4 space-y-3">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900">{ja ? `${targetDay}日目` : `Day ${targetDay}`}</h2>
              <p className="text-sm text-slate-700">{dayDescriptions[ja ? "ja" : "en"][targetDay as keyof typeof dayDescriptions.ja]}</p>
            </div>
            <div className="space-y-2">
              {previewTasks.map((task) => (
                <div key={task} className="input flex items-center justify-between text-slate-900">
                  <span>{labels[task]}</span>
                  <span className={activeWeek.dayStatuses.find((status) => status.dayIndex === targetDay)?.tasks[task] ? "text-emerald-600 font-semibold" : "text-slate-500"}>
                    {activeWeek.dayStatuses.find((status) => status.dayIndex === targetDay)?.tasks[task] ? (ja ? "完了" : "Done") : ja ? "これから" : "Next"}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-primary" onClick={startLesson}>{state.lessonSession?.dayIndex === targetDay ? (ja ? "レッスンを再開" : "Resume Lesson") : ja ? "レッスンを開始" : "Start Lesson"}</button>
            </div>
          </section>

          <section className="glass rounded-xl2 p-4 space-y-3">
            <h2 className="text-base font-bold text-slate-900">{ja ? "今日の進み具合" : "Today's Progress"}</h2>
            <div className="space-y-2">
              {previewTasks.map((task) => (
                <div key={task} className="input flex items-center justify-between text-slate-900">
                  <span>{labels[task]}</span>
                  <span className={activeWeek.dayStatuses.find((status) => status.dayIndex === targetDay)?.tasks[task] ? "text-emerald-600 font-semibold" : "text-slate-500"}>
                    {activeWeek.dayStatuses.find((status) => status.dayIndex === targetDay)?.tasks[task] ? (ja ? "完了" : "Done") : ja ? "未完了" : "Todo"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : null}

      {state.lessonFocusActive && state.lessonSession && targetDay && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="absolute right-4 top-4">
            <button className="btn-secondary" onClick={stopLesson}>{ja ? "レッスンを中断" : "Pause Lesson"}</button>
          </div>
          {state.lessonSession.cardIndex === 0 ? (
            <CardShell
              title={ja ? `${targetDay}日目を始めます` : `Start Day ${targetDay}`}
              subtitle={dayDescriptions[ja ? "ja" : "en"][targetDay as keyof typeof dayDescriptions.ja]}
              footer={<button className="btn-primary" onClick={advanceCard}>{ja ? "進む" : "Continue"}</button>}
            >
              <div className="space-y-2">
                {previewTasks.map((task) => (
                  <div key={task} className="input text-slate-900">{labels[task]}</div>
                ))}
              </div>
            </CardShell>
          ) : (
            renderTaskCard()
          )}
        </div>
      )}
    </div>
  );
}

