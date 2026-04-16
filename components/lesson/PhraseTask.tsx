"use client";

import { useEffect, useState } from "react";
import { useAppState } from "@/lib/app-state";
import { ensurePhraseSetReady, ensurePodcastReady, prewarmPhraseAudio } from "@/lib/lesson-preload";
import { PhraseCard } from "@/lib/types";
import { CardShell, TokenEditor, makeClientTrace, makeJob, useAudioPlayback } from "@/components/lesson/ui";

type PhraseStage = "mark" | "overlap" | "review";

const phraseStages: PhraseStage[] = ["mark", "overlap", "review"];
const isPhraseStage = (value: unknown): value is PhraseStage => typeof value === "string" && phraseStages.includes(value as PhraseStage);

export function PhraseTask({ dayIndex, onDone }: { dayIndex: number; onDone: () => void }) {
  const { activeWeek, auth, state, savePhraseSet, incrementPhraseUsage, savePodcast, markTaskComplete, addDebugTrace, setCurrentJob, setLessonTaskProgress } = useAppState();
  const ja = state.language === "ja";
  const speech = activeWeek.speech;
  const phraseSet = activeWeek.phraseSets.find((item) => item.dayIndex === dayIndex);
  const progressKey = `phrases:${dayIndex}`;
  const savedProgress = state.lessonSession?.taskProgress?.[progressKey];
  const [stage, setStage] = useState<PhraseStage>(isPhraseStage(savedProgress?.stage) ? savedProgress.stage : "mark");
  const [cardIndex, setCardIndex] = useState(typeof savedProgress?.itemIndex === "number" ? Math.max(0, savedProgress.itemIndex) : 0);
  const [reviewIndex, setReviewIndex] = useState(typeof savedProgress?.reviewIndex === "number" ? Math.max(0, savedProgress.reviewIndex) : 0);
  const [markMode, setMarkMode] = useState<"strong" | "weak">(savedProgress?.markMode === "weak" ? "weak" : "strong");
  const [showTranslation, setShowTranslation] = useState(Boolean(savedProgress?.showTranslation));
  const [error, setError] = useState("");
  const [autoPreparing, setAutoPreparing] = useState(false);
  const { playingKey, playText } = useAudioPlayback();

  const activeCard = phraseSet?.cards[cardIndex];
  const reviewCard = phraseSet?.cards[reviewIndex];

  useEffect(() => {
    setLessonTaskProgress(progressKey, { stage, itemIndex: cardIndex, reviewIndex, markMode, showTranslation });
  }, [progressKey, stage, cardIndex, reviewIndex, markMode, showTranslation, setLessonTaskProgress]);

  useEffect(() => {
    if (!phraseSet) return;
    if (cardIndex >= phraseSet.cards.length) setCardIndex(Math.max(0, phraseSet.cards.length - 1));
    if (reviewIndex >= phraseSet.cards.length) setReviewIndex(Math.max(0, phraseSet.cards.length - 1));
  }, [phraseSet, cardIndex, reviewIndex]);

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
    const tokens = activeCard.segment.tokens.map((token) => {
      if (token.id !== tokenId || token.kind !== "word") return token;
      if (mode === "strong") {
        return { ...token, weight: Math.min(3, token.weight + 1) };
      }
      return { ...token, weight: Math.max(-3, token.weight - 1) };
    });
    saveUpdatedCard({ ...activeCard, segment: { ...activeCard.segment, tokens } });
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
    setMarkMode("strong");
    setStage("mark");
  };

  const previousCard = () => {
    if (!phraseSet) return;
    if (stage === "review") {
      if (reviewIndex > 0) {
        setReviewIndex((value) => value - 1);
        setShowTranslation(false);
        return;
      }
      setCardIndex(phraseSet.cards.length - 1);
      setShowTranslation(false);
      setStage("overlap");
      return;
    }
    if (cardIndex <= 0) return;
    setCardIndex((value) => value - 1);
    setShowTranslation(false);
    setMarkMode("strong");
    setStage("mark");
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
      </CardShell>
    );
  }

  return (
    <CardShell
      title={ja ? "Oxford Phrase" : "Oxford Phrase"}
      subtitle={stage === "review" ? (ja ? `通し復習 ${reviewIndex + 1} / ${phraseSet.cards.length}` : `Review ${reviewIndex + 1} / ${phraseSet.cards.length}`) : `${cardIndex + 1} / ${phraseSet.cards.length}`}
      headerAction={
        stage === "review" && reviewCard ? (
          <button className="btn-secondary" onClick={() => void playText(`phrase-review:${reviewCard.id}`, reviewCard.segment.text, reviewCard.segment.voice)}>
            {playingKey === `phrase-review:${reviewCard.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "再生" : "Play"}
          </button>
        ) : activeCard ? (
          <button className="btn-secondary" onClick={() => void playText(`phrase-${stage}:${activeCard.id}`, activeCard.segment.text, activeCard.segment.voice)}>
            {playingKey === `phrase-${stage}:${activeCard.id}` ? (ja ? "再生中..." : "Playing...") : ja ? "再生" : "Play"}
          </button>
        ) : undefined
      }
      footer={
        <>
          {stage === "mark" && activeCard && (
            <>
              <button className={markMode === "strong" ? "btn-primary" : "btn-secondary"} onClick={() => setMarkMode("strong")}>{ja ? "大" : "Large"}</button>
              <button className={markMode === "weak" ? "btn-primary" : "btn-secondary"} onClick={() => setMarkMode("weak")}>{ja ? "小" : "Small"}</button>
              {cardIndex > 0 && <button className="btn-secondary" onClick={previousCard}>{ja ? "前のカードへ" : "Previous"}</button>}
              <button className="btn-secondary" onClick={() => setShowTranslation((value) => !value)}>{showTranslation ? (ja ? "訳を隠す" : "Hide Translation") : ja ? "訳を見る" : "Show Translation"}</button>
              <button className="btn-primary" onClick={() => setStage("overlap")}>{ja ? "このフレーズをオーバーラップ" : "Overlap This Phrase"}</button>
            </>
          )}
          {stage === "overlap" && activeCard && (
            <>
              <button className="btn-secondary" onClick={() => setStage("mark")}>{ja ? "色付けを直す" : "Edit Marking"}</button>
              {cardIndex > 0 && <button className="btn-secondary" onClick={previousCard}>{ja ? "前のカードへ" : "Previous"}</button>}
              <button className="btn-secondary" onClick={() => setShowTranslation((value) => !value)}>{showTranslation ? (ja ? "訳を隠す" : "Hide Translation") : ja ? "訳を見る" : "Show Translation"}</button>
              <button className="btn-primary" onClick={nextCard}>{cardIndex >= phraseSet.cards.length - 1 ? (ja ? "通し復習へ" : "To Review") : ja ? "次のフレーズへ" : "Next Phrase"}</button>
            </>
          )}
          {stage === "review" && reviewCard && (
            <>
              {(reviewIndex > 0 || phraseSet.cards.length > 0) && <button className="btn-secondary" onClick={previousCard}>{ja ? "前のカードへ" : "Previous"}</button>}
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
      {activeCard && (stage === "mark" || stage === "overlap") && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">{activeCard.original}</p>
          {showTranslation && <p className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{activeCard.translation}</p>}
          {stage === "mark" && (
            <p className="text-xs text-slate-500">
              {ja ? `「${markMode === "strong" ? "大" : "小"}」が選択中です。単語をタップして色付けします。` : `${markMode === "strong" ? "Large" : "Small"} is selected. Tap words to mark rhythm.`}
            </p>
          )}
          <TokenEditor segment={activeCard.segment} editable={stage === "mark"} onTokenTap={(tokenId) => tapToken(tokenId, markMode)} />
        </div>
      )}
      {stage === "review" && reviewCard && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-slate-400">{reviewCard.original}</p>
          <TokenEditor segment={reviewCard.segment} editable={false} />
          {showTranslation && <p className="rounded-2xl bg-slate-100 px-3 py-2 text-sm text-slate-700">{reviewCard.translation}</p>}
        </div>
      )}
    </CardShell>
  );
}

