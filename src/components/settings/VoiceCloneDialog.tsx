import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Mic, Square, Play, Pause, Loader2, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SAMPLE_TEXT = `Bonjour, je m'appelle [votre prénom]. Je teste aujourd'hui le clonage de voix sur la plateforme Interw.ai. Pour obtenir un résultat naturel, je vais lire ce paragraphe à voix haute, calmement, dans un environnement silencieux. La technologie d'intelligence artificielle analyse le timbre, le rythme et l'intonation de ma voix afin de pouvoir la reproduire fidèlement. Je veille à articuler clairement, à respirer normalement, et à varier légèrement mon ton pour transmettre toute la richesse de mon élocution. Voilà, l'enregistrement touche à sa fin et la voix est désormais prête à être analysée.`;

const MIN_SECONDS = 30;
const MAX_SECONDS = 180;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultName: string;
  onCloned: (voiceId: string, name: string) => void;
}

export function VoiceCloneDialog({ open, onOpenChange, defaultName, onCloned }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState(defaultName);
  const [consent, setConsent] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (open) setName(defaultName);
  }, [open, defaultName]);

  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const reset = () => {
    setBlob(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setSeconds(0);
    setPlaying(false);
  };

  const start = async () => {
    try {
      reset();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const b = new Blob(chunksRef.current, { type: mime });
        setBlob(b);
        setAudioUrl(URL.createObjectURL(b));
        stopStream();
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        setSeconds((s) => {
          if (s + 1 >= MAX_SECONDS) {
            stop();
            return MAX_SECONDS;
          }
          return s + 1;
        });
      }, 1000);
    } catch (e: any) {
      toast({ title: "Micro inaccessible", description: e.message, variant: "destructive" });
    }
  };

  const stop = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
    setRecording(false);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  const submit = async () => {
    if (!blob) return;
    if (seconds < MIN_SECONDS) {
      toast({ title: `Enregistrement trop court (min ${MIN_SECONDS}s)`, variant: "destructive" });
      return;
    }
    if (!name.trim()) {
      toast({ title: "Nom requis", variant: "destructive" });
      return;
    }
    if (!consent) {
      toast({ title: "Vous devez accepter le consentement", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("audio", blob, "sample.webm");
      fd.append("name", name.trim());
      fd.append("consent", "true");
      const { data, error } = await supabase.functions.invoke("clone-voice", { body: fd });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const voiceId = (data as any)?.voice_id;
      if (!voiceId) throw new Error("Réponse invalide");
      toast({ title: "Voix clonée !" });
      onCloned(voiceId, name.trim());
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast({ title: "Échec du clonage", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          stop();
          reset();
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Cloner ma voix</DialogTitle>
          <DialogDescription>
            Lisez le texte ci-dessous à voix haute pendant au moins {MIN_SECONDS} secondes,
            dans un endroit calme.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm leading-relaxed max-h-40 overflow-auto">
            {SAMPLE_TEXT}
          </div>

          <div>
            <Label>Nom de la voix</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>

          <div className="flex items-center gap-3">
            {!recording && !blob && (
              <Button onClick={start} size="sm">
                <Mic className="mr-2 h-4 w-4" /> Démarrer l'enregistrement
              </Button>
            )}
            {recording && (
              <Button onClick={stop} size="sm" variant="destructive">
                <Square className="mr-2 h-4 w-4" /> Arrêter
              </Button>
            )}
            {blob && !recording && (
              <>
                <Button onClick={togglePlay} size="sm" variant="outline">
                  {playing ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {playing ? "Pause" : "Écouter"}
                </Button>
                <Button onClick={start} size="sm" variant="ghost">
                  <RotateCcw className="mr-2 h-4 w-4" /> Recommencer
                </Button>
              </>
            )}
            <span className={`text-sm tabular-nums ${recording ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {fmt(seconds)} / {fmt(MAX_SECONDS)}
            </span>
          </div>

          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setPlaying(false)}
              className="hidden"
            />
          )}

          <div className="flex items-start gap-2 rounded-md border p-3">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
            />
            <Label htmlFor="consent" className="text-sm font-normal leading-snug cursor-pointer">
              J'accepte que ma voix soit analysée et stockée par ElevenLabs afin d'être
              utilisée comme voix de synthèse dans mes entretiens. Je peux la supprimer à
              tout moment.
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={!blob || submitting || seconds < MIN_SECONDS}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Créer ma voix
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
