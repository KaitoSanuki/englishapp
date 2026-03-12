"use client";

import { useMemo } from "react";
import { useAppState } from "@/lib/app-state";

const namesEn = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];
const namesJa = ["1日目", "2日目", "3日目", "4日目", "5日目", "6日目", "7日目"];

const tasksByDay = [
  ["step2_script", "step3_read", "record_baseline"],
  ["step4_321"],
  ["step6_roleplay", "step7_correct", "step3_revised"],
  ["day4_review_start", "day4_321", "day4_roleplay", "day4_save", "day4_review_end"],
  ["day5_roleplay_1", "day5_save_1", "day5_review_1", "day5_roleplay_2", "day5_save_2", "day5_review_2"],
  ["day6_roleplay", "day6_save", "day6_review"],
  ["day7_speech", "day7_compare", "day7_roleplay", "day7_save", "day7_review"]
];

const jaLabels: Record<string, string> = {
  step2_script: "テーマとCEFR",
  step3_read: "音読",
  record_baseline: "基準録音",
  step4_321: "3-2-1",
  step6_roleplay: "ロールプレイ",
  step7_correct: "修正版保存",
  step3_revised: "対話音読",
  day4_review_start: "復習音読",
  day4_321: "3-2-1",
  day4_roleplay: "追加ロールプレイ",
  day4_save: "修正版保存",
  day4_review_end: "復習音読",
  day5_roleplay_1: "20分会話1",
  day5_save_1: "保存1",
  day5_review_1: "復習1",
  day5_roleplay_2: "20分会話2",
  day5_save_2: "保存2",
  day5_review_2: "復習2",
  day6_roleplay: "30分意見交換",
  day6_save: "修正版保存",
  day6_review: "復習音読",
  day7_speech: "1分スピーチ",
  day7_compare: "録音比較",
  day7_roleplay: "30分意見交換",
  day7_save: "修正版保存",
  day7_review: "復習音読"
};

const enLabels: Record<string, string> = {
  step2_script: "Theme and CEFR",
  step3_read: "Read aloud",
  record_baseline: "Baseline recording",
  step4_321: "3-2-1",
  step6_roleplay: "Roleplay",
  step7_correct: "Save corrected text",
  step3_revised: "Dialogue reading",
  day4_review_start: "Review reading",
  day4_321: "3-2-1",
  day4_roleplay: "Additional roleplay",
  day4_save: "Save corrected text",
  day4_review_end: "Review reading",
  day5_roleplay_1: "20-min roleplay 1",
  day5_save_1: "Save 1",
  day5_review_1: "Review 1",
  day5_roleplay_2: "20-min roleplay 2",
  day5_save_2: "Save 2",
  day5_review_2: "Review 2",
  day6_roleplay: "30-min opinion roleplay",
  day6_save: "Save corrected text",
  day6_review: "Review reading",
  day7_speech: "1-min speech",
  day7_compare: "Recording comparison",
  day7_roleplay: "30-min opinion roleplay",
  day7_save: "Save corrected text",
  day7_review: "Review reading"
};

export function Checklist({ dayOfWeek }: { dayOfWeek: number }) {
  const { state, activeWeek } = useAppState();
  const ja = state.language === "ja";
  const tasks = useMemo(() => tasksByDay[dayOfWeek] ?? [], [dayOfWeek]);
  const labels = ja ? jaLabels : enLabels;
  const dayNames = ja ? namesJa : namesEn;

  return (
    <section className="glass rounded-xl2 p-4 space-y-2">
      <h3 className="text-base font-bold text-slate-900">
        {dayNames[dayOfWeek]} {ja ? "チェックリスト" : "Checklist"}
      </h3>
      <ul className="space-y-2">
        {tasks.map((taskId) => {
          const done = state.taskRuns.some((r) => r.weekId === activeWeek.id && r.taskType === taskId && r.dayOfWeek === dayOfWeek && r.completed);
          return (
            <li key={taskId} className="input flex items-center justify-between">
              <span className="text-slate-900">{labels[taskId] ?? taskId}</span>
              <span className={done ? "text-emerald-600 text-sm font-semibold" : "text-slate-500 text-sm"}>
                {done ? (ja ? "完了" : "Done") : ja ? "未" : "Todo"}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

