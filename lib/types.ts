export type CEFR = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type Language = "ja" | "en";
export type UserPlan = "free" | "pro";
export type UserRole = "user" | "admin";
export type PodcastVoiceGender = "female" | "male";

export type TokenKind = "word" | "space" | "punct";

export type AnnotatedToken = {
  id: string;
  text: string;
  kind: TokenKind;
  weight: number;
};

export type SegmentSpeaker = "narrator" | "partner" | "user" | "ai";

export type LessonSegment = {
  id: string;
  text: string;
  speaker: SegmentSpeaker;
  voice: string;
  tokens: AnnotatedToken[];
};

export type SpeechMaterial = {
  id: string;
  weekId: string;
  theme: string;
  note: string;
  cefr: CEFR;
  promptJa: string;
  scriptText: string;
  segments: LessonSegment[];
  createdAt: string;
};

export type PhraseBankItem = {
  id: string;
  cefr: Exclude<CEFR, "C2">;
  phrase: string;
};

export type PhraseCard = {
  id: string;
  bankId: string;
  original: string;
  personalized: string;
  translation: string;
  cefr: Exclude<CEFR, "C2">;
  dayIndex: number;
  cycle: number;
  segment: LessonSegment;
  createdAt: string;
};

export type PhraseSet = {
  id: string;
  weekId: string;
  dayIndex: number;
  cards: PhraseCard[];
  createdAt: string;
};

export type PodcastTurn = {
  id: string;
  speaker: "Partner" | "User";
  text: string;
  voice: string;
};

export type PodcastEpisode = {
  id: string;
  weekId: string;
  dayIndex: number;
  title: string;
  wordCount: number;
  turns: PodcastTurn[];
  createdAt: string;
};

export type RetellingKeywordLine = {
  id: string;
  sourceText: string;
  keywords: string[];
};

export type StoredAudio = {
  mimeType: string;
  createdAt: string;
  path?: string;
  publicUrl?: string;
};

export type RetellingRound = {
  mode: "3" | "2" | "1";
  retries: number;
  completedAt?: string;
};

export type RetellingSession = {
  id: string;
  weekId: string;
  dayIndex: number;
  keywordLines: RetellingKeywordLine[];
  rounds: RetellingRound[];
  finalRecording?: StoredAudio;
  transcriptText?: string;
  correctionText?: string;
  correctionSegments?: LessonSegment[];
  createdAt: string;
};

export type ExternalChatPrompt = {
  id: string;
  weekId: string;
  dayIndex: number;
  promptText: string;
  createdAt: string;
};

export type DayTaskKey = "speech" | "phrases" | "podcast" | "retelling" | "externalChat";

export type DayStatus = {
  dayIndex: number;
  completed: boolean;
  tasks: Record<DayTaskKey, boolean>;
};

export type WeekRecord = {
  id: string;
  startDate: string;
  theme: string;
  note: string;
  cefr: CEFR;
  status: "active" | "completed";
  speech?: SpeechMaterial;
  phraseSets: PhraseSet[];
  podcasts: PodcastEpisode[];
  retellings: RetellingSession[];
  externalPrompts: ExternalChatPrompt[];
  dayStatuses: DayStatus[];
  podcastPartnerVoice: string;
  podcastUserVoice: string;
  createdAt: string;
};

export type GenerationJobKind =
  | "speech"
  | "phrases"
  | "podcast"
  | "retelling_keywords"
  | "retelling_review";

export type GenerationJob = {
  id: string;
  kind: GenerationJobKind;
  dayIndex: number;
  status: "idle" | "running" | "done" | "error";
  labelJa: string;
  stepJa: string;
  progressCurrent: number;
  progressTotal: number;
  error?: string;
};

export type DebugTrace = {
  id: string;
  feature: string;
  createdAt: string;
  promptJa: string;
  requestPayload: unknown;
  rawResponse: unknown;
  parsedResponse: unknown;
};

export type UserPrefs = {
  defaultCefr: CEFR;
  podcastUserGender: PodcastVoiceGender;
  adminDebugEnabled: boolean;
};

export type GuestTrialState = {
  completedDayIndices: number[];
};

export type LessonSession = {
  active: boolean;
  dayIndex: number;
  cardIndex: number;
  taskProgress?: Record<string, LessonTaskProgress>;
};

export type LessonTaskProgress = {
  stage?: string;
  itemIndex?: number;
  reviewIndex?: number;
  markMode?: "strong" | "weak";
  showTranslation?: boolean;
  transcriptVisible?: boolean;
};

export type AppState = {
  language: Language;
  lessonFocusActive: boolean;
  prefs: UserPrefs;
  weeks: WeekRecord[];
  activeWeekId?: string;
  lessonSession?: LessonSession;
  currentJob?: GenerationJob;
  phraseUsage: Record<string, number>;
  guestTrial: GuestTrialState;
  debugTraces: DebugTrace[];
};

