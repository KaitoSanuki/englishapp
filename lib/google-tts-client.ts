"use client";

export type GoogleTtsModel = "standard" | "wavenet";

const CACHE_NAME = "google-tts-audio-v1";
const inFlight = new Map<string, Promise<Blob>>();

export const splitForTts = (text: string) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((v) => v.trim())
    .filter(Boolean);

const hashText = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

const cacheRequest = (text: string, speakingRate: number, model: GoogleTtsModel) =>
  new Request(`/__tts_cache__/${model}/${speakingRate}/${hashText(text)}`, { method: "GET" });

export const getCachedGoogleTtsBlob = async (text: string, speakingRate: number, model: GoogleTtsModel) => {
  const clean = text.trim();
  if (!clean) return null;
  if (typeof window === "undefined" || !("caches" in window)) return null;
  const request = cacheRequest(clean, speakingRate, model);
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  return cached ? cached.blob() : null;
};

export const getGoogleTtsBlob = async (text: string, speakingRate: number, model: GoogleTtsModel) => {
  const clean = text.trim();
  if (!clean) return null;
  const request = cacheRequest(clean, speakingRate, model);

  if (typeof window !== "undefined" && "caches" in window) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached.blob();
  }

  const inflightKey = `${model}:${speakingRate}:${hashText(clean)}`;
  const existing = inFlight.get(inflightKey);
  if (existing) return existing;

  const promise = (async () => {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean, speakingRate, model })
    });
    if (!res.ok) throw new Error("Google TTS failed");
    const blob = await res.blob();
    if (typeof window !== "undefined" && "caches" in window) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, new Response(blob, { headers: { "Content-Type": "audio/mpeg" } }));
    }
    return blob;
  })();

  inFlight.set(inflightKey, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(inflightKey);
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

export const preCacheTextSegments = async (text: string, speakingRate: number, model: GoogleTtsModel) => {
  const parts = splitForTts(text);
  for (const part of parts) {
    await getGoogleTtsBlob(part, speakingRate, model);
  }
};
