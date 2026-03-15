"use client";

import { AppState } from "@/lib/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseEnabled = () => Boolean(url && anonKey);

type AuthPayload = {
  access_token: string;
  refresh_token: string;
  user: { id: string; email?: string | null };
};

const request = async <T>(path: string, init?: RequestInit, token?: string): Promise<T> => {
  if (!isSupabaseEnabled()) {
    throw new Error("Supabase is not configured.");
  }
  const res = await fetch(`${url}${path}`, {
    ...init,
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Supabase request failed: ${res.status}`);
  }
  if (res.status === 204) return {} as T;
  return (await res.json()) as T;
};

export const supabaseSignUp = async (email: string, password: string) => {
  return await request<AuthPayload>("/auth/v1/signup", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
};

export const supabaseSignIn = async (email: string, password: string) => {
  return await request<AuthPayload>("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
};

export const supabaseGetUser = async (accessToken: string) => {
  return await request<{ id: string; email?: string | null }>("/auth/v1/user", { method: "GET" }, accessToken);
};

export const supabaseGetPlan = async (userId: string, accessToken: string) => {
  const rows = await request<Array<{ plan: "free" | "pro" }>>(
    `/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=plan&limit=1`,
    { method: "GET" },
    accessToken
  );
  return rows[0]?.plan ?? "free";
};

export const supabaseLoadSnapshot = async (userId: string, accessToken: string) => {
  const rows = await request<Array<{ data: AppState | null }>>(
    `/rest/v1/app_user_data?user_id=eq.${encodeURIComponent(userId)}&select=data&limit=1`,
    { method: "GET" },
    accessToken
  );
  return rows[0]?.data ?? null;
};

export const supabaseSaveSnapshot = async (userId: string, accessToken: string, data: AppState) => {
  await request<Array<{ user_id: string }>>(
    "/rest/v1/app_user_data",
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify([
        {
          user_id: userId,
          data,
          updated_at: new Date().toISOString()
        }
      ])
    },
    accessToken
  );
};

const getAudioExt = (mimeType: string) => {
  if (mimeType.includes("mp4")) return "m4a";
  if (mimeType.includes("mpeg")) return "mp3";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
};

export const supabaseUploadAudio = async (args: {
  accessToken: string;
  userId: string;
  weekId: string;
  type: "baseline" | "review" | "daily";
  recordId: string;
  blob: Blob;
}) => {
  if (!isSupabaseEnabled()) {
    throw new Error("Supabase is not configured.");
  }
  const ext = getAudioExt(args.blob.type || "audio/webm");
  const path = `${args.userId}/${args.weekId}/${args.type}/${args.recordId}.${ext}`;
  const res = await fetch(`${url}/storage/v1/object/audio/${path}`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${args.accessToken}`,
      "x-upsert": "true",
      "Content-Type": args.blob.type || "application/octet-stream"
    },
    body: args.blob
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Audio upload failed.");
  }
  const publicUrl = `${url}/storage/v1/object/public/audio/${path}`;
  return { path, publicUrl };
};
