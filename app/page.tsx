"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { CEFR } from "@/lib/types";
import { step2Prompt, step5Prompt, step6Prompt, step7Prompt } from "@/lib/prompts";
import { PromptCard } from "@/components/PromptCard";
import { TTSPlayer } from "@/components/TTSPlayer";
import { Recorder } from "@/components/Recorder";
import { Timer321 } from "@/components/Timer321";

type FieldType = "text" | "textarea" | "select" | "yesno";
type FieldDef = {
  key: string;
  en: string;
  ja: string;
  type: FieldType;
  options?: string[];
  showIf?: (v: Record<string, string>) => boolean;
};
type TaskDef = { id: string; en: string; ja: string; fields: FieldDef[] };
type DayWrap = { fromDay: number; nextDay: number | null };

const TX = {
  ja: {
    title: "\u4eca\u65e5\u306e\u30ec\u30c3\u30b9\u30f3",
    day: "\u65e5\u76ee",
    oneByOne: "1\u554f\u305a\u3064\u9032\u3081\u307e\u3059",
    progress: "\u9032\u6357",
    select: "\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044",
    yes: "\u306f\u3044",
    no: "\u3044\u3044\u3048",
    submit: "\u6c7a\u5b9a",
    back: "\u524d\u306e\u30b9\u30c6\u30c3\u30d7\u3078\u623b\u308b",
    skip: "\u3053\u306e\u8cea\u554f\u3092\u30b9\u30ad\u30c3\u30d7",
    skipped: "\u30b9\u30ad\u30c3\u30d7",
    defaultCefr: "\u30c7\u30d5\u30a9\u30eb\u30c8 CEFR",
    copied: "\u30b3\u30d4\u30fc\u3057\u307e\u3057\u305f\uff01",
    stepDone: "\u30b9\u30c6\u30c3\u30d7\u7d42\u4e86\uff01\u6b21\u3078\u79fb\u52d5\u3057\u307e\u3059...",
    dayDoneTitle: "\u304a\u75b2\u308c\u3055\u307e\u3067\u3057\u305f\uff01",
    dayDoneBody: "\u4eca\u65e5\u306e\u30ec\u30c3\u30b9\u30f3\u306f\u3053\u3053\u307e\u3067\u3002",
    finishDay: "\u4eca\u65e5\u306e\u30ec\u30c3\u30b9\u30f3\u3092\u7d42\u3048\u308b",
    nextDayStart: "\u6b21\u306f{d}\u65e5\u76ee\u30b9\u30bf\u30fc\u30c8\uff01",
    startNextDay: "\u6b21\u306e\u30ec\u30c3\u30b9\u30f3\u3092\u59cb\u3081\u308b",
    weekDoneTitle: "\u4eca\u9031\u306e\u30ec\u30c3\u30b9\u30f3\u5b8c\u4e86\uff01",
    weekDoneBody: "\u9031\u6b21\u9032\u6357\u304b\u3089\u632f\u308a\u8fd4\u308a\u307e\u3057\u3087\u3046\u3002",
    openProgress: "\u9031\u9593\u9032\u6357\u3092\u898b\u308b",
    chat: "\u306a\u308b\u307b\u3069\u3001\u300c{v}\u300d\u3067\u3059\u306d\uff01",
    finishRead: "\u97f3\u8aad\u5b8c\u4e86"
  },
  en: {
    title: "Today Lesson",
    day: "Day",
    oneByOne: "One card at a time",
    progress: "Progress",
    select: "Select one",
    yes: "Yes",
    no: "No",
    submit: "Submit",
    back: "Back",
    skip: "Skip this question",
    skipped: "Skipped",
    defaultCefr: "Default CEFR",
    copied: "Copied!",
    stepDone: "Step complete! Moving to next...",
    dayDoneTitle: "Great work today!",
    dayDoneBody: "Today's lesson is complete.",
    finishDay: "Finish Today's Lesson",
    nextDayStart: "Day {d} starts now!",
    startNextDay: "Start Next Lesson",
    weekDoneTitle: "Week lesson complete!",
    weekDoneBody: "Check your weekly progress and review.",
    openProgress: "Open Weekly Progress",
    chat: 'Got it: "{v}"',
    finishRead: "Finish Reading"
  }
} as const;

