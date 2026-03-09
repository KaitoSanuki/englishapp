"use client";

import { useMemo } from "react";
import { useAppState } from "@/lib/app-state";

const names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function Checklist({ dayOfWeek }: { dayOfWeek: number }) {
  const { state } = useAppState();
  const ja = state.language === "ja";
  const tasks = useMemo(() => {
    const map = ja
      ? {
          0: ["Step2 台本生成", "Step3 音読", "録音 baseline"],
          1: ["Step4 3-2-1"],
          2: ["Step6 ロールプレイ", "Step7 添削", "Step3 修正版音読"],
          3: ["Step3 復習音読", "Step4 軽3-2-1"],
          4: ["Step6 応用"],
          5: ["Step6 拡張"],
          6: ["Step5/7 総復習", "録音比較"]
        }
      : {
          0: ["Step2 script", "Step3 reading", "Baseline recording"],
          1: ["Step4 3-2-1"],
          2: ["Step6 roleplay", "Step7 correction", "Step3 revised reading"],
          3: ["Step3 review reading", "Step4 light 3-2-1"],
          4: ["Step6 advanced"],
          5: ["Step6 extended"],
          6: ["Step5/7 weekly review", "Recording comparison"]
        };
    return map[dayOfWeek as keyof typeof map] ?? [];
  }, [dayOfWeek, ja]);

  return (
    <section className="glass rounded-xl2 p-4 space-y-2">
      <h3 className="text-base font-bold">{names[dayOfWeek]} {ja ? "チェックリスト" : "Checklist"}</h3>
      <ul className="space-y-2">
        {tasks.map((task) => {
          const done = state.taskRuns.some((r) => r.taskType === task && r.dayOfWeek === dayOfWeek && r.completed);
          return (
            <li key={task} className="input flex items-center justify-between">
              <span>{task}</span>
              <span className={done ? "text-emerald-600" : "text-slate-500"}>{done ? (ja ? "完了" : "Done") : ja ? "未" : "Todo"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
