import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mic, Video, Square, Trash2, Play, Pause, Upload } from "lucide-react";

interface QuestionMediaRecorderProps {
  mode: "audio" | "video";
  audioBlob: Blob | null;
  audioPreviewUrl: string | null;
  videoBlob: Blob | null;
  videoPreviewUrl: string | null;
  onAudioChange: (data: { blob: Blob | null; previewUrl: string | null }) => void;
  onVideoChange: (data: { blob: Blob | null; previewUrl: string | null }) => void;
}

type RecordingType = "audio" | "video" | null;

export function QuestionMediaRecorder({
  audioBlob,
  audioPreviewUrl,
  videoBlob,
  videoPreviewUrl,
  onAudioChange,
  onVideoChange,
}: QuestionMediaRecorderProps) {
  const { toast } = useToast();
  const [recording, setRecording] = useState<RecordingType>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewStreamRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (recording === "video" && previewStreamRef.current && streamRef.current) {
      previewStreamRef.current.srcObject = streamRef.current;
      previewStreamRef.current.play().catch(() => {});
    }
  }, [recording]);

  const startRecording = async (type: "audio" | "video") => {
    try {
      const constraints = type === "audio" ? { audio: true } : { audio: true, video: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const mimeType = type === "audio" ? "audio/webm" : "video/webm";
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (previewStreamRef.current) previewStreamRef.current.srcObject = null;

        const blob = new Blob(chunksRef.current, { type: mimeType });
        const previewUrl = URL.createObjectURL(blob);

        if (type === "audio") {
          onAudioChange({ blob, previewUrl });
        } else {
          onVideoChange({ blob, previewUrl });
        }
      };

      mediaRecorder.start(500);
      setRecording(type);
    } catch {
      toast({
        title: "Erreur",
        description: type === "audio" ? "Impossible d'accéder au micro." : "Impossible d'accéder à la caméra.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(null);
  };

  const deleteMedia = (type: "audio" | "video") => {
    if (type === "audio") {
      if (audioPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(audioPreviewUrl);
      onAudioChange({ blob: null, previewUrl: null });
    } else {
      if (videoPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(videoPreviewUrl);
      onVideoChange({ blob: null, previewUrl: null });
    }
    setIsPlaying(false);
  };

  const togglePlayAudio = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      await audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const togglePlayVideo = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      await videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const hasAudio = Boolean(audioPreviewUrl);
  const hasVideo = Boolean(videoPreviewUrl);
  const hasMedia = hasAudio || hasVideo;

  if (recording === "video") {
    return (
      <div className="space-y-2">
        <video
          ref={previewStreamRef}
          muted
          autoPlay
          playsInline
          className="w-full max-w-xs rounded-lg border border-border bg-black"
          style={{ minHeight: "160px" }}
        />
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs text-destructive">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
            Enregistrement vidéo...
          </span>
          <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
            <Square className="mr-1 h-3 w-3" /> Stop
          </Button>
        </div>
      </div>
    );
  }

  if (recording === "audio") {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-xs text-destructive">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
          Enregistrement audio...
        </span>
        <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
          <Square className="mr-1 h-3 w-3" /> Stop
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {hasAudio && (
        <div className="flex items-center gap-2">
          <audio ref={audioRef} src={audioPreviewUrl!} onEnded={() => setIsPlaying(false)} className="hidden" />
          <span className="text-xs text-muted-foreground">🎤 Audio</span>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={togglePlayAudio}>
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => deleteMedia("audio")}>
            <Trash2 className="h-3 w-3 text-destructive" />
          </Button>
        </div>
      )}

      {hasVideo && (
        <div className="space-y-1">
          <video
            ref={videoRef}
            src={videoPreviewUrl!}
            onEnded={() => setIsPlaying(false)}
            playsInline
            className="w-full max-w-xs rounded-lg border border-border"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">🎬 Vidéo</span>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={togglePlayVideo}>
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => deleteMedia("video")}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>
      )}

      {!hasMedia && (
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => startRecording("audio")}>
            <Mic className="mr-1 h-3 w-3" /> Audio
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => startRecording("video")}>
            <Video className="mr-1 h-3 w-3" /> Vidéo
          </Button>
        </div>
      )}
    </div>
  );
}