const cefrOptions: CEFR[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const weekPlan: TaskDef[][] = [
  [
    {
      id: "step2_script",
      en: "Prepare theme and CEFR",
      ja: "\u30c6\u30fc\u30de\u3068CEFR\u3092\u6c7a\u3081\u308b",
      fields: [
        { key: "topic", en: "What topic this week?", ja: "\u4eca\u9031\u306e\u30c6\u30fc\u30de\u306f\uff1f", type: "text" },
        { key: "useDefaultCefr", en: "Use default CEFR?", ja: "\u8a2d\u5b9a\u306e\u30c7\u30d5\u30a9\u30eb\u30c8CEFR\u3092\u4f7f\u3046\uff1f", type: "yesno" },
        { key: "cefr", en: "Choose CEFR", ja: "CEFR\u3092\u9078\u629e", type: "select", options: cefrOptions, showIf: (v) => v.useDefaultCefr === "no" }
      ]
    },
    { id: "step3_read", en: "Read aloud", ja: "\u97f3\u8aad", fields: [] },
    { id: "record_baseline", en: "Record baseline", ja: "\u57fa\u6e96\u9332\u97f3", fields: [] }
  ],
  [{ id: "step4_321", en: "3-2-1 retelling", ja: "3-2-1 \u30ea\u30c6\u30ea\u30f3\u30b0", fields: [] }],
  [
    {
      id: "step6_roleplay",
      en: "Start roleplay",
      ja: "\u30ed\u30fc\u30eb\u30d7\u30ec\u30a4\u958b\u59cb",
      fields: [
        { key: "scene", en: "Scene?", ja: "\u30b7\u30fc\u30f3\u306f\uff1f", type: "text" },
        { key: "roleGoal", en: "Goal?", ja: "\u30b4\u30fc\u30eb\u306f\uff1f", type: "text" }
      ]
    },
    { id: "step7_correct", en: "Correction", ja: "\u6dfb\u524a", fields: [{ key: "transcript", en: "Paste transcript", ja: "\u6587\u5b57\u8d77\u3053\u3057\u3092\u8cbc\u308b", type: "textarea" }] },
    { id: "step3_revised", en: "Read revised text", ja: "\u4fee\u6b63\u7248\u3092\u97f3\u8aad", fields: [] }
  ],
  [
    { id: "step3_review", en: "Review reading", ja: "\u5fa9\u7fd2\u97f3\u8aad", fields: [] },
    { id: "step4_light", en: "Light 3-2-1", ja: "\u8efd\u30813-2-1", fields: [] }
  ],
  [{ id: "step6_advanced", en: "Advanced roleplay", ja: "\u5fdc\u7528\u30ed\u30fc\u30eb\u30d7\u30ec\u30a4", fields: [{ key: "advancedFocus", en: "What variation to try?", ja: "\u3069\u3093\u306a\u5fdc\u7528\u3092\u8a66\u3059\uff1f", type: "text" }] }],
  [{ id: "step6_extended", en: "Extended roleplay", ja: "\u62e1\u5f35\u30ed\u30fc\u30eb\u30d7\u30ec\u30a4", fields: [{ key: "extendedMinutes", en: "How many minutes?", ja: "\u4f55\u5206\u3084\u308b\uff1f", type: "select", options: ["5", "8", "10"] }] }],
  [
    { id: "step5_review", en: "Weekly correction review", ja: "\u9031\u6b21\u6dfb\u524a\u30ec\u30d3\u30e5\u30fc", fields: [{ key: "weekText", en: "Paste weekly speaking text", ja: "\u9031\u306e\u82f1\u8a9e\u3092\u8cbc\u308b", type: "textarea" }] },
    { id: "record_compare", en: "Compare recordings", ja: "\u9332\u97f3\u6bd4\u8f03", fields: [] }
  ]
];

const fkey = (weekId: string, taskId: string, key: string) => `${weekId}:${taskId}:${key}`;
const hasValue = (v: string | undefined) => !!v && v !== "__skip__";

export default function TodayLessonPage() {
  const { state, activeWeek, saveTaskRun, saveWeek, setWizardAnswer, undoLastCompletedTask, saveScript, saveRoleplay, saveRetelling, saveAudio } = useAppState();
  const ja = state.language === "ja";
  const t = ja ? TX.ja : TX.en;

  const [draft, setDraft] = useState("");
  const [feedback, setFeedback] = useState("");
  const [transitioning, setTransitioning] = useState(false);
  const [transitionProgress, setTransitionProgress] = useState(0);
  const [dayWrap, setDayWrap] = useState<DayWrap | null>(null);
  const [startCardDay, setStartCardDay] = useState<number | null>(null);

  const completedByDay = useMemo(() => {
    const map = weekPlan.map(() => new Set<string>());
    for (const run of state.taskRuns) {
      if (run.weekId === activeWeek.id && run.completed && run.dayOfWeek >= 0 && run.dayOfWeek <= 6) map[run.dayOfWeek].add(run.taskType);
    }
    return map;
  }, [activeWeek.id, state.taskRuns]);

  const dayIdx = completedByDay.findIndex((set, i) => set.size < weekPlan[i].length);
  const day = dayIdx === -1 ? 6 : dayIdx;
  const dayTasks = weekPlan[day];
  const completedIds = completedByDay[day];
  const task = dayTasks[Math.max(0, dayTasks.findIndex((x) => !completedIds.has(x.id)))] ?? dayTasks[dayTasks.length - 1];
  const doneCount = dayTasks.filter((x) => completedIds.has(x.id)).length;
  const hasAnyCompleted = state.taskRuns.some((x) => x.weekId === activeWeek.id && x.completed);

  const values: Record<string, string> = {};
  task.fields.forEach((f) => (values[f.key] = state.wizardAnswers[fkey(activeWeek.id, task.id, f.key)] ?? ""));
  const effectiveCefr = (values.useDefaultCefr === "no" ? (values.cefr as CEFR) : state.prefs.defaultCefr) || state.prefs.defaultCefr;

  const visible = task.fields.filter((f) => (f.showIf ? f.showIf(values) : true));
  const current = visible.find((f) => !hasValue(values[f.key]));
  const lastAnswered = [...visible].reverse().find((f) => hasValue(values[f.key]));

  const latestScript = state.scripts.find((x) => x.weekId === activeWeek.id);
  const latestRoleplay = state.roleplays.find((x) => x.weekId === activeWeek.id);

  useEffect(() => {
    setDraft("");
  }, [day, task.id, current?.key]);

  useEffect(() => {
    if (!transitioning) return;
    setTransitionProgress(0);
    const id = setInterval(() => {
      setTransitionProgress((p) => {
        const next = p + 2;
        if (next >= 100) {
          clearInterval(id);
          setTransitioning(false);
          return 100;
        }
        return next;
      });
    }, 100);
    return () => clearInterval(id);
  }, [transitioning]);

  const save = (key: string, value: string) => setWizardAnswer(fkey(activeWeek.id, task.id, key), value);
  const say = (v: string) => t.chat.replace("{v}", v);

  const finishStep = () => {
    const isLastTaskOfDay = doneCount + 1 >= dayTasks.length;
    const isLastDay = day >= weekPlan.length - 1;
    if (task.id === "step2_script") {
      saveWeek({ ...activeWeek, topicTitle: hasValue(values.topic) ? values.topic : activeWeek.topicTitle, cefr: effectiveCefr });
    }
    saveTaskRun({
      id: crypto.randomUUID(),
      weekId: activeWeek.id,
      dayOfWeek: day,
      taskType: task.id,
      completed: true,
      startedAt: new Date().toISOString(),
      endedAt: new Date().toISOString()
    });
    setFeedback("");
    if (isLastTaskOfDay) {
      setDayWrap({ fromDay: day, nextDay: isLastDay ? null : day + 1 });
      setTransitioning(false);
      return;
    }
    setTransitioning(true);
  };

  const isFinalQuestion = (curKey: string) => visible.every((f) => f.key === curKey || hasValue(values[f.key]));

  const submitCurrent = () => {
    if (!current || !draft.trim()) return;
    save(current.key, draft.trim());
    setFeedback(say(draft.trim()));
    if (isFinalQuestion(current.key)) setTimeout(finishStep, 220);
  };

  const submitYesNo = (v: "yes" | "no") => {
    if (!current) return;
    save(current.key, v);
    setFeedback(say(v === "yes" ? t.yes : t.no));
    if (isFinalQuestion(current.key)) setTimeout(finishStep, 220);
  };

  const goBack = () => {
    if (lastAnswered) {
      save(lastAnswered.key, "");
      return;
    }
    if (hasAnyCompleted) undoLastCompletedTask(activeWeek.id);
  };

  const skip = () => {
    if (current) {
      save(current.key, "__skip__");
      setFeedback(say(t.skipped));
      if (isFinalQuestion(current.key)) setTimeout(finishStep, 220);
      return;
    }
    goBack();
  };

  const closeDay = () => {
    if (!dayWrap) return;
    if (dayWrap.nextDay !== null) setStartCardDay(dayWrap.nextDay);
    setDayWrap(null);
  };

  const startNextDay = () => {
    setStartCardDay(null);
  };

  const step2 = step2Prompt(effectiveCefr, values.topic || activeWeek.topicTitle, state.language);
  const step6 = step6Prompt(effectiveCefr, values.scene || "", values.roleGoal || "", Number(values.extendedMinutes || 5), state.language);
  const step7 = step7Prompt(effectiveCefr, values.transcript || "", state.language);
  const step5 = step5Prompt(effectiveCefr, values.weekText || "", state.language);
  const displayDay = startCardDay ?? dayWrap?.fromDay ?? day;

  return (
    <div className="h-[calc(100vh-112px)] flex flex-col gap-4 overflow-hidden">
      <section className="glass rounded-xl2 p-4">
        <p className="text-xs text-slate-700">{t.title}</p>
        <h1 className="text-2xl font-black">{ja ? `${displayDay + 1}${t.day}` : `${t.day} ${displayDay + 1}`}</h1>
        <p className="text-sm text-slate-800">{t.oneByOne}</p>
      </section>

      <section className="glass rounded-xl2 p-5 flex-1 flex flex-col justify-between overflow-auto">
        <div className="space-y-3">
          <p className="text-sm text-slate-800">
            {t.progress}: {doneCount}/{dayTasks.length}
          </p>
          <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-2 rounded-full bg-accent transition-all duration-300" style={{ width: `${(doneCount / dayTasks.length) * 100}%` }} />
          </div>

          <article className="input">
            <p className="font-semibold text-slate-900">{ja ? task.ja : task.en}</p>
          </article>

          {!!feedback && <article className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-slate-900">{feedback}</article>}

          <div key={`${day}-${task.id}-${current?.key ?? "action"}-${transitioning ? "done" : "live"}`} className="rounded-xl border border-slate-200 bg-white/70 p-4 animate-card-swap">
            {dayWrap ? (
              <div className="space-y-3">
                <p className="font-semibold text-slate-900">{dayWrap.nextDay === null ? t.weekDoneTitle : t.dayDoneTitle}</p>
                <p className="text-sm text-slate-800">{dayWrap.nextDay === null ? t.weekDoneBody : t.dayDoneBody}</p>
                <button className="btn-primary w-full" onClick={closeDay}>
                  {t.finishDay}
                </button>
              </div>
            ) : startCardDay !== null ? (
              <div className="space-y-3">
                <p className="font-semibold text-slate-900">{t.nextDayStart.replace("{d}", String(startCardDay + 1))}</p>
                <button className="btn-primary w-full" onClick={startNextDay}>
                  {t.startNextDay}
                </button>
              </div>
            ) : transitioning ? (
              <div className="space-y-3">
                <p className="font-semibold text-slate-900">{t.stepDone}</p>
                <div className="h-2 rounded-full bg-slate-200">
                  <div className="h-2 rounded-full bg-accent transition-all duration-75" style={{ width: `${transitionProgress}%` }} />
                </div>
              </div>
            ) : current ? (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">{ja ? current.ja : current.en}</label>
                {current.type === "text" && <input className="input text-slate-900" value={draft} onChange={(e) => setDraft(e.target.value)} />}
                {current.type === "textarea" && <textarea className="input min-h-24 text-slate-900" value={draft} onChange={(e) => setDraft(e.target.value)} />}
                {current.type === "select" && (
                  <select className="input text-slate-900" value={draft} onChange={(e) => setDraft(e.target.value)}>
                    <option value="">{t.select}</option>
                    {(current.options ?? []).map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                )}
                {current.type === "yesno" ? (
                  <div className="flex gap-2">
                    <button className="btn-primary" onClick={() => submitYesNo("yes")}>
                      {t.yes}
                    </button>
                    <button className="btn-secondary" onClick={() => submitYesNo("no")}>
                      {t.no}
                    </button>
                  </div>
                ) : (
                  <button className="btn-primary" onClick={submitCurrent} disabled={!draft.trim()}>
                    {t.submit}
                  </button>
                )}
                {current.key === "useDefaultCefr" && (
                  <p className="text-xs text-slate-700">
                    {t.defaultCefr}: {state.prefs.defaultCefr}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {task.id === "step2_script" && (
                  <PromptCard
                    title="Step2 Prompt"
                    prompt={step2}
                    language={state.language}
                    onSavePaste={(text) => {
                      saveScript({ id: crypto.randomUUID(), weekId: activeWeek.id, jpSource: values.topic || activeWeek.topicTitle, enScript: text, createdAt: new Date().toISOString() });
                      finishStep();
                    }}
                  />
                )}

                {(task.id === "step3_read" || task.id === "step3_revised" || task.id === "step3_review") && (
                  <>
                    <TTSPlayer text={latestRoleplay?.correctionText || latestScript?.enScript || ""} language={state.language} />
                    <button className="btn-primary w-full" onClick={finishStep}>
                      {t.finishRead}
                    </button>
                  </>
                )}

                {(task.id === "record_baseline" || task.id === "record_compare") && (
                  <Recorder
                    language={state.language}
                    onSave={(blobUrl, memo) => {
                      saveAudio({
                        id: crypto.randomUUID(),
                        weekId: activeWeek.id,
                        type: task.id === "record_baseline" ? "baseline" : "review",
                        blobUrl,
                        memo,
                        createdAt: new Date().toISOString()
                      });
                      finishStep();
                    }}
                  />
                )}

                {(task.id === "step4_321" || task.id === "step4_light") && (
                  <Timer321
                    language={state.language}
                    onSave={(mode, sec, rating, notes) => {
                      saveRetelling({ id: crypto.randomUUID(), weekId: activeWeek.id, mode, actualTimeSec: sec, rating, notes, createdAt: new Date().toISOString() });
                      finishStep();
                    }}
                  />
                )}

                {(task.id === "step6_roleplay" || task.id === "step6_advanced" || task.id === "step6_extended") && (
                  <PromptCard
                    title="Step6 Prompt"
                    prompt={step6}
                    language={state.language}
                    onSavePaste={(text) => {
                      saveRoleplay({
                        id: crypto.randomUUID(),
                        weekId: activeWeek.id,
                        promptText: step6,
                        transcriptText: text,
                        correctionText: "",
                        materialDialogueText: "",
                        phrasesText: "",
                        createdAt: new Date().toISOString()
                      });
                      finishStep();
                    }}
                  />
                )}

                {task.id === "step7_correct" && (
                  <PromptCard
                    title="Step7 Prompt"
                    prompt={step7}
                    language={state.language}
                    onSavePaste={(text) => {
                      saveRoleplay({
                        id: crypto.randomUUID(),
                        weekId: activeWeek.id,
                        promptText: step6,
                        transcriptText: values.transcript || "",
                        correctionText: text,
                        materialDialogueText: text,
                        phrasesText: text,
                        createdAt: new Date().toISOString()
                      });
                      finishStep();
                    }}
                  />
                )}

                {task.id === "step5_review" && <PromptCard title="Step5 Prompt" prompt={step5} language={state.language} onSavePaste={() => finishStep()} />}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-3">
          <div className="flex gap-2">
            <button className="btn-secondary flex-1" onClick={goBack} disabled={transitioning || !!dayWrap || startCardDay !== null || (!hasAnyCompleted && !lastAnswered)}>
              {t.back}
            </button>
            <button className="btn-secondary flex-1" onClick={skip} disabled={transitioning || !!dayWrap || startCardDay !== null}>
              {t.skip}
            </button>
          </div>
          <a href="/practice" className="btn-secondary w-full block text-center py-3">
            {t.openProgress}
          </a>
        </div>
      </section>
    </div>
  );
}
