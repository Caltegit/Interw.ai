import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Video, Square, Trash2, Play, Pause, Upload } from "lucide-react";

interface IntroVideoRecorderProps {
  onVideoReady?: (video: { file: File | null; previewUrl: string | null }) => void;
  existingUrl?: string | null;
}

export function IntroVideoRecorder({ onVideoReady, existingUrl = null }: IntroVideoRecorderProps) {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(existingUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const previewRef = useRef<HTMLVideoElement | null>(null);

  // Once isRecording becomes true and the preview element mounts, attach the stream
  useEffect(() => {
    if (isRecording && previewRef.current && streamRef.current) {
      previewRef.current.srcObject = streamRef.current;
      previewRef.current.play().catch(() => {});
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (previewRef.current) previewRef.current.srcObject = null;

        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const file = new File([blob], "intro-video.webm", { type: "video/webm" });
        const previewUrl = URL.createObjectURL(blob);
        setVideoFile(file);
        setVideoUrl(previewUrl);
        onVideoReady?.({ file, previewUrl });
      };

      mediaRecorder.start(500);
      // Set recording AFTER stream is ready — the useEffect will attach srcObject once the element mounts
      setIsRecording(true);
    } catch {
      toast({ title: "Erreur", description: "Impossible d'accéder à la caméra.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast({ title: "Format invalide", description: "Veuillez sélectionner un fichier vidéo.", variant: "destructive" });
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux", description: "La vidéo ne doit pas dépasser 100 Mo.", variant: "destructive" });
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoUrl(previewUrl);
    onVideoReady?.({ file, previewUrl });
  };

  const deleteVideo = () => {
    if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setVideoFile(null);
    setIsPlaying(false);
    onVideoReady?.({ file: null, previewUrl: null });
    toast({ title: "Vidéo supprimée" });
  };

  const togglePlay = async () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        await videoRef.current.play();
        setIsPlaying(true);
      } catch {
        toast({ title: "Lecture impossible", variant: "destructive" });
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>Vidéo de présentation (optionnel)</Label>
        <p className="text-xs text-muted-foreground">
          Enregistrez ou importez une vidéo qui sera montrée au candidat avant le début de l'entretien.
        </p>
      </div>

      {isRecording && (
        <div className="space-y-2">
          <video
            ref={previewRef}
            muted
            autoPlay
            playsInline
            className="w-full max-w-md rounded-lg border border-border bg-black"
            style={{ minHeight: "240px" }}
          />
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-destructive">
              <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
              Enregistrement...
            </span>
            <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
              <Square className="mr-1 h-4 w-4" /> Arrêter
            </Button>
          </div>
        </div>
      )}

      {videoUrl && !isRecording && (
        <div className="space-y-2">
          <video
            ref={videoRef}
            src={videoUrl}
            onEnded={() => setIsPlaying(false)}
            playsInline
            className="w-full max-w-md rounded-lg border border-border"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={togglePlay}>
              {isPlaying ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
              {isPlaying ? "Pause" : "Lecture"}
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={deleteVideo}>
              <Trash2 className="mr-1 h-4 w-4" /> Supprimer
            </Button>
          </div>
        </div>
      )}

      {!videoUrl && !isRecording && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={startRecording}>
            <Video className="mr-1 h-4 w-4" /> Enregistrer
          </Button>
          <label>
            <Button type="button" variant="outline" size="sm" asChild>
              <span>
                <Upload className="mr-1 h-4 w-4" /> Importer un fichier
              </span>
            </Button>
            <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
          </label>
        </div>
      )}

      {videoFile && (
        <p className="text-xs text-muted-foreground">
          Cette vidéo sera attachée automatiquement quand vous créerez le projet.
        </p>
      )}
    </div>
  );
}
