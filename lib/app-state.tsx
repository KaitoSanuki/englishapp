"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, AudioRecordItem, Language, MaterialAudioItem, RetellingItem, RoleplayItem, ScriptItem, TaskRun, WeekPlan } from "@/lib/types";
import { isSupabaseEnabled, supabaseGetPlan, supabaseGetUser, supabaseLoadSnapshot, supabaseSaveSnapshot, supabaseSignIn, supabaseSignUp } from "@/lib/supabase-browser";

const STORAGE_KEY = "englishapp_state_v02";
const AUTH_KEY = "englishapp_auth_v01";

type UserPlan = "free" | "pro";
type AuthState = {
  enabled: boolean;
  mode: "guest" | "user";
  userId?: string;
  email?: string;
  accessToken?: string;
  plan: UserPlan;
  busy: boolean;
  error?: string;
};

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
  language: "ja",
  prefs: {
    defaultCefr: "A2",
    ttsEngine: "web",
    ttsModel: "standard"
  },
  wizardAnswers: {},
  weeks: [defaultWeek],
  activeWeekId: defaultWeek.id,
  taskRuns: [],
  scripts: [],
  roleplays: [],
  retellings: [],
  audioRecords: [],
  materialAudios: [],
  reviewMemo: ""
};

const defaultAuth: AuthState = {
  enabled: isSupabaseEnabled(),
  mode: "guest",
  plan: "free",
  busy: false
};

type AppStateContextType = {
  state: AppState;
  activeWeek: WeekPlan;
  auth: AuthState;
  setLanguage: (lang: Language) => void;
  setDefaultCefr: (cefr: WeekPlan["cefr"]) => void;
  setTtsEngine: (engine: "web" | "google" | "elevenlabs") => void;
  setTtsModel: (model: "standard" | "wavenet") => void;
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
  saveMaterialAudio: (item: MaterialAudioItem) => void;
  setReviewMemo: (memo: string) => void;
  createNextWeek: () => void;
  toggleWeekFavorite: (weekId: string) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  syncNow: () => Promise<void>;
};

const AppStateContext = createContext<AppStateContextType | null>(null);

