"use client";

import { useState } from "react";
import { useAppState } from "@/lib/app-state";
import { jsonPost } from "@/components/lesson/api";
import { CardShell, DebugBlock, FullTranscript, makeClientTrace, makeJob, useAudioPlayback } from "@/components/lesson/ui";
import { PodcastEpisode } from "@/lib/types";

export function PodcastTask({ dayIndex, onDone }: { dayIndex: number; onDone: () => void }) {
  const { activeWeek, state, savePodcast, markTaskComplete, addDebugTrace, setCurrentJob } = useAppState();
  const ja = state.language === "ja";
  const speech = activeWeek.speech;
  const episode = activeWeek.podcasts.find((item) => item.dayIndex === dayIndex);
  const [stage, setStage] = useState<"intro" | "full-listen" | "turns" | "full-overlap">("intro");
  const [turnIndex, setTurnIndex] = useState(0);
  const [transcriptVisible, setTranscriptVisible] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [error, setError] = useState("");
  const { playingKey, playText, playSequence, stop } = useAudioPlayback();

  const generatePodcast = async () => {
    if (!speech) {
      setError(ja ? "先に1分スピーチを作成してください。" : "Create the speech first.");
      return;
    }
    setError("");
    const job = makeJob("podcast", dayIndex, ja ? "Podcast を生成しています" : "Generating podcast", 1);
    setCurrentJob(job);
    try {
      const previousTitle = activeWeek.podcasts.find((item) => item.dayIndex === dayIndex - 1)?.title;
      const generated = await jsonPost<{ title: string; turns: Array<{ speaker: "Partner" | "User"; text: string }> }>({
        task: "podcast",
        theme: activeWeek.theme,
        note: activeWeek.note,
        speechScript: speech.scriptText,
        dayIndex,
        previousTitle,
        userVoiceGender: state.prefs.podcastUserGender
      });
      if (generated.debug) addDebugTrace(makeClientTrace(generated.debug));
      const nextEpisode: PodcastEpisode = {
        id: crypto.randomUUID(),
        weekId: activeWeek.id,
        dayIndex,
        title: generated.data.title,
        wordCount: generated.data.turns.reduce((sum, turn) => sum + (turn.text.match(/[A-Za-z0-9']+/g) ?? []).length, 0),
        turns: generated.data.turns.map((turn) => ({
          id: crypto.randomUUID(),
          speaker: turn.speaker,
          text: turn.text,
          voice: turn.speaker === "Partner" ? activeWeek.podcastPartnerVoice : activeWeek.podcastUserVoice
        })),
        createdAt: new Date().toISOString()
      };
      savePodcast(nextEpisode);
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
        footer={<button className="btn-primary" onClick={() => void generatePodcast()}>{ja ? "生成して始める" : "Generate and Start"}</button>}
      >
        <p className="text-sm text-slate-700">{ja ? "最初の案内ではネタバレせず、聞く段階で内容をつかみます。" : "The intro stays spoiler-free. You discover the content by listening first."}</p>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <DebugBlock feature="podcast" />
      </CardShell>
    );
  }

  const activeTurn = episode.turns[turnIndex];

  return (
    <CardShell
      title={cardTitle}
      subtitle={cardSubtitle}
      footer={
        <>
          {stage === "intro" && <button className="btn-primary" onClick={() => { setTranscriptVisible(false); setStage("full-listen"); }}>{ja ? "今日のPodcastを聞く" : "Listen to Today's Podcast"}</button>}
          {stage === "full-listen" && (
            <>
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
                {playingKey === `podcast-listen:${episode.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "通しで聞く" : "Play Full Episode"}
              </button>
              <button className="btn-secondary" onClick={() => setTranscriptVisible((value) => !value)}>
                {transcriptVisible ? (ja ? "スクリプトを隠す" : "Hide Script") : ja ? "スクリプトを表示" : "Show Script"}
              </button>
              <button className="btn-primary" onClick={() => { stop(); setTurnIndex(0); setStage("turns"); }}>{ja ? "1ターンずつオーバーラップ" : "Turn-by-Turn Overlap"}</button>
            </>
          )}
          {stage === "turns" && activeTurn && (
            <>
              <button className="btn-secondary" onClick={() => void playText(`podcast-turn:${activeTurn.id}`, activeTurn.text, activeTurn.voice)}>
                {playingKey === `podcast-turn:${activeTurn.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "このターンを流す" : "Play This Turn"}
              </button>
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
                {playingKey === `podcast-overlap:${episode.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "通しで流す" : "Play Full Overlap"}
              </button>
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
      <DebugBlock feature="podcast" />
    </CardShell>
  );
}

