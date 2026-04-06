"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppState } from "@/lib/app-state";

export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useAppState();
  const ja = state.language === "ja";
  const locked = state.lessonFocusActive && pathname !== "/";

  useEffect(() => {
    if (locked) {
      router.replace("/");
    }
  }, [locked, router]);

  const tabs = [
    { href: "/", label: ja ? "今日のレッスン" : "Today Lesson" },
    { href: "/practice", label: ja ? "進捗" : "Progress" },
    { href: "/materials", label: ja ? "教材" : "Materials" },
    { href: "/profile", label: ja ? "設定" : "Settings" }
  ];

  return (
    <nav className="fixed bottom-3 left-1/2 z-20 w-[min(96vw,560px)] -translate-x-1/2 rounded-2xl glass px-2 py-2">
      <ul className="grid grid-cols-4 gap-1 text-xs">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          const disabled = state.lessonFocusActive && tab.href !== "/";
          return (
            <li key={tab.href}>
              {disabled ? (
                <span className="block rounded-xl px-2 py-2 text-center font-semibold text-slate-400">{tab.label}</span>
              ) : (
                <Link className={`block rounded-xl px-2 py-2 text-center font-semibold ${active ? "bg-accent text-white" : "text-slate-700"}`} href={tab.href}>
                  {tab.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

