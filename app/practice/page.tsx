"use client";

import { useMemo } from "react";
import { useAppState } from "@/lib/app-state";

const dayTasks = {
  1: ["speech", "phrases", "podcast"],
  2: ["speech", "phrases", "podcast"],
  3: ["speech", "phrases", "podcast"],
  4: ["speech", "phrases", "podcast"],
  5: ["retelling", "phrases", "podcast"],
  6: ["retelling", "externalChat", "podcast"],
  7: ["retelling", "externalChat", "podcast"]
} as const;

const taskLabels = {
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

export default function PracticeProgressPage() {
  const { state, activeWeek } = useAppState();
  const ja = state.language === "ja";
  const labels = ja ? taskLabels.ja : taskLabels.en;

  const totals = useMemo(() => {
    const daysDone = activeWeek.dayStatuses.filter((status) => status.completed).length;
    const taskDone = activeWeek.dayStatuses.reduce((sum, day) => sum + Object.values(day.tasks).filter(Boolean).length, 0);
    const taskTotal = Object.values(dayTasks).reduce((sum, tasks) => sum + tasks.length, 0);
    return { daysDone, taskDone, taskTotal };
  }, [activeWeek.dayStatuses]);

  return (
    <div className="space-y-4">
      <section className="glass rounded-xl2 p-4 space-y-2">
        <h1 className="text-xl font-black text-slate-900">{ja ? "進捗" : "Progress"}</h1>
        <p className="text-sm text-slate-700">{activeWeek.theme || (ja ? "未設定テーマ" : "Untitled theme")}</p>
        <div className="h-2 rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-accent" style={{ width: `${Math.round((totals.taskDone / totals.taskTotal) * 100)}%` }} />
        </div>
        <p className="text-xs text-slate-600">
          {ja ? `日別完了: ${totals.daysDone} / 7 ・ タスク完了: ${totals.taskDone} / ${totals.taskTotal}` : `Completed days: ${totals.daysDone} / 7 ・ Tasks: ${totals.taskDone} / ${totals.taskTotal}`}
        </p>
      </section>

      {activeWeek.dayStatuses.map((status) => (
        <section key={status.dayIndex} className="glass rounded-xl2 p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">{ja ? `${status.dayIndex}日目` : `Day ${status.dayIndex}`}</h2>
            <span className={status.completed ? "text-sm font-semibold text-emerald-600" : "text-sm text-slate-500"}>
              {status.completed ? (ja ? "完了" : "Done") : ja ? "未完了" : "Todo"}
            </span>
          </div>
          <div className="space-y-2">
            {dayTasks[status.dayIndex as keyof typeof dayTasks].map((task) => (
              <div key={task} className="input flex items-center justify-between text-slate-900">
                <span>{labels[task]}</span>
                <span className={status.tasks[task] ? "text-emerald-600 font-semibold" : "text-slate-500"}>
                  {status.tasks[task] ? (ja ? "完了" : "Done") : ja ? "未完了" : "Todo"}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

