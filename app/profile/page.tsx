"use client";

import { useAppState } from "@/lib/app-state";
import { CEFR } from "@/lib/types";

const cefrs: CEFR[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

const JA = {
  title: "\u8a2d\u5b9a / \u30d8\u30eb\u30d7",
  desc: "Prompt-first\u904b\u7528\u3002v0.x\u3067\u306fAPI\u9023\u643a\u306a\u3057\u3002",
  language: "\u8868\u793a\u8a00\u8a9e",
  defaultCefr: "\u30c7\u30d5\u30a9\u30eb\u30c8 CEFR",
  defaultDesc: "\u300c\u4eca\u65e5\u306e\u30ec\u30c3\u30b9\u30f3\u300d\u30bf\u30d6\u3067\u30c7\u30d5\u30a9\u30eb\u30c8\u3068\u3057\u3066\u63d0\u6848\u3055\u308c\u307e\u3059\u3002",
  glossary: "\u7528\u8a9e\u30d8\u30eb\u30d7"
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
  ["\u81ea\u5206\u3054\u3068\u30c8\u30d4\u30c3\u30af", "\u5b9f\u969b\u306b\u8a71\u3059\u6a5f\u4f1a\u304c\u3042\u308b\u8a71\u984c\u3002"],
  ["\u9006\u7b97\u578b\u5b66\u7fd2", "\u5148\u306b\u8a71\u305b\u308b\u72b6\u614b\u3092\u6c7a\u3081\u3066\u5fc5\u8981\u306a\u90e8\u5206\u3060\u3051\u5b66\u3076\u65b9\u6cd5\u3002"],
  ["\u7a4d\u307f\u4e0a\u3052\u578b\u5b66\u7fd2", "\u5927\u91cf\u30a4\u30f3\u30d7\u30c3\u30c8\u3092\u5148\u306b\u7a4d\u3080\u5b66\u7fd2\u6cd5\u3002"],
  ["1\u5206\u9593\u30b9\u30d4\u30fc\u30c1", "1\u5206\u7a0b\u5ea6\u3067\u8a71\u305b\u308b\u81ea\u5206\u5c02\u7528\u306e\u53f0\u672c\u3002"],
  ["\u30e2\u30c7\u30eb\u97f3\u58f0", "\u767a\u97f3\u3068\u30ea\u30ba\u30e0\u78ba\u8a8d\u306e\u305f\u3081\u306e\u53c2\u8003\u97f3\u58f0\u3002"],
  ["\u97f3\u8aad", "\u82f1\u6587\u3092\u58f0\u306b\u51fa\u3057\u3066\u8aad\u3080\u7df4\u7fd2\u3002"],
  ["\u30b7\u30e3\u30c9\u30fc\u30a4\u30f3\u30b0", "\u97f3\u58f0\u306b\u5c11\u3057\u9045\u308c\u3066\u8ffd\u5f93\u3059\u308b\u7df4\u7fd2\u3002"],
  ["\u30ea\u30c6\u30ea\u30f3\u30b0", "\u5185\u5bb9\u3092\u81ea\u5206\u306e\u8a00\u8449\u3067\u8a00\u3044\u76f4\u3059\u7df4\u7fd2\u3002"],
  ["3-2-1\u30ea\u30c6\u30ea\u30f3\u30b0", "3\u5206\u21922\u5206\u21921\u5206\u3067\u540c\u5185\u5bb9\u3092\u8a71\u3059\u3002"],
  ["\u6559\u6750\u5316", "\u6dfb\u524a\u7d50\u679c\u3092\u5fa9\u7fd2\u6559\u6750\u3068\u3057\u3066\u518d\u5229\u7528\u3059\u308b\u3053\u3068\u3002"]
];

export default function ProfilePage() {
  const { state, setLanguage, setDefaultCefr } = useAppState();
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
            {"\u65e5\u672c\u8a9e"}
          </button>
        </div>
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
