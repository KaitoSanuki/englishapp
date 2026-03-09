export type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type Language = "en" | "ja";

export type UserPrefs = {
  defaultCefr: CEFR;
};

export type WeekPlan = {
  id: string;
  startDate: string;
  topicTitle: string;
  goal: string;
  cefr: CEFR;
  descriptionJp?: string;
  streak: number;
};

export type TaskRun = {
  id: string;
  weekId: string;
  dayOfWeek: number;
  taskType: string;
  completed: boolean;
  notes?: string;
  durationSec?: number;
  startedAt: string;
  endedAt?: string;
};

export type ScriptItem = {
  id: string;
  weekId: string;
  jpSource: string;
  enScript: string;
  enScriptShort?: string;
  createdAt: string;
};

export type RoleplayItem = {
  id: string;
  weekId: string;
  promptText: string;
  transcriptText: string;
  correctionText: string;
  materialDialogueText: string;
  phrasesText: string;
  createdAt: string;
};

export type RetellingItem = {
  id: string;
  weekId: string;
  mode: "3" | "2" | "1";
  actualTimeSec: number;
  rating: number;
  notes: string;
  createdAt: string;
};

export type AudioRecordItem = {
  id: string;
  weekId: string;
  type: "baseline" | "review" | "daily";
  blobUrl: string;
  memo: string;
  createdAt: string;
};

export type AppState = {
  language: Language;
  prefs: UserPrefs;
  wizardAnswers: Record<string, string>;
  weeks: WeekPlan[];
  activeWeekId?: string;
  taskRuns: TaskRun[];
  scripts: ScriptItem[];
  roleplays: RoleplayItem[];
  retellings: RetellingItem[];
  audioRecords: AudioRecordItem[];
  reviewMemo: string;
};
