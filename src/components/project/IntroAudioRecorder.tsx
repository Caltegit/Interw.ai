import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mic, Square, Trash2, Play, Pause, Upload } from "lucide-react";

interface IntroAudioRecorderProps {
  projectId: string;
  existingUrl: string | null;
  onUploaded: (url: string | null) => void;
}

export function IntroAudioRecorder({ projectId, existingUrl, onUploaded }: IntroAudioRecorderProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

  useEffect(() => {
    setAudioUrl(existingUrl);
  }, [existingUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };

      mediaRecorder.start(500);
      setIsRecording(true);
    } catch {
      toast({ title: "Erreur", description: "Impossible d'accéder au micro.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const uploadAudio = async () => {
    if (!recordedBlob) return;
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
        .update({ intro_audio_url: publicUrl } as any)
        .eq("id", projectId);

      if (updateError) throw updateError;

      setAudioUrl(publicUrl);
      setRecordedBlob(null);
      onUploaded(publicUrl);
      toast({ title: "Message vocal enregistré !" });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteAudio = async () => {
    try {
      await supabase.storage.from("media").remove([`intro/${projectId}.webm`]);
      await supabase.from("projects").update({ intro_audio_url: null } as any).eq("id", projectId);
      setAudioUrl(null);
      setRecordedBlob(null);
      onUploaded(null);
      toast({ title: "Message vocal supprimé" });
    } catch {
      toast({ title: "Erreur lors de la suppression", variant: "destructive" });
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="space-y-3">
      <Label>Message vocal d'introduction (optionnel)</Label>
      <p className="text-xs text-muted-foreground">
        Enregistrez un message qui sera joué au candidat avant le début de l'entretien.
      </p>

      {audioUrl && (
        <div className="flex items-center gap-2">
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
          <Button variant="outline" size="sm" onClick={togglePlay}>
            {isPlaying ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            {isPlaying ? "Pause" : "Écouter"}
          </Button>
          <Button variant="destructive" size="sm" onClick={deleteAudio}>
            <Trash2 className="h-4 w-4 mr-1" /> Supprimer
          </Button>
        </div>
      )}

      {!audioUrl && !isRecording && (
        <Button variant="outline" size="sm" onClick={startRecording}>
          <Mic className="h-4 w-4 mr-1" /> Enregistrer un message
        </Button>
      )}

      {isRecording && (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm text-destructive">
            <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
            Enregistrement...
          </span>
          <Button variant="destructive" size="sm" onClick={stopRecording}>
            <Square className="h-4 w-4 mr-1" /> Arrêter
          </Button>
        </div>
      )}

      {recordedBlob && !uploading && (
        <Button size="sm" onClick={uploadAudio}>
          <Upload className="h-4 w-4 mr-1" /> Sauvegarder le message
        </Button>
      )}

      {uploading && (
        <span className="text-sm text-muted-foreground">Upload en cours...</span>
      )}
    </div>
  );
}
