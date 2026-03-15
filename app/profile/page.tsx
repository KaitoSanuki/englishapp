"use client";

import { useAppState } from "@/lib/app-state";
import { CEFR } from "@/lib/types";

const cefrs: CEFR[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const JA = {
  title: "設定 / ヘルプ",
  desc: "Prompt-first運用。v0.xではAPI連携なし。",
  language: "表示言語",
  ttsEngine: "読み上げエンジン",
  ttsModel: "Google音声モデル",
  defaultCefr: "デフォルト CEFR",
  defaultDesc: "「今日のレッスン」タブでデフォルトとして提案されます。",
  glossary: "用語ヘルプ"
};

const glossaryEn = [
  ["Personal topic", "A topic from your real life that you actually use in conversation."],
  ["Backward design", "Define speaking goal first, then learn only what you need."],
  ["Stacking learning", "Input-heavy learning before speaking practice."],
  ["1-minute speech", "Your own script that can be spoken in around one minute."],
  ["Model audio", "Reference audio for checking pronunciation and rhythm."],
  ["Read aloud", "Reading text aloud to internalize sounds and rhythm."],
  ["Shadowing", "Repeat right after audio with a small delay."],
  ["Retelling", "Re-express content in your own words."],
  ["3-2-1 retelling", "Retell in 3, 2, then 1 minute."],
  ["Materialization", "Turn corrected output into reusable study material."]
];

const glossaryJa = [
  ["自分ごとトピック", "実際に話す機会がある話題。"],
  ["逆算型学習", "先に話せる状態を決めて必要な部分だけ学ぶ方法。"],
  ["積み上げ型学習", "大量インプットを先に積む学習法。"],
  ["1分間スピーチ", "1分程度で話せる自分専用の台本。"],
  ["モデル音声", "発音とリズム確認のための参考音声。"],
  ["音読", "英文を声に出して読む練習。"],
  ["シャドーイング", "音声に少し遅れて追従する練習。"],
  ["リテリング", "内容を自分の言葉で言い直す練習。"],
  ["3-2-1リテリング", "3分→2分→1分で同内容を話す。"],
  ["教材化", "添削結果を復習教材として再利用すること。"]
];

export default function ProfilePage() {
  const { state, setLanguage, setDefaultCefr, setTtsEngine, setTtsModel } = useAppState();
  const ja = state.language === "ja";
  const glossary = ja ? glossaryJa : glossaryEn;

  return (
    <div className="space-y-4">
      <section className="glass rounded-xl2 p-4">
        <h1 className="text-xl font-black text-slate-900">{ja ? JA.title : "Profile / Help"}</h1>
        <p className="text-sm text-slate-900">{ja ? JA.desc : "Prompt-first workflow. API execution is out of scope in v0.x."}</p>
      </section>

      <section className="glass rounded-xl2 p-4 space-y-3">
        <h2 className="text-base font-bold text-slate-900">{ja ? JA.language : "Display Language"}</h2>
        <div className="flex gap-2">
          <button className={state.language === "en" ? "btn-primary" : "btn-secondary"} onClick={() => setLanguage("en")}>
            English
          </button>
          <button className={state.language === "ja" ? "btn-primary" : "btn-secondary"} onClick={() => setLanguage("ja")}>
            日本語
          </button>
        </div>
      </section>

      <section className="glass rounded-xl2 p-4 space-y-3">
        <h2 className="text-base font-bold text-slate-900">{ja ? JA.ttsEngine : "TTS Engine"}</h2>
        <div className="flex flex-wrap gap-2">
          <button className={state.prefs.ttsEngine === "web" ? "btn-primary" : "btn-secondary"} onClick={() => setTtsEngine("web")}>
            Web Speech
          </button>
          <button className={state.prefs.ttsEngine === "google" ? "btn-primary" : "btn-secondary"} onClick={() => setTtsEngine("google")}>
            Google TTS
          </button>
          <button className={state.prefs.ttsEngine === "elevenlabs" ? "btn-primary" : "btn-secondary"} onClick={() => setTtsEngine("elevenlabs")}>
            ElevenLabs
          </button>
        </div>
        <p className="text-xs text-slate-900">
          {ja
            ? "Googleは GOOGLE_TTS_CREDENTIALS_JSON、ElevenLabsは ELEVENLABS_API_KEY（任意で ELEVENLABS_VOICE_ID / ELEVENLABS_MODEL_ID）が必要です。"
            : "Google needs GOOGLE_TTS_CREDENTIALS_JSON. ElevenLabs needs ELEVENLABS_API_KEY (optional: ELEVENLABS_VOICE_ID / ELEVENLABS_MODEL_ID)."}
        </p>
      </section>

      <section className="glass rounded-xl2 p-4 space-y-3">
        <h2 className="text-base font-bold text-slate-900">{ja ? JA.ttsModel : "Google Model"}</h2>
        <div className="flex gap-2">
          <button className={state.prefs.ttsModel === "standard" ? "btn-primary" : "btn-secondary"} onClick={() => setTtsModel("standard")}>
            Standard
          </button>
          <button className={state.prefs.ttsModel === "wavenet" ? "btn-primary" : "btn-secondary"} onClick={() => setTtsModel("wavenet")}>
            WaveNet
          </button>
        </div>
        <p className="text-xs text-slate-900">{ja ? "Google TTS選択時のみ反映されます。" : "Applied only when Google TTS is selected."}</p>
      </section>

      <section className="glass rounded-xl2 p-4 space-y-3">
        <h2 className="text-base font-bold text-slate-900">{ja ? JA.defaultCefr : "Default CEFR"}</h2>
        <select className="input text-slate-900" value={state.prefs.defaultCefr} onChange={(e) => setDefaultCefr(e.target.value as CEFR)}>
          {cefrs.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <p className="text-xs text-slate-900">{ja ? JA.defaultDesc : "Used as suggested CEFR in the Today tab flow."}</p>
      </section>

      <section className="glass rounded-xl2 p-4 space-y-2">
        <h2 className="text-base font-bold text-slate-900">{ja ? JA.glossary : "Glossary"}</h2>
        {glossary.map(([term, desc]) => (
          <article className="input" key={term}>
            <p className="font-semibold text-slate-900">{term}</p>
            <p className="text-sm text-slate-900">{desc}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
