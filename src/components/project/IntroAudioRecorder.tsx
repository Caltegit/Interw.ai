import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mic, Square, Trash2, Play, Pause, Upload } from "lucide-react";
import { MicLevelMeter } from "./MicLevelMeter";

interface IntroAudioRecorderProps {
  projectId?: string;
  existingUrl?: string | null;
  onUploaded?: (url: string | null) => void;
  onAudioReady?: (audio: { blob: Blob | null; previewUrl: string | null }) => void;
}

export function IntroAudioRecorder({
  projectId,
  existingUrl = null,
  onUploaded,
  onAudioReady,
}: IntroAudioRecorderProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const isPersistedMode = Boolean(projectId);

  useEffect(() => {
    setAudioUrl(existingUrl);
  }, [existingUrl]);

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setActiveStream(stream);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setActiveStream(null);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const previewUrl = URL.createObjectURL(blob);
        setRecordedBlob(blob);
        setAudioUrl(previewUrl);
        onAudioReady?.({ blob, previewUrl });
      };

      mediaRecorder.start(500);
      setIsRecording(true);
      setElapsed(0);
      timerRef.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch {
      toast({ title: "Erreur", description: "Impossible d'accéder au micro.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const uploadAudio = async () => {
    if (!recordedBlob || !projectId) return;

    setUploading(true);
    try {
      const fileName = `intro/${projectId}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(fileName, recordedBlob, { contentType: "audio/webm", upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("media").getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;

      const { error: updateError } = await supabase
        .from("projects")
        .update({ intro_audio_url: publicUrl } as never)
        .eq("id", projectId);

      if (updateError) throw updateError;

      setAudioUrl(publicUrl);
      setRecordedBlob(null);
      onUploaded?.(publicUrl);
      onAudioReady?.({ blob: null, previewUrl: publicUrl });
      toast({ title: "Message vocal enregistré !" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteAudio = async () => {
    try {
      if (projectId) {
        await supabase.storage.from("media").remove([`intro/${projectId}.webm`]);
        await supabase.from("projects").update({ intro_audio_url: null } as never).eq("id", projectId);
      }

      if (audioUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(audioUrl);
      }

      setAudioUrl(null);
      setRecordedBlob(null);
      setIsPlaying(false);
      onUploaded?.(null);
      onAudioReady?.({ blob: null, previewUrl: null });
      toast({ title: "Message vocal supprimé" });
    } catch {
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audioRef.current.play();
      setIsPlaying(true);
    } catch {
      toast({ title: "Lecture impossible", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Message vocal d'introduction (optionnel)</Label>
        <p className="text-xs text-muted-foreground">
          Enregistrez un message qui sera lu au candidat avant le début de la session.
        </p>
      </div>

      {audioUrl && !isRecording && (
        <div className="flex flex-wrap items-center gap-2">
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
          <Button type="button" variant="outline" size="sm" onClick={togglePlay}>
            {isPlaying ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
            {isPlaying ? "Pause" : "Écouter"}
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={deleteAudio}>
            <Trash2 className="mr-1 h-4 w-4" /> Supprimer
          </Button>
        </div>
      )}

      {!audioUrl && !isRecording && (
        <Button type="button" variant="outline" size="sm" onClick={startRecording}>
          <Mic className="mr-1 h-4 w-4" /> Enregistrer un message
        </Button>
      )}

      {isRecording && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <span className="flex items-center gap-2 text-sm text-destructive">
            <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
            Enregistrement
          </span>
          <span className="text-sm tabular-nums text-muted-foreground">{formatTime(elapsed)}</span>
          <MicLevelMeter stream={activeStream} />
          <Button type="button" variant="destructive" size="sm" onClick={stopRecording} className="ml-auto">
            <Square className="mr-1 h-4 w-4" /> Arrêter
          </Button>
        </div>
      )}

      {isPersistedMode && recordedBlob && !uploading && (
        <Button type="button" size="sm" onClick={uploadAudio}>
          <Upload className="mr-1 h-4 w-4" /> Sauvegarder le message
        </Button>
      )}

      {!isPersistedMode && recordedBlob && (
        <p className="text-xs text-muted-foreground">
          Ce message sera attaché automatiquement quand vous créerez le projet.
        </p>
      )}

      {uploading && <span className="text-sm text-muted-foreground">Téléversement en cours...</span>}
    </div>
  );
}
