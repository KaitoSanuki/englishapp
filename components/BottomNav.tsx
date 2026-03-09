"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAppState } from "@/lib/app-state";

export function BottomNav() {
  const pathname = usePathname();
  const { state } = useAppState();
  const ja = state.language === "ja";
  const tabs = [
    { href: "/", label: ja ? "\u4eca\u65e5\u306e\u30ec\u30c3\u30b9\u30f3" : "Today" },
    { href: "/practice", label: ja ? "\u9032\u6357" : "Progress" },
    { href: "/materials", label: ja ? "\u6559\u6750" : "Materials" },
    { href: "/profile", label: ja ? "\u8a2d\u5b9a" : "Profile" }
  ];

  return (
    <nav className="fixed bottom-3 left-1/2 z-20 w-[min(96vw,560px)] -translate-x-1/2 rounded-2xl glass px-2 py-2">
      <ul className="grid grid-cols-4 gap-1 text-xs">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <li key={tab.href}>
              <Link
                className={`block rounded-xl px-2 py-2 text-center font-semibold ${active ? "bg-accent text-white" : "text-slate-700 dark:text-slate-300"}`}
                href={tab.href}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
