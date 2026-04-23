import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Play, Pause, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MediaRecorderField } from "@/components/media/MediaRecorderField";
import { IntroLibraryDialog } from "@/components/project/IntroLibraryDialog";
import { IntroFormatPicker, type IntroFormat } from "@/components/library/IntroFormatPicker";

export type IntroMode = IntroFormat;

interface StepIntroProps {
  introEnabled: boolean;
  setIntroEnabled: (v: boolean) => void;
  introMode: IntroMode;
  setIntroMode: (m: IntroMode) => void;
  introText: string;
  setIntroText: (t: string) => void;

  introAudioPreviewUrl: string | null;
  setIntroAudioBlob: (b: Blob | null) => void;
  setIntroAudioPreviewUrl: (u: string | null) => void;

  introVideoPreviewUrl: string | null;
  setIntroVideoFile: (f: File | null) => void;
  setIntroVideoPreviewUrl: (u: string | null) => void;

  ttsVoiceId: string;
  avatarPreview: string | null;
  aiPersonaName: string;
}


export function StepIntro({
  introEnabled,
  setIntroEnabled,
  introMode,
  setIntroMode,
  introText,
  setIntroText,
  introAudioPreviewUrl,
  setIntroAudioBlob,
  setIntroAudioPreviewUrl,
  introVideoPreviewUrl,
  setIntroVideoFile,
  setIntroVideoPreviewUrl,
  ttsVoiceId,
  avatarPreview,
  aiPersonaName,
}: StepIntroProps) {
  const { toast } = useToast();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [playing, setPlaying] = useState(false);

  const handlePreviewTts = async () => {
    const text = introText.trim();
    if (!text) {
      toast({ title: "Saisissez d'abord un texte à prévisualiser.", variant: "destructive" });
      return;
    }
    setPreviewing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-elevenlabs`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, voiceId: ttsVoiceId, preview: true }),
      });
      const ct = res.headers.get("Content-Type") || "";
      if (!ct.includes("audio")) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.reason || "Lecture impossible");
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(objectUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setPlaying(false);
        URL.revokeObjectURL(objectUrl);
      };
      audio.onpause = () => setPlaying(false);
      audio.onplay = () => setPlaying(true);
      await audio.play();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur";
      toast({ title: "Prévisualisation impossible", description: msg, variant: "destructive" });
    } finally {
      setPreviewing(false);
    }
  };

  const stopPreview = () => {
    audioRef.current?.pause();
    setPlaying(false);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label className="text-base font-medium">Diffuser une intro avant les questions</Label>
            <p className="text-sm text-muted-foreground">
              L'intro est le premier contact entre votre entreprise et le candidat. Elle permet de présenter le poste,
              l'équipe et de mettre le candidat à l'aise avant les questions.
            </p>
          </div>
          <Switch checked={introEnabled} onCheckedChange={setIntroEnabled} />
        </div>
      </div>

      {introEnabled && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-sm font-medium">Format de l'intro</Label>
              <IntroLibraryDialog
                type={introMode}
                onSelect={(item) => {
                  if (introMode === "text" || introMode === "tts") {
                    setIntroText(item.intro_text || "");
                  } else if (introMode === "audio") {
                    setIntroAudioBlob(null);
                    setIntroAudioPreviewUrl(item.audio_url);
                  } else if (introMode === "video") {
                    setIntroVideoFile(null);
                    setIntroVideoPreviewUrl(item.video_url);
                  }
                }}
              />
            </div>
            <IntroFormatPicker value={introMode} onChange={setIntroMode} />
          </div>

          <div className="rounded-lg border border-border bg-card p-5 space-y-4">
            {introMode === "text" && (
              <div className="space-y-2">
                <Label>Message à afficher</Label>
                <Textarea
                  rows={6}
                  placeholder="Bonjour et bienvenue. Voici quelques mots avant de commencer…"
                  value={introText}
                  onChange={(e) => setIntroText(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Le candidat verra ce texte avant de démarrer. Soignez le ton.
                </p>
              </div>
            )}

            {introMode === "tts" && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {avatarPreview && (
                    <img
                      src={avatarPreview}
                      alt={aiPersonaName}
                      className="h-12 w-12 rounded-full object-cover object-top border border-border"
                    />
                  )}
                  <div className="text-xs text-muted-foreground">
                    Lu par <span className="font-medium text-foreground">{aiPersonaName || "votre IA"}</span> avec la
                    voix configurée à l'étape précédente.
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Texte à lire</Label>
                  <Textarea
                    rows={6}
                    placeholder="Bonjour, je suis ravi de vous recevoir aujourd'hui…"
                    value={introText}
                    onChange={(e) => setIntroText(e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={playing ? stopPreview : handlePreviewTts}
                  disabled={previewing}
                >
                  {previewing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Génération…
                    </>
                  ) : playing ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" /> Stop
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" /> Prévisualiser la lecture
                    </>
                  )}
                </Button>
              </div>
            )}

            {introMode === "audio" && (
              <MediaRecorderField
                type="audio"
                label="Message vocal d'introduction"
                description="Enregistrez ou importez un message qui sera lu au candidat avant la session."
                existingUrl={introAudioPreviewUrl}
                onMediaReady={(blob, previewUrl) => {
                  setIntroAudioBlob(blob);
                  setIntroAudioPreviewUrl(previewUrl);
                }}
                onClear={() => {
                  setIntroAudioBlob(null);
                  setIntroAudioPreviewUrl(null);
                }}
              />
            )}

            {introMode === "video" && (
              <MediaRecorderField
                type="video"
                label="Vidéo de présentation"
                description="Enregistrez ou importez une vidéo qui sera montrée au candidat avant la session."
                existingUrl={introVideoPreviewUrl}
                onMediaReady={(blob, previewUrl) => {
                  const file =
                    blob instanceof File
                      ? blob
                      : new File([blob], "intro-video.webm", { type: blob.type || "video/webm" });
                  setIntroVideoFile(file);
                  setIntroVideoPreviewUrl(previewUrl);
                }}
                onClear={() => {
                  setIntroVideoFile(null);
                  setIntroVideoPreviewUrl(null);
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
