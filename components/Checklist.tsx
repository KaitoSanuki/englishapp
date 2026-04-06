"use client";

import { useMemo } from "react";
import { useAppState } from "@/lib/app-state";

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

export function Checklist({ dayIndex }: { dayIndex: number }) {
  const { state, activeWeek } = useAppState();
  const ja = state.language === "ja";
  const labels = ja ? taskLabels.ja : taskLabels.en;
  const status = useMemo(() => activeWeek.dayStatuses.find((item) => item.dayIndex === dayIndex), [activeWeek.dayStatuses, dayIndex]);

  if (!status) return null;

  const entries = Object.entries(status.tasks) as Array<[keyof typeof status.tasks, boolean]>;

  return (
    <section className="glass rounded-xl2 p-4 space-y-3">
      <h3 className="text-base font-bold text-slate-900">{ja ? `${dayIndex}日目のチェック` : `Day ${dayIndex} Checklist`}</h3>
      <div className="space-y-2">
        {entries.map(([key, done]) => (
          <div key={key} className="input flex items-center justify-between text-slate-900">
            <span>{labels[key]}</span>
            <span className={done ? "text-emerald-600 font-semibold" : "text-slate-500"}>{done ? (ja ? "完了" : "Done") : ja ? "未完了" : "Todo"}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

