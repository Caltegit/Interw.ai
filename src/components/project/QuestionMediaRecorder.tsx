import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mic, Video, Square, Trash2, Play, Pause, RotateCcw } from "lucide-react";
import { VideoRecorderPanel } from "./VideoRecorderPanel";
import { MicLevelMeter } from "./MicLevelMeter";

interface QuestionMediaRecorderProps {
  mode: "audio" | "video";
  audioBlob: Blob | null;
  audioPreviewUrl: string | null;
  videoBlob: Blob | null;
  videoPreviewUrl: string | null;
  onAudioChange: (data: { blob: Blob | null; previewUrl: string | null }) => void;
  onVideoChange: (data: { blob: Blob | null; previewUrl: string | null }) => void;
}

export function QuestionMediaRecorder({
  mode,
  audioBlob,
  audioPreviewUrl,
  videoBlob,
  videoPreviewUrl,
  onAudioChange,
  onVideoChange,
}: QuestionMediaRecorderProps) {
  const { toast } = useToast();
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [recordingVideoOpen, setRecordingVideoOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      activeStream?.getTracks().forEach((t) => t.stop());
    };
  }, [activeStream]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setActiveStream(stream);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        setActiveStream(null);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const previewUrl = URL.createObjectURL(blob);
        onAudioChange({ blob, previewUrl });
      };

      mediaRecorder.start(500);
      setRecordingAudio(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible d'accéder au micro.",
        variant: "destructive",
      });
    }
  };

  const stopAudioRecording = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setRecordingAudio(false);
  };

  const handleVideoComplete = ({ blob, previewUrl }: { blob: Blob; previewUrl: string }) => {
    onVideoChange({ blob, previewUrl });
    setRecordingVideoOpen(false);
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

  const retake = (type: "audio" | "video") => {
    deleteMedia(type);
    if (type === "audio") {
      startAudioRecording();
    } else {
      setRecordingVideoOpen(true);
    }
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

  if (recordingVideoOpen) {
    return (
      <VideoRecorderPanel
        onComplete={handleVideoComplete}
        onCancel={() => setRecordingVideoOpen(false)}
      />
    );
  }

  if (recordingAudio) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <span className="flex items-center gap-2 text-xs text-destructive">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" />
          Enregistrement audio
        </span>
        <span className="text-xs tabular-nums text-muted-foreground">{formatTime(elapsed)}</span>
        <MicLevelMeter stream={activeStream} segments={6} />
        <Button type="button" variant="destructive" size="sm" onClick={stopAudioRecording} className="ml-auto">
          <Square className="mr-1 h-3 w-3" /> Arrêter
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
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => retake("audio")}>
            <RotateCcw className="h-3 w-3" />
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
            className="w-full max-w-md rounded-lg border border-border aspect-video object-cover bg-black"
          />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">🎬 Vidéo</span>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={togglePlayVideo}>
              {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => retake("video")}>
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => deleteMedia("video")}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        </div>
      )}

      {!hasMedia && (
        <div className="flex items-center gap-1">
          {mode === "audio" && (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={startAudioRecording}>
              <Mic className="mr-1 h-3 w-3" /> Enregistrer audio
            </Button>
          )}
          {mode === "video" && (
            <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setRecordingVideoOpen(true)}>
              <Video className="mr-1 h-3 w-3" /> Enregistrer vidéo
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
