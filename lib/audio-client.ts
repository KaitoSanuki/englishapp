"use client";

import { isSupabaseEnabled, supabaseGeneratedSpeechPath, supabasePublicAudioUrl, supabaseUploadGeneratedAudio } from "@/lib/supabase-browser";

const CACHE_NAME = "english-loop-openai-audio-v2";
const inFlight = new Map<string, Promise<Blob>>();

type CloudAudioScope = {
  userId: string;
  accessToken: string;
};

const hashText = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

const cacheRequest = (voice: string, text: string) => new Request(`/__audio_cache__/${voice}/${hashText(text)}`, { method: "GET" });

const saveToBrowserCache = async (request: Request, blob: Blob) => {
  if (typeof window === "undefined" || !("caches" in window)) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, new Response(blob, { headers: { "Content-Type": blob.type || "audio/mpeg" } }));
};

export const getSpeechBlob = async (text: string, voice: string, cloudScope?: CloudAudioScope) => {
  const clean = text.trim();
  if (!clean) return null;

  const request = cacheRequest(voice, clean);
  if (typeof window !== "undefined" && "caches" in window) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached.blob();
  }

  const hash = hashText(clean);
  const key = `${cloudScope?.userId ?? "guest"}:${voice}:${hash}`;
  const running = inFlight.get(key);
  if (running) return running;

  const promise = (async () => {
    if (cloudScope?.userId && cloudScope.accessToken && isSupabaseEnabled()) {
      const path = supabaseGeneratedSpeechPath({ userId: cloudScope.userId, voice, hash });
      const remote = await fetch(supabasePublicAudioUrl(path));
      if (remote.ok) {
        const blob = await remote.blob();
        await saveToBrowserCache(request, blob);
        return blob;
      }
    }

    const res = await fetch("/api/openai/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ text: clean, voice })
    });

    if (!res.ok) {
      const reason = await res.text();
      throw new Error(reason || "Speech generation failed.");
    }

    const blob = await res.blob();

    if (cloudScope?.userId && cloudScope.accessToken && isSupabaseEnabled()) {
      try {
        await supabaseUploadGeneratedAudio({
          accessToken: cloudScope.accessToken,
          userId: cloudScope.userId,
          voice,
          hash,
          blob
        });
      } catch {
        // Keep playback working even if cloud upload fails.
      }
    }

    await saveToBrowserCache(request, blob);
    return blob;
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
};

export const playBlob = async (blob: Blob, audioRef: { current: HTMLAudioElement | null }) => {
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audioRef.current = audio;
  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Audio playback failed"));
    };
    audio.play().catch(reject);
  });
};

export const stopAudio = (audioRef: { current: HTMLAudioElement | null }) => {
  if (!audioRef.current) return;
  audioRef.current.pause();
  audioRef.current.currentTime = 0;
  audioRef.current = null;
};
