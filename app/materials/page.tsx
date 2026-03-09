"use client";

import { useMemo } from "react";
import { useAppState } from "@/lib/app-state";

export default function MaterialsPage() {
  const { activeWeek, state } = useAppState();
  const ja = state.language === "ja";
  const scripts = useMemo(() => state.scripts.filter((s) => s.weekId === activeWeek.id), [activeWeek.id, state.scripts]);
  const roleplays = useMemo(() => state.roleplays.filter((r) => r.weekId === activeWeek.id), [activeWeek.id, state.roleplays]);

  return (
    <div className="space-y-4">
      <section className="glass rounded-xl2 p-4">
        <h1 className="text-xl font-black text-slate-900">{ja ? "教材" : "Materials"}</h1>
        <p className="text-sm text-slate-900">{ja ? "今週の台本と修正フレーズ" : "Weekly scripts and correction phrases"}</p>
      </section>

      <section className="glass rounded-xl2 p-4 space-y-2">
        <h2 className="text-base font-bold text-slate-900">{ja ? "台本" : "Scripts"}</h2>
        {scripts.map((s) => (
          <article key={s.id} className="input">
            <p className="text-xs text-slate-700">JP</p>
            <p className="text-slate-900">{s.jpSource}</p>
            <p className="mt-2 text-xs text-slate-700">EN</p>
            <p className="text-slate-900">{s.enScript}</p>
          </article>
        ))}
        {!scripts.length && <p className="text-sm text-slate-900">{ja ? "まだありません。" : "No scripts yet."}</p>}
      </section>

      <section className="glass rounded-xl2 p-4 space-y-2">
        <h2 className="text-base font-bold text-slate-900">{ja ? "ロールプレイ添削" : "Roleplay Corrections"}</h2>
        {roleplays.map((r) => (
          <article key={r.id} className="input">
            <p className="text-xs text-slate-700">{ja ? "添削 / 表現集" : "Correction / Phrases"}</p>
            <p className="text-slate-900">{r.correctionText}</p>
          </article>
        ))}
        {!roleplays.length && <p className="text-sm text-slate-900">{ja ? "まだありません。" : "No roleplay corrections yet."}</p>}
      </section>
    </div>
  );
}
