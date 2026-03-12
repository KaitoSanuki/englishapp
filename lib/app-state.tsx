"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AppState, AudioRecordItem, Language, RetellingItem, RoleplayItem, ScriptItem, TaskRun, WeekPlan } from "@/lib/types";

const STORAGE_KEY = "englishapp_state_v02";

const monday = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const result = new Date(now);
  result.setDate(now.getDate() + diff);
  return result.toISOString().slice(0, 10);
};

const defaultWeek: WeekPlan = {
  id: crypto.randomUUID(),
  startDate: monday(),
  topicTitle: "Self introduction",
  goal: "Talk about work and hobbies for 3 turns",
  cefr: "A2",
  descriptionJp: "Talk about name, work, and hobbies in 60 seconds",
  streak: 1,
  isFavorite: false,
  createdAt: new Date().toISOString()
};

const defaultState: AppState = {
  language: "en",
  prefs: {
    defaultCefr: "A2"
  },
  wizardAnswers: {},
  weeks: [defaultWeek],
  activeWeekId: defaultWeek.id,
  taskRuns: [],
  scripts: [],
  roleplays: [],
  retellings: [],
  audioRecords: [],
  reviewMemo: ""
};

type AppStateContextType = {
  state: AppState;
  activeWeek: WeekPlan;
  setLanguage: (lang: Language) => void;
  setDefaultCefr: (cefr: WeekPlan["cefr"]) => void;
  setWizardAnswer: (key: string, value: string) => void;
  resetWeekData: (weekId: string) => void;
  undoLastCompletedTask: (weekId: string) => void;
  saveWeek: (week: WeekPlan) => void;
  setActiveWeek: (weekId: string) => void;
  saveTaskRun: (task: TaskRun) => void;
  saveScript: (script: ScriptItem) => void;
  saveRoleplay: (item: RoleplayItem) => void;
  saveRetelling: (item: RetellingItem) => void;
  saveAudio: (item: AudioRecordItem) => void;
  setReviewMemo: (memo: string) => void;
  createNextWeek: () => void;
  toggleWeekFavorite: (weekId: string) => void;
};

