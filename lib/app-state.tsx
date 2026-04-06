"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  CEFR,
  DebugTrace,
  ExternalChatPrompt,
  GenerationJob,
  GuestTrialState,
  Language,
  LessonSession,
  PhraseSet,
  PodcastEpisode,
  PodcastVoiceGender,
  RetellingSession,
  SpeechMaterial,
  UserPlan,
  UserRole,
  WeekRecord
} from "@/lib/types";
import { createEmptyDayStatuses, guestSampleDays, makeMonday } from "@/lib/lesson-utils";
import { allOpenAiVoices, openAiVoices } from "@/lib/openai-voices";
import { isSupabaseEnabled, supabaseGetPlan, supabaseGetUser, supabaseLoadSnapshot, supabaseSaveSnapshot, supabaseSignIn, supabaseSignUp } from "@/lib/supabase-browser";

type AuthState = {
  enabled: boolean;
  mode: "guest" | "user";
  userId?: string;
  email?: string;
  accessToken?: string;
  plan: UserPlan;
  role: UserRole;
  busy: boolean;
  error?: string;
};

const STORAGE_KEY = "englishapp_state_v1_api";
const AUTH_KEY = "englishapp_auth_v01";
const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

const choose = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)] ?? items[0];

const buildWeek = (): WeekRecord => ({
  id: crypto.randomUUID(),
  startDate: makeMonday(),
  theme: "",
  note: "",
  cefr: "A2",
  status: "active",
  phraseSets: [],
  podcasts: [],
  retellings: [],
  externalPrompts: [],
  dayStatuses: createEmptyDayStatuses(),
  podcastPartnerVoice: choose(allOpenAiVoices),
  podcastUserVoice: choose(openAiVoices.female),
  createdAt: new Date().toISOString()
});

const defaultGuestTrial: GuestTrialState = {
  completedDayIndices: []
};

const defaultState: AppState = {
  language: "ja",
  lessonFocusActive: false,
  prefs: {
    defaultCefr: "A2",
    podcastUserGender: "female",
    adminDebugEnabled: false
  },
  weeks: [buildWeek()],
  activeWeekId: undefined,
  lessonSession: undefined,
  currentJob: undefined,
  phraseUsage: {},
  guestTrial: defaultGuestTrial,
  debugTraces: []
};

const toLocalSnapshot = (input: AppState): AppState => ({
  ...input,
  lessonFocusActive: false,
  currentJob: undefined,
  debugTraces: []
});

const toCloudSnapshot = (input: AppState): AppState => ({
  ...toLocalSnapshot(input),
  lessonSession: undefined
});

type AppStateContextType = {
  state: AppState;
  auth: AuthState;
  activeWeek: WeekRecord;
  canUseAdminMode: boolean;
  setLanguage: (language: Language) => void;
  setDefaultCefr: (cefr: CEFR) => void;
  setPodcastUserGender: (gender: PodcastVoiceGender) => void;
  setAdminDebugEnabled: (enabled: boolean) => void;
  setLessonFocusActive: (active: boolean) => void;
  setLessonSession: (session?: LessonSession) => void;
  setCurrentJob: (job?: GenerationJob) => void;
  saveWeekMeta: (input: Pick<WeekRecord, "theme" | "note" | "cefr">) => void;
  replaceWeek: (week: WeekRecord) => void;
  createNextWeek: () => void;
  setActiveWeek: (weekId: string) => void;
  saveSpeech: (speech: SpeechMaterial) => void;
  savePhraseSet: (phraseSet: PhraseSet) => void;
  savePodcast: (episode: PodcastEpisode) => void;
  saveRetelling: (retelling: RetellingSession) => void;
  saveExternalPrompt: (prompt: ExternalChatPrompt) => void;
  markTaskComplete: (dayIndex: number, task: keyof WeekRecord["dayStatuses"][number]["tasks"]) => void;
  completeDay: (dayIndex: number) => void;
  resetActiveWeek: () => void;
  incrementPhraseUsage: (phraseIds: string[]) => void;
  addDebugTrace: (trace: DebugTrace) => void;
  clearDebugTraces: () => void;
  markGuestTrialDay: (dayIndex: number) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  syncNow: () => Promise<void>;
};

const AppStateContext = createContext<AppStateContextType | null>(null);

