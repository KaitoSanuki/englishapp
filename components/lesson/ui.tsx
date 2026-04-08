"use client";

import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { getSpeechBlob, playBlob, stopAudio } from "@/lib/audio-client";
import { getTokenStyle } from "@/lib/lesson-utils";
import { DebugTrace, LessonSegment, PodcastTurn } from "@/lib/types";

export function CardShell({
  title,
  subtitle,
  children,
  footer
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { state } = useAppState();
  const job = state.currentJob;
  const progress = job ? Math.max(0, Math.min(100, Math.round((job.progressCurrent / Math.max(job.progressTotal, 1)) * 100))) : 0;

  return (
    <section className="w-full max-w-3xl rounded-[28px] bg-white p-5 shadow-2xl ring-1 ring-white/60 animate-card-swap">
      <div className="space-y-1">
        <h2 className="text-2xl font-black text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
      </div>
      <div className="mt-5 space-y-4">
        {job && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-slate-900">{job.labelJa}</p>
                <p className="text-xs text-slate-600">{job.status === "error" ? job.error || job.stepJa : job.stepJa}</p>
              </div>
              <p className="text-xs font-semibold text-slate-500">{job.progressCurrent} / {job.progressTotal}</p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full transition-all ${job.status === "error" ? "bg-rose-500" : "bg-accent"}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
        {children}
      </div>
      {footer && <div className="mt-5 flex flex-wrap gap-2">{footer}</div>}
    </section>
  );
}

export function DebugBlock({ feature }: { feature: string }) {
  const { state, canUseAdminMode, setAdminDebugEnabled } = useAppState();
  const ja = state.language === "ja";
  const [open, setOpen] = useState(false);
  const trace = state.debugTraces.find((item) => item.feature === feature);

  if (!canUseAdminMode || !trace) return null;

  if (!state.prefs.adminDebugEnabled) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
        <p className="text-sm text-amber-900">{ja ? "この生成のプロンプトを確認できます。" : "You can inspect the prompt for this generation."}</p>
        <button className="mt-2 text-sm font-semibold text-amber-900" onClick={() => setAdminDebugEnabled(true)}>
          {ja ? "ここでデバッグ表示を有効にする" : "Enable debug here"}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
      <button className="text-sm font-semibold text-amber-900" onClick={() => setOpen((value) => !value)}>
        {open ? (ja ? "デバッグを閉じる" : "Hide Debug") : ja ? "デバッグを見る" : "Show Debug"}
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-xs text-slate-700">
          <div>
            <p className="font-semibold text-slate-900">Prompt</p>
            <div className="mt-1 max-h-48 overflow-y-auto rounded-2xl border border-amber-200/70 bg-white/60 p-3">
              <pre className="whitespace-pre-wrap break-words">{trace.promptJa}</pre>
            </div>
          </div>
          <div>
            <p className="font-semibold text-slate-900">Parsed</p>
            <div className="mt-1 max-h-48 overflow-y-auto rounded-2xl border border-amber-200/70 bg-white/60 p-3">
              <pre className="whitespace-pre-wrap break-words">{JSON.stringify(trace.parsedResponse, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function TokenEditor({
  segment,
  editable,
  onTokenTap
}: {
  segment: LessonSegment;
  editable: boolean;
  onTokenTap?: (tokenId: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-lg leading-8 text-slate-900 whitespace-pre-wrap break-words">
      {segment.tokens.map((token) => {
        const style = getTokenStyle(token.weight);
        const clickable = editable && token.kind === "word";
        if (!clickable) {
          return (
            <span key={token.id} style={style}>
              {token.text}
            </span>
          );
        }
        return (
          <button
            key={token.id}
            type="button"
            className="cursor-pointer"
            onClick={() => onTokenTap?.(token.id)}
            style={{ ...style, background: "transparent", border: "none", padding: 0, display: "inline" }}
          >
            {token.text}
          </button>
        );
      })}
    </div>
  );
}

export function SegmentTextBlock({ segments }: { segments: LessonSegment[] }) {
  return (
    <div className="space-y-3">
      {segments.map((segment, index) => (
        <div key={segment.id} className="input space-y-2">
          <p className="text-xs font-semibold text-slate-500">{index + 1}</p>
          <TokenEditor segment={segment} editable={false} />
        </div>
      ))}
    </div>
  );
}

export function ScriptPreview({
  text,
  maxHeightClass = "max-h-[55vh]"
}: {
  text: string;
  maxHeightClass?: string;
}) {
  return (
    <div className={`overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 ${maxHeightClass}`}>
      <p className="whitespace-pre-wrap break-words text-base leading-8 text-slate-900">{text}</p>
    </div>
  );
}

export function AnnotatedScriptPreview({
  segments,
  maxHeightClass = "max-h-[55vh]"
}: {
  segments: LessonSegment[];
  maxHeightClass?: string;
}) {
  return (
    <div className={`overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4 ${maxHeightClass}`}>
      <div className="whitespace-pre-wrap break-words text-base leading-8 text-slate-900">
        {segments.map((segment, index) => (
          <span key={segment.id}>
            {segment.tokens.map((token) => (
              <span key={token.id} style={getTokenStyle(token.weight)}>
                {token.text}
              </span>
            ))}
            {index < segments.length - 1 ? " " : null}
          </span>
        ))}
      </div>
    </div>
  );
}

export function FullTranscript({
  turns,
  currentIndex,
  visible
}: {
  turns: PodcastTurn[];
  currentIndex: number;
  visible: boolean;
}) {
  const refs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    if (!visible || currentIndex < 0) return;
    refs.current[currentIndex]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentIndex, visible]);

  if (!visible) return null;

  return (
    <div className="max-h-[50vh] overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="space-y-3">
        {turns.map((turn, index) => {
          const active = currentIndex === index;
          return (
            <div
              key={turn.id}
              ref={(node) => {
                refs.current[index] = node;
              }}
              className={`rounded-2xl p-3 transition ${active ? "bg-white shadow ring-2 ring-accent/35" : "bg-transparent"}`}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{turn.speaker}</p>
              <p className={`text-slate-900 transition ${active ? "text-lg font-semibold" : "text-sm"}`}>{turn.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function useAudioPlayback() {
  const { auth } = useAppState();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const runIdRef = useRef(0);
  const [playingKey, setPlayingKey] = useState("");
  const cloudScope = auth.mode === "user" && auth.userId && auth.accessToken ? { userId: auth.userId, accessToken: auth.accessToken } : undefined;

  const stop = () => {
    runIdRef.current += 1;
    stopAudio(audioRef);
    setPlayingKey("");
  };

  const playText = async (key: string, text: string, voice: string) => {
    if (!text.trim()) return;
    stop();
    const runId = ++runIdRef.current;
    setPlayingKey(key);
    try {
      const blob = await getSpeechBlob(text, voice, cloudScope);
      if (!blob || runId !== runIdRef.current) return;
      await playBlob(blob, audioRef);
    } finally {
      if (runId === runIdRef.current) setPlayingKey("");
    }
  };

  const playSequence = async (key: string, items: Array<{ text: string; voice: string }>, onIndex?: (index: number) => void) => {
    stop();
    const runId = ++runIdRef.current;
    setPlayingKey(key);
    try {
      for (let index = 0; index < items.length; index += 1) {
        if (runId !== runIdRef.current) return;
        onIndex?.(index);
        const blob = await getSpeechBlob(items[index].text, items[index].voice, cloudScope);
        if (!blob || runId !== runIdRef.current) return;
        await playBlob(blob, audioRef);
      }
    } finally {
      if (runId === runIdRef.current) setPlayingKey("");
    }
  };

  return { playingKey, playText, playSequence, stop };
}

export const makeClientTrace = (debug: Omit<DebugTrace, "id" | "createdAt">) => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  ...debug
});

export const makeJob = (
  kind: "speech" | "phrases" | "podcast" | "retelling_keywords" | "retelling_review",
  dayIndex: number,
  labelJa: string,
  total: number
) => ({
  id: crypto.randomUUID(),
  kind,
  dayIndex,
  status: "running" as const,
  labelJa,
  stepJa: labelJa,
  progressCurrent: 0,
  progressTotal: total
});

