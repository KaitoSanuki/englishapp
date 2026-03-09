import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/lib/app-state";
import { BottomNav } from "@/components/BottomNav";
import { PWARegister } from "@/components/PWARegister";

export const viewport: Viewport = {
  themeColor: "#1f7a8c",
  colorScheme: "light"
};

export const metadata: Metadata = {
  title: "English Loop",
  description: "Prompt-first English conversation training assistant",
  manifest: "/manifest.webmanifest"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <AppProvider>
          <PWARegister />
          <main className="mx-auto w-[min(96vw,560px)] pb-24 pt-4">{children}</main>
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  );
}

