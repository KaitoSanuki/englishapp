"use client";

const CACHE_NAME = "english-loop-openai-audio-v1";
const inFlight = new Map<string, Promise<Blob>>();

const hashText = (text: string) => {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

const cacheRequest = (voice: string, text: string) => new Request(`/__audio_cache__/${voice}/${hashText(text)}`, { method: "GET" });

export const getSpeechBlob = async (text: string, voice: string) => {
  const clean = text.trim();
  if (!clean) return null;
  const request = cacheRequest(voice, clean);
  if (typeof window !== "undefined" && "caches" in window) {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached.blob();
  }

  const key = `${voice}:${hashText(clean)}`;
  const running = inFlight.get(key);
  if (running) return running;

  const promise = (async () => {
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
    if (typeof window !== "undefined" && "caches" in window) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, new Response(blob, { headers: { "Content-Type": "audio/mpeg" } }));
    }
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