const hydrateState = (input: Partial<AppState> | null | undefined): AppState => ({
  ...defaultState,
  ...(input ?? {}),
  prefs: {
    ...defaultState.prefs,
    ...(input?.prefs ?? {})
  },
  wizardAnswers: input?.wizardAnswers ?? {},
  language: (input?.language === "en" ? "en" : "ja") as Language,
  weeks: (input?.weeks ?? defaultState.weeks).map((w) => ({
    ...w,
    isFavorite: !!w.isFavorite,
    createdAt: w.createdAt ?? w.startDate
  }))
});

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [auth, setAuth] = useState<AuthState>(defaultAuth);
  const cloudReadyRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);
  const lastSyncedRef = useRef("");

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
      audioRecords: next.audioRecords.filter((x) => keepIds.has(x.weekId)),
      materialAudios: next.materialAudios.filter((x) => keepIds.has(x.weekId))
    };
  };

  const applyLoadedState = (candidate: Partial<AppState> | null | undefined) => {
    const hydrated = hydrateState(candidate);
    const pruned = pruneStateByWeeks(hydrated);
    setState(pruned);
    return pruned;
  };

  const loadCloudSnapshot = async (userId: string, token: string) => {
    const remote = await supabaseLoadSnapshot(userId, token);
    if (remote) {
      const applied = applyLoadedState(remote);
      lastSyncedRef.current = JSON.stringify(applied);
      cloudReadyRef.current = true;
      return;
    }
    await supabaseSaveSnapshot(userId, token, state);
    lastSyncedRef.current = JSON.stringify(state);
    cloudReadyRef.current = true;
  };

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        applyLoadedState(JSON.parse(raw) as Partial<AppState>);
      } catch {
        setState(defaultState);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!auth.enabled) return;
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return;
    let parsed: { accessToken?: string } = {};
    try {
      parsed = JSON.parse(raw) as { accessToken?: string };
    } catch {
      localStorage.removeItem(AUTH_KEY);
      return;
    }
    if (!parsed.accessToken) return;

    const boot = async () => {
      try {
        setAuth((prev) => ({ ...prev, busy: true, error: undefined }));
        const user = await supabaseGetUser(parsed.accessToken!);
        const plan = await supabaseGetPlan(user.id, parsed.accessToken!);
        setAuth({
          enabled: true,
          mode: "user",
          userId: user.id,
          email: user.email ?? "",
          accessToken: parsed.accessToken!,
          plan,
          busy: false
        });
        await loadCloudSnapshot(user.id, parsed.accessToken!);
      } catch {
        localStorage.removeItem(AUTH_KEY);
        setAuth(defaultAuth);
      }
    };
    void boot();
  }, [auth.enabled]);

  useEffect(() => {
    if (!auth.enabled || auth.mode !== "user" || !auth.userId || !auth.accessToken || !cloudReadyRef.current) return;
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      const run = async () => {
        const serialized = JSON.stringify(state);
        if (serialized === lastSyncedRef.current) return;
        try {
          await supabaseSaveSnapshot(auth.userId!, auth.accessToken!, state);
          lastSyncedRef.current = serialized;
        } catch {
          // keep local state even if sync failed
        }
      };
      void run();
    }, 1000);
    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [auth.accessToken, auth.enabled, auth.mode, auth.userId, state]);

  const activeWeek = useMemo(() => {
    return state.weeks.find((w) => w.id === state.activeWeekId) ?? state.weeks[0];
  }, [state.activeWeekId, state.weeks]);

  const signIn = async (email: string, password: string) => {
    if (!auth.enabled) throw new Error("Supabase is not configured.");
    setAuth((prev) => ({ ...prev, busy: true, error: undefined }));
    try {
      const session = await supabaseSignIn(email, password);
      localStorage.setItem(AUTH_KEY, JSON.stringify({ accessToken: session.access_token }));
      const plan = await supabaseGetPlan(session.user.id, session.access_token);
      setAuth({
        enabled: true,
        mode: "user",
        userId: session.user.id,
        email: session.user.email ?? email,
        accessToken: session.access_token,
        plan,
        busy: false
      });
      await loadCloudSnapshot(session.user.id, session.access_token);
    } catch (error) {
      setAuth((prev) => ({
        ...prev,
        busy: false,
        error: error instanceof Error ? error.message : "Sign in failed."
      }));
      throw error;
    }
  };

  const signUp = async (email: string, password: string) => {
    if (!auth.enabled) throw new Error("Supabase is not configured.");
    setAuth((prev) => ({ ...prev, busy: true, error: undefined }));
    try {
      await supabaseSignUp(email, password);
      try {
        const session = await supabaseSignIn(email, password);
        localStorage.setItem(AUTH_KEY, JSON.stringify({ accessToken: session.access_token }));
        setAuth({
          enabled: true,
          mode: "user",
          userId: session.user.id,
          email: session.user.email ?? email,
          accessToken: session.access_token,
          plan: "free",
          busy: false
        });
        await loadCloudSnapshot(session.user.id, session.access_token);
        return;
      } catch (signInError) {
        const msg = signInError instanceof Error ? signInError.message : "";
        if (msg.includes("email_not_confirmed") || msg.includes("Email not confirmed")) {
          setAuth((prev) => ({ ...prev, busy: false, error: undefined }));
          return;
        }
        throw signInError;
      }
    } catch (error) {
      setAuth((prev) => ({
        ...prev,
        busy: false,
        error: error instanceof Error ? error.message : "Sign up failed."
      }));
      throw error;
    }
  };

  const signOut = () => {
    localStorage.removeItem(AUTH_KEY);
    cloudReadyRef.current = false;
    lastSyncedRef.current = "";
    setAuth(defaultAuth);
  };

  const syncNow = async () => {
    if (auth.mode !== "user" || !auth.userId || !auth.accessToken) return;
    await supabaseSaveSnapshot(auth.userId, auth.accessToken, state);
    lastSyncedRef.current = JSON.stringify(state);
  };

  const value: AppStateContextType = {
    state,
    activeWeek,
    auth,
    setLanguage: (lang) => setState((prev) => ({ ...prev, language: lang })),
    setDefaultCefr: (cefr) => setState((prev) => ({ ...prev, prefs: { ...prev.prefs, defaultCefr: cefr } })),
    setTtsEngine: (engine) =>
      setState((prev) => {
        if (engine === "elevenlabs" && auth.plan !== "pro") return prev;
        return { ...prev, prefs: { ...prev.prefs, ttsEngine: engine } };
      }),
    setTtsModel: (model) => setState((prev) => ({ ...prev, prefs: { ...prev.prefs, ttsModel: model } })),
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
          materialAudios: prev.materialAudios.filter((x) => x.weekId !== weekId),
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
    saveWeek: (week) =>
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
      }),
    setActiveWeek: (weekId) => setState((prev) => ({ ...prev, activeWeekId: weekId })),
    saveTaskRun: (task) => setState((prev) => ({ ...prev, taskRuns: [task, ...prev.taskRuns] })),
    saveScript: (script) => setState((prev) => ({ ...prev, scripts: [script, ...prev.scripts] })),
    saveRoleplay: (item) => setState((prev) => ({ ...prev, roleplays: [item, ...prev.roleplays] })),
    saveRetelling: (item) => setState((prev) => ({ ...prev, retellings: [item, ...prev.retellings] })),
    saveAudio: (item) => setState((prev) => ({ ...prev, audioRecords: [item, ...prev.audioRecords] })),
    saveMaterialAudio: (item) =>
      setState((prev) => {
        const nextList = prev.materialAudios.filter((x) => !(x.weekId === item.weekId && x.kind === item.kind));
        return { ...prev, materialAudios: [item, ...nextList] };
      }),
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
      }),
    signIn,
    signUp,
    signOut,
    syncNow
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
