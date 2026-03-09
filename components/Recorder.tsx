"use client";

import { useRef, useState } from "react";
import { Language } from "@/lib/types";

export function Recorder({ onSave, language }: { onSave: (blobUrl: string, memo: string) => void; language: Language }) {
  const [recording, setRecording] = useState(false);
  const [memo, setMemo] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const chunksRef = useRef<Blob[]>([]);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const ja = language === "ja";

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(stream);
    chunksRef.current = [];
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      setPreviewUrl(URL.createObjectURL(blob));
    };
    mr.start();
    mediaRef.current = mr;
    setRecording(true);
  };

  const stop = () => {
    mediaRef.current?.stop();
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
  };

  return (
    <section className="glass rounded-xl2 p-4 space-y-3">
      <h3 className="text-base font-bold text-slate-900">{ja ? "録音" : "Recorder"}</h3>
      <div className="flex gap-2">
        {!recording ? (
          <button className="btn-primary" onClick={start}>
            {ja ? "録音開始" : "Record"}
          </button>
        ) : (
          <button className="btn-secondary" onClick={stop}>
            {ja ? "停止" : "Stop"}
          </button>
        )}
      </div>
      <input
        className="input"
        type="file"
        accept="audio/*"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setPreviewUrl(URL.createObjectURL(file));
        }}
      />
      <input className="input text-slate-900" placeholder={ja ? "メモ（任意）" : "Memo (optional)"} value={memo} onChange={(e) => setMemo(e.target.value)} />
      {previewUrl && <audio src={previewUrl} controls className="w-full" />}
      <button className="btn-secondary" onClick={() => previewUrl && onSave(previewUrl, memo)} disabled={!previewUrl}>
        {ja ? "録音を保存" : "Save Recording"}
      </button>
    </section>
  );
}
