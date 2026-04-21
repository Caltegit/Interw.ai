import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Volume2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type VoiceGender = "female" | "male";

export const FEMALE_VOICE_DEFAULT_ID = "XB0fDUnXU5powFXDhCwa"; // Charlotte
export const MALE_VOICE_DEFAULT_ID = "JBFqnCBsd6RMkjVDRZzb"; // George

export const FEMALE_VOICES = [
  { id: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", description: "FR · douce, naturelle" },
  { id: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", description: "Polyvalente, posée" },
  { id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", description: "Claire, professionnelle" },
  { id: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", description: "Chaleureuse" },
  { id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", description: "Jeune, dynamique" },
  { id: "cgSgspJ2msm6clMCkdW9", name: "Jessica", description: "Expressive" },
  { id: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", description: "Sérieuse, claire" },
];

export const MALE_VOICES = [
  { id: "JBFqnCBsd6RMkjVDRZzb", name: "George", description: "Posée, professionnelle" },
  { id: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", description: "Dynamique" },
  { id: "nPczCjzI2devNBz1zQrb", name: "Brian", description: "Grave, sérieuse" },
  { id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", description: "Articulée" },
  { id: "bIHbv24MWmeRgasZH58o", name: "Will", description: "Naturelle" },
  { id: "cjVigY5qzO86Huf0OWal", name: "Eric", description: "Chaleureuse" },
  { id: "iP95p4xoKVk53GoZ742B", name: "Chris", description: "Décontractée" },
];

export function getDefaultVoiceForGender(gender: VoiceGender): string {
  return gender === "female" ? FEMALE_VOICE_DEFAULT_ID : MALE_VOICE_DEFAULT_ID;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gender: VoiceGender;
  initialVoiceId: string | null;
  personaName: string;
  onConfirm: (voiceId: string) => void;
  onCancel: () => void;
}

export function VoiceSelectorDialog({ open, onOpenChange, gender, initialVoiceId, personaName, onConfirm, onCancel }: Props) {
  const voices = gender === "female" ? FEMALE_VOICES : MALE_VOICES;
  const defaultId = getDefaultVoiceForGender(gender);
  const [selectedId, setSelectedId] = useState<string>(initialVoiceId || defaultId);
  const [testing, setTesting] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      // Si la voix actuelle n'appartient pas à ce genre, prendre la voix par défaut du genre
      const exists = voices.some((v) => v.id === initialVoiceId);
      setSelectedId(exists && initialVoiceId ? initialVoiceId : defaultId);
    }
  }, [open, gender, initialVoiceId, defaultId, voices]);

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopAudio();
  }, []);

  const handleTest = async () => {
    stopAudio();
    setTesting(true);
    try {
      const cleanName = (personaName || "votre interviewer").trim();
      const text = `Bonjour, je suis ${cleanName} et je suis ravi que vous choisissiez ma voix pour l'entretien.`;

      const { data: { session } } = await supabase.auth.getSession();
      const projectId = (import.meta as { env: { VITE_SUPABASE_PROJECT_ID: string } }).env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.functions.supabase.co/tts-elevenlabs`;

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ text, voiceId: selectedId, preview: true }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("audio")) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.reason || "Réponse non audio");
      }

      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setTesting(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        setTesting(false);
        URL.revokeObjectURL(audioUrl);
      };
      await audio.play();
    } catch (err) {
      console.error("[VoiceSelectorDialog] test failed", err);
      toast({
        title: "Test impossible",
        description: "Impossible de jouer un aperçu. Vérifiez que la clé ElevenLabs est valide.",
        variant: "destructive",
      });
      setTesting(false);
    }
  };

  const handleCancel = () => {
    stopAudio();
    setTesting(false);
    onCancel();
    onOpenChange(false);
  };

  const handleConfirm = () => {
    stopAudio();
    setTesting(false);
    onConfirm(selectedId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); else onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choisir la voix ElevenLabs</DialogTitle>
          <DialogDescription>
            Sélectionnez une voix {gender === "female" ? "féminine" : "masculine"} et écoutez un aperçu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Voix</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {voices.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    <span className="font-medium">{v.name}</span>
                    <span className="text-muted-foreground"> — {v.description}</span>
                    {v.id === defaultId && <span className="text-primary"> ✨</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button type="button" variant="outline" onClick={handleTest} disabled={testing} className="w-full">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Volume2 className="h-4 w-4" />}
            {testing ? "Lecture en cours…" : "Tester cette voix"}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>Annuler</Button>
          <Button onClick={handleConfirm}>Valider</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
