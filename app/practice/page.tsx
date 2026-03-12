"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useAppState } from "@/lib/app-state";

const dayNamesEn = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];
const dayNamesJa = ["1日目", "2日目", "3日目", "4日目", "5日目", "6日目", "7日目"];

const dayTasks = [
  ["step2_script", "step3_read", "record_baseline"],
  ["step4_321"],
  ["step6_roleplay", "step7_correct", "step3_revised"],
  ["day4_review_start", "day4_321", "day4_roleplay", "day4_save", "day4_review_end"],
  ["day5_roleplay_1", "day5_save_1", "day5_review_1", "day5_roleplay_2", "day5_save_2", "day5_review_2"],
  ["day6_roleplay", "day6_save", "day6_review"],
  ["day7_speech", "day7_compare", "day7_roleplay", "day7_save", "day7_review"]
];

const labelsJa: Record<string, string> = {
  step2_script: "テーマとCEFRを決める",
  step3_read: "音読",
  record_baseline: "基準録音",
  step4_321: "3-2-1リテリング",
  step6_roleplay: "ロールプレイ",
  step7_correct: "修正版保存",
  step3_revised: "対話音読",
  day4_review_start: "復習音読",
  day4_321: "3-2-1リテリング",
  day4_roleplay: "追加ロールプレイ",
  day4_save: "修正版保存",
  day4_review_end: "復習音読",
  day5_roleplay_1: "20分ロールプレイ 1",
  day5_save_1: "修正版保存 1",
  day5_review_1: "復習音読 1",
  day5_roleplay_2: "20分ロールプレイ 2",
  day5_save_2: "修正版保存 2",
  day5_review_2: "復習音読 2",
  day6_roleplay: "30分意見交換",
  day6_save: "修正版保存",
  day6_review: "復習音読",
  day7_speech: "1分スピーチ録音",
  day7_compare: "録音比較",
  day7_roleplay: "30分意見交換",
  day7_save: "修正版保存",
  day7_review: "復習音読"
};

const labelsEn: Record<string, string> = {
  step2_script: "Set theme and CEFR",
  step3_read: "Read aloud",
  record_baseline: "Baseline recording",
  step4_321: "3-2-1 retelling",
  step6_roleplay: "Roleplay",
  step7_correct: "Save corrected dialogue",
  step3_revised: "Dialogue reading",
  day4_review_start: "Review reading",
  day4_321: "3-2-1 retelling",
  day4_roleplay: "Additional roleplay",
  day4_save: "Save corrected dialogue",
  day4_review_end: "Review reading",
  day5_roleplay_1: "20-min roleplay set 1",
  day5_save_1: "Save set 1",
  day5_review_1: "Review set 1",
  day5_roleplay_2: "20-min roleplay set 2",
  day5_save_2: "Save set 2",
  day5_review_2: "Review set 2",
  day6_roleplay: "30-min opinion roleplay",
  day6_save: "Save corrected dialogue",
  day6_review: "Review reading",
  day7_speech: "1-min speech recording",
  day7_compare: "Recording comparison",
  day7_roleplay: "30-min opinion roleplay",
  day7_save: "Save corrected dialogue",
  day7_review: "Review reading"
};

export default function PracticeProgressPage() {
  const { state, activeWeek, resetWeekData } = useAppState();
  const ja = state.language === "ja";
  const dayNames = ja ? dayNamesJa : dayNamesEn;
  const labels = ja ? labelsJa : labelsEn;

  const completedSetByDay = useMemo(() => {
    const map = dayTasks.map(() => new Set<string>());
    for (const run of state.taskRuns) {
      if (run.weekId === activeWeek.id && run.completed && run.dayOfWeek >= 0 && run.dayOfWeek <= 6) {
        map[run.dayOfWeek].add(run.taskType);
      }
    }
    return map;
  }, [activeWeek.id, state.taskRuns]);

  const done = completedSetByDay.reduce((sum, set) => sum + set.size, 0);
  const total = dayTasks.reduce((sum, list) => sum + list.length, 0);
  const percent = Math.min(100, Math.round((done / total) * 100));

  return (
    <div className="space-y-4">
      <section className="glass rounded-xl2 p-4">
        <h1 className="text-xl font-black text-slate-900">{ja ? "進捗" : "Progress"}</h1>
        <p className="text-sm text-slate-900">
          {activeWeek.topicTitle} / CEFR {activeWeek.cefr}
        </p>
        <div className="mt-3 h-2 rounded-full bg-slate-200">
          <div className="h-2 rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-900">
          {ja ? "週間進捗" : "Weekly Progress"}: {done}/{total} ({percent}%)
        </p>
      </section>

      <section className="glass rounded-xl2 p-4 space-y-3">
        <h2 className="text-base font-bold text-slate-900">{ja ? "ステップ一覧" : "Steps"}</h2>
        {dayTasks.map((tasks, dayIndex) => (
          <article key={dayIndex} className="rounded-xl border border-slate-200 bg-white/70 p-3 space-y-2">
            <p className="text-sm font-bold text-slate-900">{dayNames[dayIndex]}</p>
            {tasks.map((taskId) => {
              const doneTask = completedSetByDay[dayIndex].has(taskId);
              return (
                <div key={taskId} className="input flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{labels[taskId] ?? taskId}</p>
                    <p className="text-xs text-slate-600">{doneTask ? (ja ? "完了済み" : "Completed") : ja ? "未完了" : "Not completed"}</p>
                  </div>
                  {doneTask && (
                    <Link href={`/?replayDay=${dayIndex}&replayTask=${taskId}`} className="btn-secondary whitespace-nowrap">
                      {ja ? "やり直す" : "Redo"}
                    </Link>
                  )}
                </div>
              );
            })}
          </article>
        ))}
      </section>

      <section className="glass rounded-xl2 p-4 space-y-2">
        <h2 className="text-base font-bold text-slate-900">{ja ? "直近の実行ログ" : "Recent Activity"}</h2>
        {state.taskRuns
          .filter((r) => r.weekId === activeWeek.id)
          .slice(0, 10)
          .map((r) => (
            <article key={r.id} className="input">
              <p className="text-sm font-semibold">
                {dayNames[r.dayOfWeek]} - {labels[r.taskType] ?? r.taskType}
              </p>
              <p className="text-xs text-slate-600">{new Date(r.startedAt).toLocaleString()}</p>
            </article>
          ))}
        {!state.taskRuns.filter((r) => r.weekId === activeWeek.id).length && <p className="text-sm text-slate-900">{ja ? "まだログはありません。" : "No activity yet."}</p>}
      </section>

      <section className="glass rounded-xl2 p-4 space-y-2">
        <h2 className="text-base font-bold text-red-700">{ja ? "リセット" : "Reset"}</h2>
        <p className="text-sm">{ja ? "今週の進捗と作成データを初期化します。" : "Reset this week's progress and generated data."}</p>
        <button
          className="btn-secondary text-red-700 border border-red-300"
          onClick={() => {
            const ok = window.confirm(ja ? "本当に今週の内容をリセットしますか？" : "Are you sure you want to reset this week's data?");
            if (!ok) return;
            resetWeekData(activeWeek.id);
          }}
        >
          {ja ? "今週をリセット" : "Reset This Week"}
        </button>
      </section>
    </div>
  );
}

