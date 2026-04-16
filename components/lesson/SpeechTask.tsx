"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { ensurePhraseSetReady, ensurePodcastReady, prewarmSpeechAudio } from "@/lib/lesson-preload";
import { splitSentences, makeSegment } from "@/lib/lesson-utils";
import { AnnotatedToken, CEFR, SpeechMaterial } from "@/lib/types";
import { jsonPost } from "@/components/lesson/api";
import { AnnotatedScriptPreview, CardShell, ScriptPreview, TokenEditor, makeClientTrace, makeJob, useAudioPlayback } from "@/components/lesson/ui";

type SpeechStage = "setup" | "intro" | "mark" | "overlap" | "review" | "full";

const speechStages: SpeechStage[] = ["setup", "intro", "mark", "overlap", "review", "full"];
const isSpeechStage = (value: unknown): value is SpeechStage => typeof value === "string" && speechStages.includes(value as SpeechStage);

export function SpeechTask({ dayIndex, onDone }: { dayIndex: number; onDone: () => void }) {
  const { activeWeek, auth, state, saveWeekMeta, saveSpeech, savePhraseSet, incrementPhraseUsage, savePodcast, markTaskComplete, addDebugTrace, setCurrentJob, setLessonTaskProgress } = useAppState();
  const ja = state.language === "ja";
  const progressKey = `speech:${dayIndex}`;
  const savedProgress = state.lessonSession?.taskProgress?.[progressKey];
  const [theme, setTheme] = useState(activeWeek.theme);
  const [note, setNote] = useState(activeWeek.note);
  const [cefr, setCefr] = useState<CEFR>(activeWeek.cefr || state.prefs.defaultCefr);
  const [stage, setStage] = useState<SpeechStage>(isSpeechStage(savedProgress?.stage) ? savedProgress.stage : activeWeek.speech ? "intro" : "setup");
  const [sentenceIndex, setSentenceIndex] = useState(typeof savedProgress?.itemIndex === "number" ? Math.max(0, savedProgress.itemIndex) : 0);
  const [markMode, setMarkMode] = useState<"strong" | "weak">(savedProgress?.markMode === "weak" ? "weak" : "strong");
  const [error, setError] = useState("");
  const { playingKey, playText, playSequence } = useAudioPlayback();
  const speech = activeWeek.speech;

  useEffect(() => {
    setLessonTaskProgress(progressKey, { stage, itemIndex: sentenceIndex, markMode });
  }, [progressKey, stage, sentenceIndex, markMode, setLessonTaskProgress]);

  useEffect(() => {
    if (!speech || sentenceIndex < speech.segments.length) return;
    setSentenceIndex(Math.max(0, speech.segments.length - 1));
  }, [speech, sentenceIndex]);

  useEffect(() => {
    if (!speech) return;
    let cancelled = false;
    const run = async () => {
      await prewarmSpeechAudio(speech, auth);
      if (cancelled || dayIndex > 4) return;
      if (dayIndex >= 2) {
        await ensurePhraseSetReady(
          {
            week: activeWeek,
            auth,
            phraseUsage: state.phraseUsage,
            savePhraseSet,
            incrementPhraseUsage,
            addDebugTrace
          },
          dayIndex
        );
      }
      if (cancelled) return;
      await ensurePodcastReady(
        {
          week: activeWeek,
          auth,
          prefs: state.prefs,
          savePodcast,
          addDebugTrace
        },
        dayIndex
      );
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [speech, auth, activeWeek, state.phraseUsage, state.prefs, dayIndex, savePhraseSet, incrementPhraseUsage, savePodcast, addDebugTrace]);

  const updateSegmentTokens = (index: number, tokens: AnnotatedToken[]) => {
    if (!speech) return;
    saveSpeech({
      ...speech,
      segments: speech.segments.map((segment, segmentIndex) => (segmentIndex === index ? { ...segment, tokens } : segment))
    });
  };

  const applyTokenTap = (tokenId: string, mode: "strong" | "weak") => {
    if (!speech) return;
    const segment = speech.segments[sentenceIndex];
    const next = segment.tokens.map((token) => {
      if (token.id !== tokenId || token.kind !== "word") return token;
      if (mode === "strong") {
        return { ...token, weight: Math.min(3, token.weight + 1) };
      }
      return { ...token, weight: Math.max(-3, token.weight - 1) };
    });
    updateSegmentTokens(sentenceIndex, next);
  };

  const nextSentence = () => {
    if (!speech) return;
    if (sentenceIndex >= speech.segments.length - 1) {
      setStage("full");
      return;
    }
    setSentenceIndex((value) => value + 1);
    setMarkMode("strong");
    setStage(dayIndex === 1 ? "mark" : "review");
  };

  const previousSentence = () => {
    if (!speech) return;
    if (stage === "full") {
      setSentenceIndex(speech.segments.length - 1);
      setStage(dayIndex === 1 ? "overlap" : "review");
      return;
    }
    if (sentenceIndex <= 0) return;
    setSentenceIndex((value) => value - 1);
    setMarkMode("strong");
    setStage(dayIndex === 1 ? "mark" : "review");
  };

  const generateSpeech = async () => {
    if (!theme.trim() || !note.trim()) {
      setError(ja ? "テーマと内容メモを入力してください。" : "Enter a theme and note first.");
      return;
    }
    setError("");
    saveWeekMeta({ theme: theme.trim(), note: note.trim(), cefr });
    const job = makeJob("speech", 1, ja ? "1分スピーチを生成しています" : "Generating speech", 2);
    setCurrentJob(job);
    try {
      const generated = await jsonPost<{ title: string; script: string; sentences: string[] }>({
        task: "speech",
        theme: theme.trim(),
        note: note.trim(),
        cefr
      });
      if (generated.debug) addDebugTrace(makeClientTrace(generated.debug));
      setCurrentJob({ ...job, progressCurrent: 1, stepJa: ja ? "音声の準備をしています" : "Preparing audio", status: "running" });
      const script = generated.data;
      const material: SpeechMaterial = {
        id: crypto.randomUUID(),
        weekId: activeWeek.id,
        theme: theme.trim(),
        note: "",
        cefr,
        promptJa: generated.debug?.promptJa ?? "",
        scriptText: script.script,
        segments: (script.sentences.length ? script.sentences : splitSentences(script.script)).map((sentence) => makeSegment(sentence, activeWeek.podcastUserVoice, "user")),
        createdAt: new Date().toISOString()
      };
      saveSpeech(material);
      setCurrentJob(undefined);
      setStage("intro");
      setSentenceIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : ja ? "生成に失敗しました。" : "Generation failed.");
      setCurrentJob({ ...job, status: "error", error: err instanceof Error ? err.message : "error" });
    }
  };

  const finishTask = () => {
    markTaskComplete(dayIndex, "speech");
    setCurrentJob(undefined);
    onDone();
  };

  if (!speech && dayIndex !== 1) {
    return (
      <CardShell title={ja ? "1分スピーチ" : "1-Min Speech"} subtitle={ja ? "Day1 の台本がまだありません。" : "Day 1 speech is missing."}>
        <p className="text-sm text-slate-700">{ja ? "この週の Day1 を先に完了すると、ここで復習できます。" : "Complete Day 1 first to unlock this review."}</p>
      </CardShell>
    );
  }

  if (!speech) {
    return (
      <CardShell
        title={ja ? "1分スピーチを作ります" : "Create the 1-Minute Speech"}
        subtitle={ja ? "内容メモは長文OKです。日本語で自由に書いて大丈夫です。" : "Your note can be long and written in Japanese."}
        footer={<button className="btn-primary" onClick={() => void generateSpeech()}>{ja ? "台本を作成して続ける" : "Generate and Continue"}</button>}
      >
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-slate-900">{ja ? "テーマ" : "Theme"}</label>
            <input className="input text-slate-900" value={theme} onChange={(e) => setTheme(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-900">{ja ? "内容メモ" : "Note"}</label>
            <textarea className="input min-h-36 text-slate-900" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-900">CEFR</label>
            <div className="flex flex-wrap gap-2 pt-2">
              {(["A1", "A2", "B1", "B2", "C1", "C2"] as CEFR[]).map((value) => (
                <button key={value} className={cefr === value ? "btn-primary" : "btn-secondary"} onClick={() => setCefr(value)}>
                  {value}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-rose-700">{error}</p>}
        </div>
      </CardShell>
    );
  }

  if (dayIndex !== 1) {
    const segment = speech.segments[sentenceIndex];
    return (
      <CardShell
        title={ja ? "1分スピーチを復習します" : "Review the 1-Minute Speech"}
        subtitle={ja ? "Day1 で色付けした表示をそのまま使います。" : "This reuses the saved rhythm colors from Day 1."}
        headerAction={
          stage === "review" && segment ? (
            <button className="btn-secondary" onClick={() => void playText(`speech-review:${segment.id}`, segment.text, segment.voice)}>
              {playingKey === `speech-review:${segment.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "再生" : "Play"}
            </button>
          ) : stage === "full" ? (
            <button className="btn-secondary" onClick={() => void playSequence("speech-full-review", speech.segments.map((segment) => ({ text: segment.text, voice: segment.voice })))}>
              {playingKey === "speech-full-review" ? (ja ? "再生中..." : "Playing...") : ja ? "全文再生" : "Play Full"}
            </button>
          ) : undefined
        }
        footer={
          <>
            {stage === "intro" && <button className="btn-primary" onClick={() => setStage("review")}>{ja ? "始める" : "Start"}</button>}
            {stage === "review" && (
              <>
                {sentenceIndex > 0 && <button className="btn-secondary" onClick={previousSentence}>{ja ? "前の文へ" : "Previous"}</button>}
                <button className="btn-primary" onClick={nextSentence}>{sentenceIndex >= speech.segments.length - 1 ? (ja ? "全文へ" : "To Full Script") : ja ? "次の文へ" : "Next Sentence"}</button>
              </>
            )}
            {stage === "full" && (
              <>
                <button className="btn-secondary" onClick={previousSentence}>{ja ? "前の文へ" : "Previous"}</button>
                <button className="btn-primary" onClick={finishTask}>{ja ? "1分スピーチを完了" : "Finish Speech"}</button>
              </>
            )}
          </>
        }
      >
        {stage === "intro" && <ScriptPreview text={speech.scriptText} />}
        {stage === "review" && segment && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">{ja ? `文 ${sentenceIndex + 1} / ${speech.segments.length}` : `Sentence ${sentenceIndex + 1} / ${speech.segments.length}`}</p>
            <TokenEditor segment={segment} editable={false} />
          </div>
        )}
        {stage === "full" && <AnnotatedScriptPreview segments={speech.segments} />}
      </CardShell>
    );
  }

  const currentSegment = speech.segments[sentenceIndex];

  return (
    <CardShell
      title={ja ? "1分スピーチ" : "1-Minute Speech"}
      subtitle={ja ? "色付け音読をしながら、その場でオーバーラッピングします。" : "Mark the rhythm, then overlap each sentence right away."}
      headerAction={
        stage === "mark" || stage === "overlap" ? (
          <button className="btn-secondary" onClick={() => void playText(`speech-${stage}:${currentSegment.id}`, currentSegment.text, currentSegment.voice)}>
            {playingKey === `speech-${stage}:${currentSegment.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "再生" : "Play"}
          </button>
        ) : stage === "full" ? (
          <button className="btn-secondary" onClick={() => void playSequence("speech-full", speech.segments.map((segment) => ({ text: segment.text, voice: segment.voice })))}>
            {playingKey === "speech-full" ? (ja ? "再生中..." : "Playing...") : ja ? "全文再生" : "Play Full"}
          </button>
        ) : undefined
      }
      footer={
        <>
          {stage === "intro" && <button className="btn-primary" onClick={() => setStage("mark")}>{ja ? "色付け音読を始める" : "Start Rhythm Reading"}</button>}
          {stage === "mark" && (
            <>
              <button className={markMode === "strong" ? "btn-primary" : "btn-secondary"} onClick={() => setMarkMode("strong")}>{ja ? "大" : "Large"}</button>
              <button className={markMode === "weak" ? "btn-primary" : "btn-secondary"} onClick={() => setMarkMode("weak")}>{ja ? "小" : "Small"}</button>
              {sentenceIndex > 0 && <button className="btn-secondary" onClick={previousSentence}>{ja ? "前の文へ" : "Previous"}</button>}
              <button className="btn-primary" onClick={() => setStage("overlap")}>{ja ? "この文をオーバーラップ" : "Overlap This Sentence"}</button>
            </>
          )}
          {stage === "overlap" && (
            <>
              <button className="btn-secondary" onClick={() => setStage("mark")}>{ja ? "色付けを直す" : "Edit Marking"}</button>
              {sentenceIndex > 0 && <button className="btn-secondary" onClick={previousSentence}>{ja ? "前の文へ" : "Previous"}</button>}
              <button className="btn-primary" onClick={nextSentence}>{sentenceIndex >= speech.segments.length - 1 ? (ja ? "全文へ" : "To Full Script") : ja ? "次の文へ" : "Next Sentence"}</button>
            </>
          )}
          {stage === "full" && (
            <>
              <button className="btn-secondary" onClick={previousSentence}>{ja ? "前の文へ" : "Previous"}</button>
              <button className="btn-primary" onClick={finishTask}>{ja ? "1分スピーチを完了" : "Finish Speech"}</button>
            </>
          )}
        </>
      }
    >
      {stage === "intro" && <ScriptPreview text={speech.scriptText} />}
      {(stage === "mark" || stage === "overlap") && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{ja ? `文 ${sentenceIndex + 1} / ${speech.segments.length}` : `Sentence ${sentenceIndex + 1} / ${speech.segments.length}`}</p>
          {stage === "mark" && (
            <p className="text-xs text-slate-500">
              {ja ? `「${markMode === "strong" ? "大" : "小"}」が選択中です。単語をタップして色付けします。` : `${markMode === "strong" ? "Large" : "Small"} is selected. Tap words to mark rhythm.`}
            </p>
          )}
          <TokenEditor segment={currentSegment} editable={stage === "mark"} onTokenTap={(tokenId) => applyTokenTap(tokenId, markMode)} />
        </div>
      )}
      {stage === "full" && <AnnotatedScriptPreview segments={speech.segments} />}
    </CardShell>
  );
}

