"use client";

import { useMemo } from "react";
import { useAppState } from "@/lib/app-state";

const dayNamesEn = ["Day 1", "Day 2", "Day 3", "Day 4", "Day 5", "Day 6", "Day 7"];
const dayNamesJa = ["1\u65e5\u76ee", "2\u65e5\u76ee", "3\u65e5\u76ee", "4\u65e5\u76ee", "5\u65e5\u76ee", "6\u65e5\u76ee", "7\u65e5\u76ee"];

const targetPerDay = [3, 1, 3, 2, 1, 1, 2];

export default function PracticeProgressPage() {
  const { state, activeWeek, resetWeekData } = useAppState();
  const ja = state.language === "ja";
  const dayNames = ja ? dayNamesJa : dayNamesEn;

  const completedByDay = useMemo(() => {
    const map = [0, 0, 0, 0, 0, 0, 0];
    for (const run of state.taskRuns) {
      if (run.weekId === activeWeek.id && run.completed && run.dayOfWeek >= 0 && run.dayOfWeek <= 6) {
        map[run.dayOfWeek] += 1;
      }
    }
    return map;
  }, [activeWeek.id, state.taskRuns]);

  const done = completedByDay.reduce((a, b) => a + b, 0);
  const total = targetPerDay.reduce((a, b) => a + b, 0);
  const percent = Math.min(100, Math.round((done / total) * 100));

  return (
    <div className="space-y-4">
      <section className="glass rounded-xl2 p-4">
        <h1 className="text-xl font-black text-slate-900">{ja ? "\u7df4\u7fd2\u9032\u6357" : "Practice Progress"}</h1>
        <p className="text-sm text-slate-900">
          {activeWeek.topicTitle} / CEFR {activeWeek.cefr}
        </p>
        <div className="mt-3 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-2 rounded-full bg-accent" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-900">
          {ja ? "\u9031\u9593\u9032\u6357" : "Weekly Progress"}: {done}/{total} ({percent}%)
        </p>
      </section>

      <section className="glass rounded-xl2 p-4 space-y-2">
        <h2 className="text-base font-bold text-slate-900">{ja ? "\u66dc\u65e5\u3054\u3068\u306e\u9032\u6357" : "Progress by Day"}</h2>
        {dayNames.map((name, i) => {
          const d = completedByDay[i];
          const t = targetPerDay[i];
          const finished = d >= t;
          return (
            <article key={name} className="input flex items-center justify-between">
              <div>
                <p className="font-semibold">{name}</p>
                <p className="text-xs text-slate-500">
                  {ja ? "\u5b8c\u4e86" : "Done"} {d}/{t}
                </p>
              </div>
              <span className={finished ? "text-emerald-600 text-sm font-semibold" : "text-slate-500 text-sm"}>
                {finished ? (ja ? "\u5b8c\u4e86" : "Done") : ja ? "\u9032\u884c\u4e2d" : "In Progress"}
              </span>
            </article>
          );
        })}
      </section>

      <section className="glass rounded-xl2 p-4 space-y-2">
        <h2 className="text-base font-bold text-slate-900">{ja ? "\u76f4\u8fd1\u306e\u5b9f\u884c\u30ed\u30b0" : "Recent Activity"}</h2>
        {state.taskRuns
          .filter((r) => r.weekId === activeWeek.id)
          .slice(0, 10)
          .map((r) => (
            <article key={r.id} className="input">
              <p className="text-sm font-semibold">
                {dayNames[r.dayOfWeek]} - {r.taskType}
              </p>
              <p className="text-xs text-slate-500">{new Date(r.startedAt).toLocaleString()}</p>
            </article>
          ))}
        {!state.taskRuns.filter((r) => r.weekId === activeWeek.id).length && (
          <p className="text-sm text-slate-900">{ja ? "\u307e\u3060\u30ed\u30b0\u306f\u3042\u308a\u307e\u305b\u3093\u3002" : "No activity yet."}</p>
        )}
      </section>

      <section className="glass rounded-xl2 p-4 space-y-2">
        <h2 className="text-base font-bold text-red-700">{ja ? "\u30ea\u30bb\u30c3\u30c8" : "Reset"}</h2>
        <p className="text-sm">{ja ? "\u4eca\u9031\u306e\u9032\u6357\u3068\u4f5c\u6210\u30c7\u30fc\u30bf\u3092\u521d\u671f\u5316\u3057\u307e\u3059\u3002" : "Reset this week's progress and generated data."}</p>
        <button
          className="btn-secondary text-red-700 border border-red-300"
          onClick={() => {
            const ok = window.confirm(ja ? "\u672c\u5f53\u306b\u4eca\u9031\u306e\u5185\u5bb9\u3092\u30ea\u30bb\u30c3\u30c8\u3057\u307e\u3059\u304b\uff1f" : "Are you sure you want to reset this week's data?");
            if (!ok) return;
            resetWeekData(activeWeek.id);
          }}
        >
          {ja ? "\u4eca\u9031\u3092\u30ea\u30bb\u30c3\u30c8" : "Reset This Week"}
        </button>
      </section>
    </div>
  );
}