const hydrateState = (input?: Partial<AppState> | null): AppState => {
  const weeks = input?.weeks?.length ? input.weeks : [buildWeek()];
  const activeWeekId = input?.activeWeekId && weeks.some((week) => week.id === input.activeWeekId) ? input.activeWeekId : weeks[0]?.id;
  return {
    ...defaultState,
    ...(input ?? {}),
    language: input?.language === "en" ? "en" : "ja",
    lessonFocusActive: false,
    prefs: {
      ...defaultState.prefs,
      ...(input?.prefs ?? {})
    },
    weeks,
    activeWeekId,
    lessonSession: input?.lessonSession,
    currentJob: undefined,
    phraseUsage: input?.phraseUsage ?? {},
    guestTrial: input?.guestTrial ?? defaultGuestTrial,
    debugTraces: []
  };
};

const defaultAuth: AuthState = {
  enabled: isSupabaseEnabled(),
  mode: "guest",
  plan: "free",
  role: "user",
  busy: false
};

const getRoleFromEmail = (email?: string | null): UserRole => (email && ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "user");

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);
  const [auth, setAuth] = useState<AuthState>(defaultAuth);
  const cloudReadyRef = useRef(false);
  const syncTimerRef = useRef<number | null>(null);
  const lastSyncedRef = useRef("");

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      setState(hydrateState(JSON.parse(raw) as Partial<AppState>));
    } catch {
      setState(defaultState);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toLocalSnapshot(state)));
  }, [state]);

  const loadCloudSnapshot = async (userId: string, token: string) => {
    const remote = await supabaseLoadSnapshot(userId, token);
    if (remote) {
      const hydrated = hydrateState(remote);
      setState(hydrated);
      lastSyncedRef.current = JSON.stringify(toCloudSnapshot(hydrated));
      cloudReadyRef.current = true;
      return;
    }
    const snapshot = toCloudSnapshot(state);
    await supabaseSaveSnapshot(userId, token, snapshot);
    lastSyncedRef.current = JSON.stringify(snapshot);
    cloudReadyRef.current = true;
  };

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
          role: getRoleFromEmail(user.email),
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
        const snapshot = toCloudSnapshot(state);
        const serialized = JSON.stringify(snapshot);
        if (serialized === lastSyncedRef.current) return;
        try {
          await supabaseSaveSnapshot(auth.userId!, auth.accessToken!, snapshot);
          lastSyncedRef.current = serialized;
        } catch {
          // keep local state
        }
      };
      void run();
    }, 1000);
    return () => {
      if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    };
  }, [auth.accessToken, auth.enabled, auth.mode, auth.userId, state]);

  const activeWeek = useMemo(() => {
    return state.weeks.find((week) => week.id === state.activeWeekId) ?? state.weeks[0] ?? buildWeek();
  }, [state.activeWeekId, state.weeks]);

  const updateActiveWeek = (updater: (week: WeekRecord) => WeekRecord) => {
    setState((prev) => ({
      ...prev,
      weeks: prev.weeks.map((week) => (week.id === (prev.activeWeekId ?? activeWeek.id) ? updater(week) : week))
    }));
  };

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
        role: getRoleFromEmail(session.user.email ?? email),
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
      setAuth((prev) => ({ ...prev, busy: false, error: undefined }));
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
    const snapshot = toCloudSnapshot(state);
    await supabaseSaveSnapshot(auth.userId, auth.accessToken, snapshot);
    lastSyncedRef.current = JSON.stringify(snapshot);
  };

  const value: AppStateContextType = {
    state,
    auth,
    activeWeek,
    canUseAdminMode: auth.role === "admin",
    setLanguage: (language) => setState((prev) => ({ ...prev, language })),
    setDefaultCefr: (defaultCefr) => setState((prev) => ({ ...prev, prefs: { ...prev.prefs, defaultCefr } })),
    setPodcastUserGender: (podcastUserGender) =>
      setState((prev) => ({
        ...prev,
        prefs: { ...prev.prefs, podcastUserGender },
        weeks: prev.weeks.map((week) =>
          week.id === (prev.activeWeekId ?? activeWeek.id)
            ? { ...week, podcastUserVoice: choose(openAiVoices[podcastUserGender]) }
            : week
        )
      })),
    setAdminDebugEnabled: (adminDebugEnabled) => setState((prev) => ({ ...prev, prefs: { ...prev.prefs, adminDebugEnabled } })),
    setLessonFocusActive: (lessonFocusActive) => setState((prev) => ({ ...prev, lessonFocusActive })),
    setLessonSession: (lessonSession) => setState((prev) => ({ ...prev, lessonSession })),
    setCurrentJob: (currentJob) => setState((prev) => ({ ...prev, currentJob })),
    saveWeekMeta: ({ theme, note, cefr }) =>
      updateActiveWeek((week) => ({
        ...week,
        theme,
        note,
        cefr
      })),
    replaceWeek: (nextWeek) =>
      setState((prev) => ({
        ...prev,
        weeks: prev.weeks.map((week) => (week.id === nextWeek.id ? nextWeek : week))
      })),
    createNextWeek: () =>
      setState((prev) => {
        const nextWeek = buildWeek();
        nextWeek.cefr = prev.prefs.defaultCefr;
        nextWeek.podcastUserVoice = choose(openAiVoices[prev.prefs.podcastUserGender]);
        return {
          ...prev,
          weeks: [nextWeek, ...prev.weeks],
          activeWeekId: nextWeek.id,
          lessonFocusActive: false,
          lessonSession: undefined,
          currentJob: undefined
        };
      }),
    setActiveWeek: (weekId) => setState((prev) => ({ ...prev, activeWeekId: weekId })),
    saveSpeech: (speech) => updateActiveWeek((week) => ({ ...week, speech })),
    savePhraseSet: (phraseSet) => updateActiveWeek((week) => ({ ...week, phraseSets: [...week.phraseSets.filter((item) => item.dayIndex !== phraseSet.dayIndex), phraseSet] })),
    savePodcast: (episode) => updateActiveWeek((week) => ({ ...week, podcasts: [...week.podcasts.filter((item) => item.dayIndex !== episode.dayIndex), episode] })),
    saveRetelling: (retelling) => updateActiveWeek((week) => ({ ...week, retellings: [...week.retellings.filter((item) => item.dayIndex !== retelling.dayIndex), retelling] })),
    saveExternalPrompt: (prompt) => updateActiveWeek((week) => ({ ...week, externalPrompts: [...week.externalPrompts.filter((item) => item.dayIndex !== prompt.dayIndex), prompt] })),
    markTaskComplete: (dayIndex, task) =>
      updateActiveWeek((week) => ({
        ...week,
        dayStatuses: week.dayStatuses.map((status) =>
          status.dayIndex === dayIndex
            ? {
                ...status,
                tasks: {
                  ...status.tasks,
                  [task]: true
                }
              }
            : status
        )
      })),
    completeDay: (dayIndex) =>
      updateActiveWeek((week) => ({
        ...week,
        dayStatuses: week.dayStatuses.map((status) =>
          status.dayIndex === dayIndex
            ? {
                ...status,
                completed: true
              }
            : status
        ),
        status: dayIndex >= 7 ? "completed" : week.status
      })),
    resetActiveWeek: () =>
      setState((prev) => ({
        ...prev,
        weeks: prev.weeks.map((week) =>
          week.id === (prev.activeWeekId ?? activeWeek.id)
            ? {
                ...buildWeek(),
                id: week.id,
                startDate: week.startDate,
                createdAt: week.createdAt,
                podcastUserVoice: choose(openAiVoices[prev.prefs.podcastUserGender])
              }
            : week
        ),
        lessonFocusActive: false,
        lessonSession: undefined,
        currentJob: undefined,
        debugTraces: []
      })),
    incrementPhraseUsage: (phraseIds) =>
      setState((prev) => ({
        ...prev,
        phraseUsage: phraseIds.reduce<Record<string, number>>((acc, id) => {
          acc[id] = (acc[id] ?? 0) + 1;
          return acc;
        }, { ...prev.phraseUsage })
      })),
    addDebugTrace: (trace) => setState((prev) => ({ ...prev, debugTraces: [trace, ...prev.debugTraces].slice(0, 25) })),
    clearDebugTraces: () => setState((prev) => ({ ...prev, debugTraces: [] })),
    markGuestTrialDay: (dayIndex) =>
      setState((prev) => ({
        ...prev,
        guestTrial: {
          completedDayIndices: prev.guestTrial.completedDayIndices.includes(dayIndex)
            ? prev.guestTrial.completedDayIndices
            : [...prev.guestTrial.completedDayIndices, dayIndex]
        }
      })),
    signIn,
    signUp,
    signOut,
    syncNow
  };

  useEffect(() => {
    if (!state.activeWeekId && state.weeks[0]?.id) {
      setState((prev) => ({ ...prev, activeWeekId: prev.weeks[0]?.id }));
    }
  }, [state.activeWeekId, state.weeks]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState() {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside AppProvider");
  return ctx;
}

export { guestSampleDays };

