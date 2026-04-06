export const jsonPost = async <T,>(body: unknown) => {
  const res = await fetch("/api/openai/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const json = (await res.json()) as { data?: T; debug?: any; error?: string };
  if (!res.ok || !json.data) {
    throw new Error(json.error || "Request failed.");
  }
  return json as { data: T; debug?: any };
};

export const transcribeBlob = async (blob: Blob) => {
  const form = new FormData();
  form.append("file", new File([blob], "retelling.webm", { type: blob.type || "audio/webm" }));
  const res = await fetch("/api/openai/transcribe", {
    method: "POST",
    body: form
  });
  const json = (await res.json()) as { text?: string; raw?: unknown; error?: string };
  if (!res.ok || !json.text) {
    throw new Error(json.error || "Transcription failed.");
  }
  return json;
};

export const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });

