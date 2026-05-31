import { useCallback, useRef, useState } from "react";

interface UseMp4DownloadResult {
  download: (url: string, filename: string) => Promise<void>;
  status: "idle" | "downloading" | "converting" | "done" | "error";
  progress: number; // 0-100
  label: string;
  error: string | null;
  reset: () => void;
}

/**
 * Télécharge une vidéo en MP4 (transcode via FFmpeg.wasm si la source est WebM/MOV).
 * Utilise un worker dédié pour ne pas bloquer l'UI.
 */
export function useMp4Download(): UseMp4DownloadResult {
  const [status, setStatus] = useState<UseMp4DownloadResult["status"]>("idle");
  const [progress, setProgress] = useState(0);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const reset = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setStatus("idle");
    setProgress(0);
    setLabel("");
    setError(null);
  }, []);

  const download = useCallback(async (url: string, filename: string) => {
    reset();
    setStatus("downloading");
    setLabel("Préparation…");

    return new Promise<void>((resolve, reject) => {
      const worker = new Worker(
        new URL("@/workers/videoClipToMp4.worker.ts", import.meta.url),
        { type: "module" },
      );
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent) => {
        const msg = e.data;
        if (msg.type === "progress") {
          setProgress(msg.value);
          if (msg.label) setLabel(msg.label);
          if (msg.value >= 40 && msg.value < 100) setStatus("converting");
        } else if (msg.type === "done") {
          const blobUrl = URL.createObjectURL(msg.blob as Blob);
          const a = document.createElement("a");
          a.href = blobUrl;
          a.download = msg.filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          setStatus("done");
          setProgress(100);
          setLabel("");
          worker.terminate();
          workerRef.current = null;
          resolve();
        } else if (msg.type === "error") {
          setStatus("error");
          setError(msg.message || "Erreur inconnue");
          worker.terminate();
          workerRef.current = null;
          reject(new Error(msg.message));
        }
      };

      worker.onerror = (err) => {
        setStatus("error");
        setError(err.message || "Erreur du convertisseur");
        worker.terminate();
        workerRef.current = null;
        reject(err);
      };

      worker.postMessage({ type: "start", url, filename });
    });
  }, [reset]);

  return { download, status, progress, label, error, reset };
}
