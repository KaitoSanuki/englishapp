"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { ensurePodcastReady, prewarmPodcastAudio } from "@/lib/lesson-preload";
import { CardShell, FullTranscript, makeJob, useAudioPlayback } from "@/components/lesson/ui";

type PodcastStage = "intro" | "full-listen" | "turns" | "full-overlap";

const podcastStages: PodcastStage[] = ["intro", "full-listen", "turns", "full-overlap"];
const isPodcastStage = (value: unknown): value is PodcastStage => typeof value === "string" && podcastStages.includes(value as PodcastStage);

export function PodcastTask({ dayIndex, onDone }: { dayIndex: number; onDone: () => void }) {
  const { activeWeek, auth, state, savePodcast, markTaskComplete, addDebugTrace, setCurrentJob, setLessonTaskProgress } = useAppState();
  const ja = state.language === "ja";
  const speech = activeWeek.speech;
  const episode = activeWeek.podcasts.find((item) => item.dayIndex === dayIndex);
  const progressKey = `podcast:${dayIndex}`;
  const savedProgress = state.lessonSession?.taskProgress?.[progressKey];
  const [stage, setStage] = useState<PodcastStage>(isPodcastStage(savedProgress?.stage) ? savedProgress.stage : "intro");
  const [turnIndex, setTurnIndex] = useState(typeof savedProgress?.itemIndex === "number" ? Math.max(0, savedProgress.itemIndex) : 0);
  const [transcriptVisible, setTranscriptVisible] = useState(Boolean(savedProgress?.transcriptVisible));
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [error, setError] = useState("");
  const [autoPreparing, setAutoPreparing] = useState(false);
  const { playingKey, playText, playSequence, stop } = useAudioPlayback();

  useEffect(() => {
    setLessonTaskProgress(progressKey, { stage, itemIndex: turnIndex, transcriptVisible });
  }, [progressKey, stage, turnIndex, transcriptVisible, setLessonTaskProgress]);

  useEffect(() => {
    if (!episode || turnIndex < episode.turns.length) return;
    setTurnIndex(Math.max(0, episode.turns.length - 1));
  }, [episode, turnIndex]);

  useEffect(() => {
    if (!speech || episode) return;
    let cancelled = false;
    setAutoPreparing(true);
    void ensurePodcastReady(
      {
        week: activeWeek,
        auth,
        prefs: state.prefs,
        savePodcast,
        addDebugTrace
      },
      dayIndex
    )
      .catch(() => {
        // keep manual retry available
      })
      .finally(() => {
        if (!cancelled) setAutoPreparing(false);
      });
    return () => {
      cancelled = true;
    };
  }, [speech, episode, activeWeek, auth, state.prefs, savePodcast, addDebugTrace, dayIndex]);

  useEffect(() => {
    if (!episode) return;
    void prewarmPodcastAudio(episode, auth);
  }, [episode, auth]);

  const generatePodcast = async () => {
    if (!speech) {
      setError(ja ? "先に1分スピーチを作成してください。" : "Create the speech first.");
      return;
    }
    setError("");
    const job = makeJob("podcast", dayIndex, ja ? "Podcast を生成しています" : "Generating podcast", 1);
    setCurrentJob(job);
    try {
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
      setCurrentJob(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : ja ? "生成に失敗しました。" : "Generation failed.");
      setCurrentJob({ ...job, status: "error", error: err instanceof Error ? err.message : "error" });
    }
  };

  const finishTask = () => {
    markTaskComplete(dayIndex, "podcast");
    setCurrentJob(undefined);
    onDone();
  };

  const cardTitle =
    stage === "intro"
      ? "Podcast"
      : ja
        ? `${dayIndex}日目のPodcast`
        : `Day ${dayIndex} Podcast`;

  const cardSubtitle =
    stage === "intro"
      ? ja
        ? "今日のPodcastを聞きましょう。"
        : "Let's listen to today's podcast."
      : ja
        ? `${episode?.title ?? ""}`
        : episode?.title ?? "";

  if (!episode) {
    return (
      <CardShell
        title="Podcast"
        subtitle={ja ? `Day ${dayIndex} の会話エピソードを準備します。` : `Prepare the Day ${dayIndex} conversation episode.`}
        footer={
          <button className="btn-primary" onClick={() => void generatePodcast()} disabled={autoPreparing}>
            {autoPreparing ? (ja ? "裏で準備しています..." : "Preparing in the background...") : ja ? "生成して始める" : "Generate and Start"}
          </button>
        }
      >
        <p className="text-sm text-slate-700">{ja ? "最初の案内ではネタバレせず、聞く段階で内容をつかみます。" : "The intro stays spoiler-free. You discover the content by listening first."}</p>
        {error && <p className="text-sm text-rose-700">{error}</p>}
      </CardShell>
    );
  }

  const activeTurn = episode.turns[turnIndex];

  const previousStep = () => {
    stop();
    setHighlightIndex(-1);
    if (stage === "full-listen") {
      setTranscriptVisible(false);
      setStage("intro");
      return;
    }
    if (stage === "turns") {
      if (turnIndex > 0) {
        setTurnIndex((value) => value - 1);
        return;
      }
      setTranscriptVisible(false);
      setStage("full-listen");
      return;
    }
    if (stage === "full-overlap") {
      setTurnIndex(Math.max(0, episode.turns.length - 1));
      setTranscriptVisible(false);
      setStage("turns");
    }
  };

  return (
    <CardShell
      title={cardTitle}
      subtitle={cardSubtitle}
      headerAction={
        stage === "full-listen" ? (
          <button
            className="btn-secondary"
            onClick={() =>
              void playSequence(
                `podcast-listen:${episode.id}`,
                episode.turns.map((turn) => ({ text: turn.text, voice: turn.voice })),
                setHighlightIndex
              )
            }
          >
            {playingKey === `podcast-listen:${episode.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "通しで聞く" : "Play Full"}
          </button>
        ) : stage === "turns" && activeTurn ? (
          <button className="btn-secondary" onClick={() => void playText(`podcast-turn:${activeTurn.id}`, activeTurn.text, activeTurn.voice)}>
            {playingKey === `podcast-turn:${activeTurn.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "再生" : "Play"}
          </button>
        ) : stage === "full-overlap" ? (
          <button
            className="btn-secondary"
            onClick={() =>
              void playSequence(
                `podcast-overlap:${episode.id}`,
                episode.turns.map((turn) => ({ text: turn.text, voice: turn.voice })),
                setHighlightIndex
              )
            }
          >
            {playingKey === `podcast-overlap:${episode.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "通しで流す" : "Play Full"}
          </button>
        ) : undefined
      }
      footer={
        <>
          {stage === "intro" && <button className="btn-primary" onClick={() => { setTranscriptVisible(false); setStage("full-listen"); }}>{ja ? "今日のPodcastを聞く" : "Listen to Today's Podcast"}</button>}
          {stage === "full-listen" && (
            <>
              <button className="btn-secondary" onClick={previousStep}>{ja ? "前のカードへ" : "Previous"}</button>
              <button className="btn-secondary" onClick={() => setTranscriptVisible((value) => !value)}>
                {transcriptVisible ? (ja ? "スクリプトを隠す" : "Hide Script") : ja ? "スクリプトを表示" : "Show Script"}
              </button>
              <button className="btn-primary" onClick={() => { stop(); setTurnIndex(0); setStage("turns"); }}>{ja ? "1ターンずつオーバーラップ" : "Turn-by-Turn Overlap"}</button>
            </>
          )}
          {stage === "turns" && activeTurn && (
            <>
              <button className="btn-secondary" onClick={previousStep}>{ja ? "前のカードへ" : "Previous"}</button>
              <button
                className="btn-primary"
                onClick={() => {
                  if (turnIndex >= episode.turns.length - 1) {
                    setTranscriptVisible(true);
                    setStage("full-overlap");
                    return;
                  }
                  setTurnIndex((value) => value + 1);
                }}
              >
                {turnIndex >= episode.turns.length - 1 ? (ja ? "最後に通しでオーバーラップ" : "Final Full Overlap") : ja ? "次のターンへ" : "Next Turn"}
              </button>
            </>
          )}
          {stage === "full-overlap" && (
            <>
              <button className="btn-secondary" onClick={previousStep}>{ja ? "前のカードへ" : "Previous"}</button>
              <button className="btn-secondary" onClick={() => setTranscriptVisible((value) => !value)}>
                {transcriptVisible ? (ja ? "スクリプトを隠す" : "Hide Script") : ja ? "スクリプトを表示" : "Show Script"}
              </button>
              <button className="btn-primary" onClick={finishTask}>{ja ? "Podcast を完了" : "Finish Podcast"}</button>
            </>
          )}
        </>
      }
    >
      {stage === "intro" && (
        <div className="space-y-3">
          <p className="text-sm text-slate-700">{ja ? "内容はまず音でつかみます。通しで聞いたあと、1ターンずつオーバーラッピングします。" : "Catch the content first through audio. After the full listen, you will overlap turn by turn."}</p>
        </div>
      )}
      {(stage === "full-listen" || stage === "full-overlap") && <FullTranscript turns={episode.turns} currentIndex={highlightIndex} visible={transcriptVisible} />}
      {stage === "turns" && activeTurn && (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{activeTurn.speaker}</p>
          <p className="text-2xl font-semibold text-slate-900 leading-9">{activeTurn.text}</p>
          <p className="text-sm text-slate-500">{ja ? `${turnIndex + 1} / ${episode.turns.length} ターン` : `Turn ${turnIndex + 1} / ${episode.turns.length}`}</p>
        </div>
      )}
    </CardShell>
  );
}

