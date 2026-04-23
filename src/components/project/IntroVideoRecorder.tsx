import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Video, Trash2, Play, Pause, Upload, RotateCcw } from "lucide-react";
import { VideoRecorderPanel } from "./VideoRecorderPanel";

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
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setVideoUrl(existingUrl);
  }, [existingUrl]);

  const handleRecorderComplete = ({ blob, previewUrl }: { blob: Blob; previewUrl: string }) => {
    const file = new File([blob], "intro-video.webm", { type: "video/webm" });
    setVideoFile(file);
    setVideoUrl(previewUrl);
    setIsRecording(false);
    onVideoReady?.({ file, previewUrl });
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

  const retake = () => {
    if (videoUrl?.startsWith("blob:")) URL.revokeObjectURL(videoUrl);
    setVideoUrl(null);
    setVideoFile(null);
    setIsPlaying(false);
    onVideoReady?.({ file: null, previewUrl: null });
    setIsRecording(true);
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
          Enregistrez ou importez une vidéo qui sera montrée au candidat avant le début de la session.
        </p>
      </div>

      {isRecording && (
        <VideoRecorderPanel
          onComplete={handleRecorderComplete}
          onCancel={() => setIsRecording(false)}
        />
      )}

      {videoUrl && !isRecording && (
        <div className="space-y-2">
          <video
            ref={videoRef}
            src={videoUrl}
            onEnded={() => setIsPlaying(false)}
            playsInline
            className="w-full max-w-md rounded-lg border border-border aspect-video object-cover bg-black"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={togglePlay}>
              {isPlaying ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
              {isPlaying ? "Pause" : "Lecture"}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={retake}>
              <RotateCcw className="mr-1 h-4 w-4" /> Refaire la prise
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={deleteVideo}>
              <Trash2 className="mr-1 h-4 w-4" /> Supprimer
            </Button>
          </div>
        </div>
      )}

      {!videoUrl && !isRecording && (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setIsRecording(true)}>
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
