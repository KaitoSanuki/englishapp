"use client";

import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { buildKeywordPreview, makeSegment } from "@/lib/lesson-utils";
import { RetellingKeywordLine, RetellingSession } from "@/lib/types";
import { blobToDataUrl, jsonPost, transcribeBlob } from "@/components/lesson/api";
import { CardShell, DebugBlock, makeClientTrace, makeJob, useAudioPlayback } from "@/components/lesson/ui";

const roundDurations = [
  { mode: "3" as const, seconds: 180 },
  { mode: "2" as const, seconds: 120 },
  { mode: "1" as const, seconds: 60 }
];

export function RetellingTask({ dayIndex, onDone }: { dayIndex: number; onDone: () => void }) {
  const { activeWeek, state, saveRetelling, markTaskComplete, addDebugTrace, setCurrentJob } = useAppState();
  const ja = state.language === "ja";
  const speech = activeWeek.speech;
  const session = activeWeek.retellings.find((item) => item.dayIndex === dayIndex);
  const [stage, setStage] = useState<"intro" | "keywords" | "rounds" | "ready" | "correction">("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [remaining, setRemaining] = useState(roundDurations[0].seconds);
  const [running, setRunning] = useState(false);
  const [roundFinished, setRoundFinished] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingUrl, setRecordingUrl] = useState("");
  const [error, setError] = useState("");
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const { playingKey, playText } = useAudioPlayback();

  const currentRound = roundDurations[roundIndex];

  useEffect(() => {
    setRemaining(currentRound.seconds);
    setRoundFinished(false);
  }, [currentRound.seconds, roundIndex]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          void stopRound();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const buildSession = (keywordLines: RetellingKeywordLine[]): RetellingSession => ({
    id: crypto.randomUUID(),
    weekId: activeWeek.id,
    dayIndex,
    keywordLines,
    rounds: roundDurations.map((round) => ({ mode: round.mode, retries: 0 })),
    createdAt: new Date().toISOString()
  });

  const prepareKeywords = async () => {
    if (!speech) {
      setError(ja ? "先に1分スピーチを作成してください。" : "Create the speech first.");
      return;
    }
    if (session) {
      setStage("keywords");
      return;
    }
    setError("");
    const job = makeJob("retelling_keywords", dayIndex, ja ? "キーワードを作っています" : "Generating keywords", 1);
    setCurrentJob(job);
    try {
      const generated = await jsonPost<{ lines: Array<{ sourceText: string; keywords: string[] }> }>({ task: "retell_keywords", sourceText: speech.scriptText });
      if (generated.debug) addDebugTrace(makeClientTrace(generated.debug));
      const next = buildSession(generated.data.lines.map((line) => ({ id: crypto.randomUUID(), sourceText: line.sourceText, keywords: line.keywords })));
      saveRetelling(next);
      setCurrentJob(undefined);
      setStage("keywords");
    } catch (err) {
      setError(err instanceof Error ? err.message : ja ? "生成に失敗しました。" : "Generation failed.");
      setCurrentJob({ ...job, status: "error", error: err instanceof Error ? err.message : "error" });
    }
  };

  const startRecorder = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      setRecordingBlob(blob);
      setRecordingUrl(URL.createObjectURL(blob));
      stream.getTracks().forEach((track) => track.stop());
    };
    recorder.start();
    mediaRef.current = recorder;
  };

  const startRound = async () => {
    setError("");
    if (currentRound.mode === "1") {
      setRecordingBlob(null);
      setRecordingUrl("");
      try {
        await startRecorder();
      } catch {
        setError(ja ? "マイクの許可が必要です。" : "Microphone permission is required.");
        return;
      }
    }
    setRemaining(currentRound.seconds);
    setRoundFinished(false);
    setRunning(true);
  };

  const stopRound = async () => {
    setRunning(false);
    if (currentRound.mode === "1" && mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop();
    }
    setRoundFinished(true);
  };

  const retryRound = () => {
    if (!session) return;
    const updated: RetellingSession = {
      ...session,
      rounds: session.rounds.map((round, index) => (index === roundIndex ? { ...round, retries: round.retries + 1 } : round))
    };
    saveRetelling(updated);
    setRemaining(currentRound.seconds);
    setRoundFinished(false);
    setRecordingBlob(null);
    setRecordingUrl("");
  };

  const saveCorrection = async () => {
    if (!speech || !session || !recordingBlob) {
      setError(ja ? "最後の1分録音を保存してください。" : "Save the final 1-minute recording first.");
      return;
    }
    const job = makeJob("retelling_review", dayIndex, ja ? "文字起こしと添削をしています" : "Transcribing and correcting", 2);
    setCurrentJob(job);
    try {
      const transcript = await transcribeBlob(recordingBlob);
      const correction = await jsonPost<{ correctedText: string; sentences: string[] }>({
        task: "retell_correction",
        sourceText: speech.scriptText,
        transcript: transcript.text,
        cefr: activeWeek.cefr
      });
      if (correction.debug) addDebugTrace(makeClientTrace(correction.debug));
      const updated: RetellingSession = {
        ...session,
        finalRecording: {
          mimeType: recordingBlob.type || "audio/webm",
          dataUrl: await blobToDataUrl(recordingBlob),
          createdAt: new Date().toISOString()
        },
        transcriptText: transcript.text,
        correctionText: correction.data.correctedText,
        correctionSegments: correction.data.sentences.map((sentence) => makeSegment(sentence, activeWeek.podcastUserVoice, "user"))
      };
      saveRetelling(updated);
      setCurrentJob(undefined);
      setStage("ready");
    } catch (err) {
      setError(err instanceof Error ? err.message : ja ? "添削に失敗しました。" : "Correction failed.");
      setCurrentJob({ ...job, status: "error", error: err instanceof Error ? err.message : "error" });
    }
  };

  const finishTask = () => {
    markTaskComplete(dayIndex, "retelling");
    setCurrentJob(undefined);
    onDone();
  };

  if (!speech) {
    return (
      <CardShell title={ja ? "3-2-1リテリング" : "3-2-1 Retelling"} subtitle={ja ? "先に1分スピーチを作成してください。" : "Create the speech first."}>
        <p className="text-sm text-slate-700">{ja ? "この週の軸になる原稿ができると、ここでリテリングできます。" : "Retelling unlocks once your weekly speech exists."}</p>
      </CardShell>
    );
  }

  return (
    <CardShell
      title={ja ? "3-2-1リテリング" : "3-2-1 Retelling"}
      subtitle={ja ? "キーワードはその日だけ固定です。最後の1分だけ文字起こしと添削に回します。" : "Keywords stay fixed for the day. Only the final accepted 1-minute recording is transcribed and corrected."}
      footer={
        <>
          {stage === "intro" && <button className="btn-primary" onClick={() => void prepareKeywords()}>{ja ? "キーワードを準備する" : "Prepare Keywords"}</button>}
          {stage === "keywords" && session && <button className="btn-primary" onClick={() => setStage("rounds")}>{ja ? "3分から始める" : "Start with 3 Minutes"}</button>}
          {stage === "rounds" && (
            <>
              {!running && !roundFinished && <button className="btn-primary" onClick={() => void startRound()}>{currentRound.mode === "1" ? (ja ? "タイマーと録音を開始" : "Start Timer + Record") : ja ? "タイマー開始" : "Start Timer"}</button>}
              {running && <button className="btn-secondary" onClick={() => void stopRound()}>{ja ? "途中で止める" : "Stop Early"}</button>}
              {roundFinished && (
                <>
                  <button className="btn-secondary" onClick={retryRound}>{ja ? "もう一度チャレンジ" : "Retry"}</button>
                  <button
                    className="btn-primary"
                    onClick={() => {
                      if (roundIndex >= roundDurations.length - 1) {
                        void saveCorrection();
                      } else {
                        setRoundIndex((value) => value + 1);
                      }
                    }}
                  >
                    {roundIndex >= roundDurations.length - 1 ? (ja ? "完了して添削へ" : "Finish and Correct") : ja ? "次へ" : "Next"}
                  </button>
                </>
              )}
            </>
          )}
          {stage === "ready" && <button className="btn-primary" onClick={() => setStage("correction")}>{ja ? "添削文を音読する" : "Read the Corrected Version"}</button>}
          {stage === "correction" && session?.correctionText && (
            <>
              <button className="btn-secondary" onClick={() => void playText("retelling-correction", session.correctionText ?? "", activeWeek.podcastUserVoice)}>
                {playingKey === "retelling-correction" ? (ja ? "再生中..." : "Playing...") : ja ? "音声を流す" : "Play Corrected Audio"}
              </button>
              <button className="btn-primary" onClick={finishTask}>{ja ? "3-2-1を完了" : "Finish Retelling"}</button>
            </>
          )}
        </>
      }
    >
      <DebugBlock feature="retell_keywords" />
      <DebugBlock feature="retell_correction" />
      {stage === "intro" && <p className="text-sm text-slate-700">{ja ? "最初にキーワードを一覧で確認してから、3分・2分・1分の順で話します。" : "You first review the ordered keyword list, then retell in 3, 2, and 1 minute."}</p>}
      {stage === "keywords" && session && (
        <div className="space-y-3">
          <p className="text-sm text-slate-600">{ja ? "キーワード一覧" : "Keyword List"}</p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 whitespace-pre-wrap text-slate-900">{buildKeywordPreview(session.keywordLines)}</div>
        </div>
      )}
      {stage === "rounds" && session && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
            <p className="text-sm text-slate-600">{ja ? `${currentRound.mode}分ラウンド` : `${currentRound.mode}-minute round`}</p>
            <p className="mt-2 text-5xl font-black tabular-nums text-slate-900">
              {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
            <p className="text-sm whitespace-pre-wrap text-slate-900">{buildKeywordPreview(session.keywordLines)}</p>
          </div>
          {currentRound.mode === "1" && recordingUrl && (
            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-900">{ja ? "最後の1分録音" : "Final 1-Minute Recording"}</p>
              <audio controls src={recordingUrl} className="w-full" />
            </div>
          )}
        </div>
      )}
      {stage === "ready" && <p className="text-sm text-slate-700">{ja ? "添削できました。次に、整えられた英文でオーバーラッピングします。" : "Your corrected version is ready. Next, you overlap with the improved text."}</p>}
      {stage === "correction" && session?.correctionText && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 whitespace-pre-wrap text-slate-900">{session.correctionText}</div>
          {session.transcriptText && (
            <details className="rounded-2xl border border-slate-200 bg-white/80 p-4">
              <summary className="cursor-pointer font-semibold text-slate-900">{ja ? "文字起こしを見る" : "Show Transcript"}</summary>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{session.transcriptText}</p>
            </details>
          )}
        </div>
      )}
      {error && <p className="text-sm text-rose-700">{error}</p>}
    </CardShell>
  );
}

