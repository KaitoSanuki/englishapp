"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { ensurePhraseSetReady, ensurePodcastReady, prewarmPhraseAudio } from "@/lib/lesson-preload";
import { AnnotatedToken, PhraseCard } from "@/lib/types";
import { CardShell, DebugBlock, TokenEditor, makeClientTrace, makeJob, useAudioPlayback } from "@/components/lesson/ui";

export function PhraseTask({ dayIndex, onDone }: { dayIndex: number; onDone: () => void }) {
  const { activeWeek, auth, state, savePhraseSet, incrementPhraseUsage, savePodcast, markTaskComplete, addDebugTrace, setCurrentJob } = useAppState();
  const ja = state.language === "ja";
  const speech = activeWeek.speech;
  const phraseSet = activeWeek.phraseSets.find((item) => item.dayIndex === dayIndex);
  const [stage, setStage] = useState<"intro" | "listen" | "strong" | "weak" | "confirm" | "overlap" | "review">("intro");
  const [cardIndex, setCardIndex] = useState(0);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [history, setHistory] = useState<AnnotatedToken[][]>([]);
  const [error, setError] = useState("");
  const [autoPreparing, setAutoPreparing] = useState(false);
  const { playingKey, playText } = useAudioPlayback();

  const activeCard = phraseSet?.cards[cardIndex];
  const reviewCard = phraseSet?.cards[reviewIndex];

  useEffect(() => {
    if (!speech || phraseSet) return;
    let cancelled = false;
    setAutoPreparing(true);
    void ensurePhraseSetReady(
      {
        week: activeWeek,
        auth,
        phraseUsage: state.phraseUsage,
        savePhraseSet,
        incrementPhraseUsage,
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
  }, [speech, phraseSet, activeWeek, auth, state.phraseUsage, savePhraseSet, incrementPhraseUsage, addDebugTrace, dayIndex]);

  useEffect(() => {
    if (!phraseSet) return;
    let cancelled = false;
    const run = async () => {
      await prewarmPhraseAudio(phraseSet, auth);
      if (cancelled || dayIndex > 5) return;
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
  }, [phraseSet, auth, activeWeek, state.prefs, savePodcast, addDebugTrace, dayIndex]);

  const saveUpdatedCard = (updatedCard: PhraseCard) => {
    if (!phraseSet) return;
    savePhraseSet({
      ...phraseSet,
      cards: phraseSet.cards.map((card) => (card.id === updatedCard.id ? updatedCard : card))
    });
  };

  const tapToken = (tokenId: string, mode: "strong" | "weak") => {
    if (!activeCard) return;
    const before = activeCard.segment.tokens.map((token) => ({ ...token }));
    const tokens = activeCard.segment.tokens.map((token) => {
      if (token.id !== tokenId || token.kind !== "word") return token;
      if (mode === "strong") {
        return { ...token, weight: token.weight >= 0 ? Math.min(3, token.weight + 1) : 1 };
      }
      return { ...token, weight: token.weight <= 0 ? Math.max(-3, token.weight - 1) : -1 };
    });
    setHistory((prev) => [...prev, before]);
    saveUpdatedCard({ ...activeCard, segment: { ...activeCard.segment, tokens } });
  };

  const undo = () => {
    const latest = history[history.length - 1];
    if (!latest || !activeCard) return;
    saveUpdatedCard({ ...activeCard, segment: { ...activeCard.segment, tokens: latest } });
    setHistory((prev) => prev.slice(0, -1));
  };

  const generatePhraseSet = async () => {
    if (!speech) {
      setError(ja ? "先に1分スピーチを作成してください。" : "Create the speech first.");
      return;
    }
    setError("");
    const job = makeJob("phrases", dayIndex, ja ? "Oxford Phrase を生成しています" : "Generating phrases", 2);
    setCurrentJob(job);
    try {
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
      setCurrentJob(undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : ja ? "生成に失敗しました。" : "Generation failed.");
      setCurrentJob({ ...job, status: "error", error: err instanceof Error ? err.message : "error" });
    }
  };

  const nextCard = () => {
    if (!phraseSet) return;
    if (cardIndex >= phraseSet.cards.length - 1) {
      setReviewIndex(0);
      setStage("review");
      return;
    }
    setCardIndex((value) => value + 1);
    setShowTranslation(false);
    setHistory([]);
    setStage("listen");
  };

  const finishTask = () => {
    markTaskComplete(dayIndex, "phrases");
    setCurrentJob(undefined);
    onDone();
  };

  if (!phraseSet) {
    return (
      <CardShell
        title={ja ? "Oxford Phrase を準備します" : "Prepare Oxford Phrase"}
        subtitle={ja ? `${dayIndex === 1 ? 10 : 20}個の未履修フレーズを、自分ごとの文にします。` : `Generate ${dayIndex === 1 ? 10 : 20} new personalized phrase cards.`}
        footer={
          <button className="btn-primary" onClick={() => void generatePhraseSet()} disabled={autoPreparing}>
            {autoPreparing ? (ja ? "裏で準備しています..." : "Preparing in the background...") : ja ? "生成して始める" : "Generate and Start"}
          </button>
        }
      >
        <p className="text-sm text-slate-700">{ja ? "スクリプトを見ながら進めます。訳だけ必要なときに開けます。" : "You keep the script visible and reveal the translation only when needed."}</p>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <DebugBlock feature="phrases" />
      </CardShell>
    );
  }

  return (
    <CardShell
      title={ja ? "Oxford Phrase" : "Oxford Phrase"}
      subtitle={`${cardIndex + 1} / ${phraseSet.cards.length}`}
      footer={
        <>
          {stage === "intro" && <button className="btn-primary" onClick={() => setStage("listen")}>{ja ? "始める" : "Start"}</button>}
          {stage === "listen" && activeCard && (
            <>
              <button className="btn-secondary" onClick={() => void playText(`phrase-listen:${activeCard.id}`, activeCard.segment.text, activeCard.segment.voice)}>
                {playingKey === `phrase-listen:${activeCard.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "音声を聞く" : "Play Audio"}
              </button>
              <button className="btn-secondary" onClick={() => setShowTranslation((value) => !value)}>{showTranslation ? (ja ? "訳を隠す" : "Hide Translation") : ja ? "訳を見る" : "Show Translation"}</button>
              <button className="btn-primary" onClick={() => setStage("strong")}>{ja ? "色付けへ" : "Mark Rhythm"}</button>
            </>
          )}
          {stage === "strong" && activeCard && (
            <>
              <button className="btn-secondary" onClick={() => void playText(`phrase-strong:${activeCard.id}`, activeCard.segment.text, activeCard.segment.voice)}>
                {playingKey === `phrase-strong:${activeCard.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "音声を聞く" : "Play Audio"}
              </button>
              <button className="btn-secondary" onClick={undo} disabled={!history.length}>{ja ? "1つ戻す" : "Undo"}</button>
              <button className="btn-primary" onClick={() => { setHistory([]); setStage("weak"); }}>{ja ? "弱い語へ" : "To Weak Words"}</button>
            </>
          )}
          {stage === "weak" && activeCard && (
            <>
              <button className="btn-secondary" onClick={() => void playText(`phrase-weak:${activeCard.id}`, activeCard.segment.text, activeCard.segment.voice)}>
                {playingKey === `phrase-weak:${activeCard.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "音声を聞く" : "Play Audio"}
              </button>
              <button className="btn-secondary" onClick={undo} disabled={!history.length}>{ja ? "1つ戻す" : "Undo"}</button>
              <button className="btn-primary" onClick={() => { setHistory([]); setStage("confirm"); }}>{ja ? "確認へ" : "Review"}</button>
            </>
          )}
          {stage === "confirm" && activeCard && (
            <>
              <button className="btn-secondary" onClick={() => setStage("weak")}>{ja ? "弱い語を直す" : "Edit Weak Words"}</button>
              <button className="btn-primary" onClick={() => setStage("overlap")}>{ja ? "このフレーズをオーバーラップ" : "Overlap This Phrase"}</button>
            </>
          )}
          {stage === "overlap" && activeCard && (
            <>
              <button className="btn-secondary" onClick={() => void playText(`phrase-overlap:${activeCard.id}`, activeCard.segment.text, activeCard.segment.voice)}>
                {playingKey === `phrase-overlap:${activeCard.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "音声を流す" : "Play for Overlap"}
              </button>
              <button className="btn-primary" onClick={nextCard}>{cardIndex >= phraseSet.cards.length - 1 ? (ja ? "通し復習へ" : "To Review") : ja ? "次のフレーズへ" : "Next Phrase"}</button>
            </>
          )}
          {stage === "review" && reviewCard && (
            <>
              <button className="btn-secondary" onClick={() => void playText(`phrase-review:${reviewCard.id}`, reviewCard.segment.text, reviewCard.segment.voice)}>
                {playingKey === `phrase-review:${reviewCard.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "再生" : "Play"}
              </button>
              <button className="btn-secondary" onClick={() => setShowTranslation((value) => !value)}>
                {showTranslation ? (ja ? "訳を隠す" : "Hide Translation") : ja ? "訳を見る" : "Show Translation"}
              </button>
              <button
                className="btn-primary"
                onClick={() => {
                  if (reviewIndex >= phraseSet.cards.length - 1) {
                    finishTask();
                    return;
                  }
                  setReviewIndex((value) => value + 1);
                  setShowTranslation(false);
                }}
              >
                {reviewIndex >= phraseSet.cards.length - 1 ? (ja ? "Oxford Phrase を完了" : "Finish Phrases") : ja ? "次へ" : "Next"}
              </button>
            </>
          )}
        </>
      }
    >
      <DebugBlock feature="phrases" />
      {stage === "intro" && <p className="text-sm text-slate-700">{ja ? "1カードずつ、音声 → 色付け → オーバーラッピングで進めます。" : "You will go card by card: audio, rhythm marking, then overlap."}</p>}
      {activeCard && stage === "listen" && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">{activeCard.original}</p>
          <p className="text-2xl font-black text-slate-900">{activeCard.personalized}</p>
          {showTranslation && <p className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{activeCard.translation}</p>}
        </div>
      )}
      {activeCard && (stage === "strong" || stage === "weak" || stage === "confirm" || stage === "overlap") && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">{activeCard.original}</p>
          {showTranslation && <p className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{activeCard.translation}</p>}
          <TokenEditor segment={activeCard.segment} editable={stage === "strong" || stage === "weak"} onTokenTap={(tokenId) => tapToken(tokenId, stage === "strong" ? "strong" : "weak")} />
        </div>
      )}
      {stage === "review" && reviewCard && (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">{ja ? `復習 ${reviewIndex + 1} / ${phraseSet.cards.length}` : `Review ${reviewIndex + 1} / ${phraseSet.cards.length}`}</p>
          <p className="text-xs uppercase tracking-wide text-slate-400">{reviewCard.original}</p>
          <TokenEditor segment={reviewCard.segment} editable={false} />
          {showTranslation && <p className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{reviewCard.translation}</p>}
        </div>
      )}
    </CardShell>
  );
}