const AppStateContext = createContext<AppStateContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);

  const pruneStateByWeeks = (next: AppState) => {
    const favorites = next.weeks.filter((w) => w.isFavorite).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    const favored = favorites.slice(0, 9);
    const favoredIds = new Set(favored.map((w) => w.id));
    const nonFav = next.weeks
      .filter((w) => !favoredIds.has(w.id))
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    const keptNonFav = nonFav.slice(0, 10);
    const keptWeeks = [...favored, ...keptNonFav].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
    const keepIds = new Set(keptWeeks.map((w) => w.id));
    const cleanAnswers: Record<string, string> = {};
    for (const [k, v] of Object.entries(next.wizardAnswers)) {
      const weekId = k.split(":")[0];
      if (keepIds.has(weekId)) cleanAnswers[k] = v;
    }
    const nextActiveWeekId = next.activeWeekId && keepIds.has(next.activeWeekId) ? next.activeWeekId : keptWeeks[0]?.id;
    return {
      ...next,
      activeWeekId: nextActiveWeekId,
      weeks: keptWeeks.map((w) => ({ ...w, isFavorite: favoredIds.has(w.id) })),
      wizardAnswers: cleanAnswers,
      taskRuns: next.taskRuns.filter((x) => keepIds.has(x.weekId)),
      scripts: next.scripts.filter((x) => keepIds.has(x.weekId)),
      roleplays: next.roleplays.filter((x) => keepIds.has(x.weekId)),
      retellings: next.retellings.filter((x) => keepIds.has(x.weekId)),
      audioRecords: next.audioRecords.filter((x) => keepIds.has(x.weekId))
    };
  };

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<AppState>;
        const hydrated = {
          ...defaultState,
          ...parsed,
          prefs: {
            ...defaultState.prefs,
            ...(parsed.prefs ?? {})
          },
          wizardAnswers: parsed.wizardAnswers ?? {},
          language: (parsed.language === "ja" ? "ja" : "en") as Language,
          weeks: (parsed.weeks ?? defaultState.weeks).map((w) => ({
            ...w,
            isFavorite: !!w.isFavorite,
            createdAt: w.createdAt ?? w.startDate
          }))
        };
        setState(pruneStateByWeeks(hydrated));
      } catch {
        setState(defaultState);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const activeWeek = useMemo(() => {
    return state.weeks.find((w) => w.id === state.activeWeekId) ?? state.weeks[0];
  }, [state.activeWeekId, state.weeks]);

  const value: AppStateContextType = {
    state,
    activeWeek,
    setLanguage: (lang) => setState((prev) => ({ ...prev, language: lang })),
    setDefaultCefr: (cefr) => setState((prev) => ({ ...prev, prefs: { ...prev.prefs, defaultCefr: cefr } })),
    setWizardAnswer: (key, value) =>
      setState((prev) => ({
        ...prev,
        wizardAnswers: {
          ...prev.wizardAnswers,
          [key]: value
        }
      })),
    resetWeekData: (weekId) =>
      setState((prev) => {
        const prefix = `${weekId}:`;
        const nextAnswers: Record<string, string> = {};
        for (const [k, v] of Object.entries(prev.wizardAnswers)) {
          if (!k.startsWith(prefix)) nextAnswers[k] = v;
        }
        return {
          ...prev,
          taskRuns: prev.taskRuns.filter((x) => x.weekId !== weekId),
          scripts: prev.scripts.filter((x) => x.weekId !== weekId),
          roleplays: prev.roleplays.filter((x) => x.weekId !== weekId),
          retellings: prev.retellings.filter((x) => x.weekId !== weekId),
          audioRecords: prev.audioRecords.filter((x) => x.weekId !== weekId),
          reviewMemo: "",
          wizardAnswers: nextAnswers
        };
      }),
    undoLastCompletedTask: (weekId) =>
      setState((prev) => {
        const idx = prev.taskRuns.findIndex((x) => x.weekId === weekId && x.completed);
        if (idx === -1) return prev;
        return {
          ...prev,
          taskRuns: prev.taskRuns.filter((_, i) => i !== idx)
        };
      }),
    saveWeek: (week) => {
      setState((prev) => {
        const exists = prev.weeks.some((w) => w.id === week.id);
        const next = {
          ...prev,
          weeks: exists
            ? prev.weeks.map((w) => (w.id === week.id ? { ...week, isFavorite: w.isFavorite ?? false, createdAt: w.createdAt ?? week.startDate } : w))
            : [{ ...week, isFavorite: false, createdAt: week.createdAt ?? new Date().toISOString() }, ...prev.weeks],
          activeWeekId: week.id
        };
        return pruneStateByWeeks(next);
      });
    },
    setActiveWeek: (weekId) => setState((prev) => ({ ...prev, activeWeekId: weekId })),
    saveTaskRun: (task) => setState((prev) => ({ ...prev, taskRuns: [task, ...prev.taskRuns] })),
    saveScript: (script) => setState((prev) => ({ ...prev, scripts: [script, ...prev.scripts] })),
    saveRoleplay: (item) => setState((prev) => ({ ...prev, roleplays: [item, ...prev.roleplays] })),
    saveRetelling: (item) => setState((prev) => ({ ...prev, retellings: [item, ...prev.retellings] })),
    saveAudio: (item) => setState((prev) => ({ ...prev, audioRecords: [item, ...prev.audioRecords] })),
    setReviewMemo: (memo) => setState((prev) => ({ ...prev, reviewMemo: memo })),
    createNextWeek: () =>
      setState((prev) => {
        const nextWeek: WeekPlan = {
          id: crypto.randomUUID(),
          startDate: monday(),
          topicTitle: "New Topic",
          goal: "Talk for 3 turns",
          cefr: prev.prefs.defaultCefr,
          descriptionJp: "",
          streak: 1,
          isFavorite: false,
          createdAt: new Date().toISOString()
        };
        return pruneStateByWeeks({
          ...prev,
          weeks: [nextWeek, ...prev.weeks],
          activeWeekId: nextWeek.id
        });
      }),
    toggleWeekFavorite: (weekId) =>
      setState((prev) => {
        const target = prev.weeks.find((w) => w.id === weekId);
        if (!target) return prev;
        if (!target.isFavorite) {
          const favoriteCount = prev.weeks.filter((w) => w.isFavorite).length;
          if (favoriteCount >= 9) return prev;
        }
        const next = {
          ...prev,
          weeks: prev.weeks.map((w) => (w.id === weekId ? { ...w, isFavorite: !w.isFavorite } : w))
        };
        return pruneStateByWeeks(next);
      })
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used inside AppProvider");
  }
  return ctx;
}
