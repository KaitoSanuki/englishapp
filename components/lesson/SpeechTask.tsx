"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { ensurePhraseSetReady, ensurePodcastReady, prewarmSpeechAudio } from "@/lib/lesson-preload";
import { splitSentences, makeSegment } from "@/lib/lesson-utils";
import { AnnotatedToken, CEFR, SpeechMaterial } from "@/lib/types";
import { jsonPost } from "@/components/lesson/api";
import { AnnotatedScriptPreview, CardShell, ScriptPreview, TokenEditor, makeClientTrace, makeJob, useAudioPlayback } from "@/components/lesson/ui";

export function SpeechTask({ dayIndex, onDone }: { dayIndex: number; onDone: () => void }) {
  const { activeWeek, auth, state, saveWeekMeta, saveSpeech, savePhraseSet, incrementPhraseUsage, savePodcast, markTaskComplete, addDebugTrace, setCurrentJob } = useAppState();
  const ja = state.language === "ja";
  const [theme, setTheme] = useState(activeWeek.theme);
  const [note, setNote] = useState(activeWeek.note);
  const [cefr, setCefr] = useState<CEFR>(activeWeek.cefr || state.prefs.defaultCefr);
  const [stage, setStage] = useState<"setup" | "intro" | "strong" | "weak" | "confirm" | "overlap" | "review" | "full">(
    activeWeek.speech ? "intro" : "setup"
  );
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [history, setHistory] = useState<AnnotatedToken[][]>([]);
  const [error, setError] = useState("");
  const { playingKey, playText, playSequence } = useAudioPlayback();
  const speech = activeWeek.speech;

  useEffect(() => {
    if (!speech) return;
    let cancelled = false;
    const run = async () => {
      await prewarmSpeechAudio(speech, auth);
      if (cancelled || dayIndex > 4) return;
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
    const before = segment.tokens.map((token) => ({ ...token }));
    const next = segment.tokens.map((token) => {
      if (token.id !== tokenId || token.kind !== "word") return token;
      if (mode === "strong") {
        return { ...token, weight: token.weight >= 0 ? Math.min(3, token.weight + 1) : 1 };
      }
      return { ...token, weight: token.weight <= 0 ? Math.max(-3, token.weight - 1) : -1 };
    });
    setHistory((prev) => [...prev, before]);
    updateSegmentTokens(sentenceIndex, next);
  };

  const undo = () => {
    const latest = history[history.length - 1];
    if (!latest || !speech) return;
    updateSegmentTokens(sentenceIndex, latest);
    setHistory((prev) => prev.slice(0, -1));
  };

  const nextSentence = () => {
    if (!speech) return;
    if (sentenceIndex >= speech.segments.length - 1) {
      setStage("full");
      return;
    }
    setSentenceIndex((value) => value + 1);
    setHistory([]);
    setStage(dayIndex === 1 ? "strong" : "review");
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
      setHistory([]);
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
        footer={
          <>
            {stage === "intro" && <button className="btn-primary" onClick={() => setStage("review")}>{ja ? "始める" : "Start"}</button>}
            {stage === "review" && (
              <>
                <button className="btn-secondary" onClick={() => void playText(`speech-review:${segment.id}`, segment.text, segment.voice)}>
                  {playingKey === `speech-review:${segment.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "再生" : "Play"}
                </button>
                <button className="btn-primary" onClick={nextSentence}>{sentenceIndex >= speech.segments.length - 1 ? (ja ? "全文へ" : "To Full Script") : ja ? "次の文へ" : "Next Sentence"}</button>
              </>
            )}
            {stage === "full" && (
              <>
                <button className="btn-secondary" onClick={() => void playSequence("speech-full-review", speech.segments.map((segment) => ({ text: segment.text, voice: segment.voice })))}>
                  {playingKey === "speech-full-review" ? (ja ? "再生中..." : "Playing...") : ja ? "全文を再生" : "Play Full Script"}
                </button>
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
      footer={
        <>
          {stage === "intro" && <button className="btn-primary" onClick={() => setStage("strong")}>{ja ? "色付け音読を始める" : "Start Rhythm Reading"}</button>}
          {stage === "strong" && (
            <>
              <button className="btn-secondary" onClick={() => void playText(`speech-strong:${currentSegment.id}`, currentSegment.text, currentSegment.voice)}>
                {playingKey === `speech-strong:${currentSegment.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "音声を聞く" : "Play Audio"}
              </button>
              <button className="btn-secondary" onClick={undo} disabled={!history.length}>{ja ? "1つ戻す" : "Undo"}</button>
              <button className="btn-primary" onClick={() => { setHistory([]); setStage("weak"); }}>{ja ? "弱く読む語へ" : "To Weak Words"}</button>
            </>
          )}
          {stage === "weak" && (
            <>
              <button className="btn-secondary" onClick={() => void playText(`speech-weak:${currentSegment.id}`, currentSegment.text, currentSegment.voice)}>
                {playingKey === `speech-weak:${currentSegment.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "音声を聞く" : "Play Audio"}
              </button>
              <button className="btn-secondary" onClick={undo} disabled={!history.length}>{ja ? "1つ戻す" : "Undo"}</button>
              <button className="btn-primary" onClick={() => { setHistory([]); setStage("confirm"); }}>{ja ? "確認へ" : "Review"}</button>
            </>
          )}
          {stage === "confirm" && (
            <>
              <button className="btn-secondary" onClick={() => setStage("weak")}>{ja ? "弱い語を直す" : "Edit Weak Words"}</button>
              <button className="btn-primary" onClick={() => setStage("overlap")}>{ja ? "この文をオーバーラップ" : "Overlap This Sentence"}</button>
            </>
          )}
          {stage === "overlap" && (
            <>
              <button className="btn-secondary" onClick={() => void playText(`speech-overlap:${currentSegment.id}`, currentSegment.text, currentSegment.voice)}>
                {playingKey === `speech-overlap:${currentSegment.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "音声を流す" : "Play for Overlap"}
              </button>
              <button className="btn-primary" onClick={nextSentence}>{sentenceIndex >= speech.segments.length - 1 ? (ja ? "全文へ" : "To Full Script") : ja ? "次の文へ" : "Next Sentence"}</button>
            </>
          )}
          {stage === "full" && (
            <>
              <button className="btn-secondary" onClick={() => void playSequence("speech-full", speech.segments.map((segment) => ({ text: segment.text, voice: segment.voice })))}>
                {playingKey === "speech-full" ? (ja ? "再生中..." : "Playing...") : ja ? "全文を流す" : "Play Full Script"}
              </button>
              <button className="btn-primary" onClick={finishTask}>{ja ? "1分スピーチを完了" : "Finish Speech"}</button>
            </>
          )}
        </>
      }
    >
      {stage === "intro" && <ScriptPreview text={speech.scriptText} />}
      {(stage === "strong" || stage === "weak" || stage === "confirm" || stage === "overlap") && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{ja ? `文 ${sentenceIndex + 1} / ${speech.segments.length}` : `Sentence ${sentenceIndex + 1} / ${speech.segments.length}`}</p>
          <TokenEditor segment={currentSegment} editable={stage === "strong" || stage === "weak"} onTokenTap={(tokenId) => applyTokenTap(tokenId, stage === "strong" ? "strong" : "weak")} />
        </div>
      )}
      {stage === "full" && <AnnotatedScriptPreview segments={speech.segments} />}
    </CardShell>
  );
}

