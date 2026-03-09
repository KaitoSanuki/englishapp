"use client";

import { useRef, useState } from "react";
import { Language } from "@/lib/types";

export function Recorder({ onSave, language }: { onSave: (blobUrl: string) => void; language: Language }) {
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const chunksRef = useRef<Blob[]>([]);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const mimeTypeRef = useRef("");
  const [error, setError] = useState("");
  const ja = language === "ja";

  const pickMimeType = () => {
    if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return "";
    const candidates = [
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4",
      "audio/webm;codecs=opus",
      "audio/webm"
    ];
    return candidates.find((v) => MediaRecorder.isTypeSupported(v)) ?? "";
  };

  const start = async () => {
    setError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(ja ? "この端末は録音に対応していません" : "Recording is not supported on this device");
        return;
      }
      if (typeof MediaRecorder === "undefined") {
        setError(ja ? "このブラウザは録音に対応していません" : "MediaRecorder is not supported in this browser");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = pickMimeType();
      mimeTypeRef.current = mimeType;
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onerror = () => {
        setError(ja ? "録音中にエラーが発生しました" : "An error occurred while recording");
      };
      mr.onstop = () => {
        const blobType = mr.mimeType || mimeTypeRef.current || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        setPreviewUrl(URL.createObjectURL(blob));
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch {
      setError(ja ? "マイクへのアクセスが許可されていません" : "Microphone permission is not granted");
      setRecording(false);
    }
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
      {!!error && <p className="text-sm text-rose-600">{error}</p>}
      {previewUrl && <audio src={previewUrl} controls className="w-full" />}
      <button className="btn-secondary" onClick={() => previewUrl && onSave(previewUrl)} disabled={!previewUrl}>
        {ja ? "録音を保存" : "Save Recording"}
      </button>
    </section>
  );
}
