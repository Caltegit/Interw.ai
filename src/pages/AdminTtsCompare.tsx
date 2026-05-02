import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Play, Pause, RefreshCw, Eye, Trophy } from "lucide-react";

type Provider = "elevenlabs" | "openai" | "gemini";

interface VoiceCandidate {
  id: string;
  provider: Provider;
  label: string;
  description: string;
  // Coût pour 1000 caractères en euros
  pricePer1kChars: number;
  // Paramètre passé à l'API
  voiceParam: string;
  // Modèle (uniquement OpenAI)
  model?: string;
}

const CANDIDATES: VoiceCandidate[] = [
  {
    id: "el-charlotte",
    provider: "elevenlabs",
    label: "ElevenLabs — Charlotte FR",
    description: "Voix de référence actuelle (féminine, naturelle)",
    pricePer1kChars: 0.165,
    voiceParam: "XB0fDUnXU5powFXDhCwa",
  },
  {
    id: "oa-nova",
    provider: "openai",
    label: "OpenAI gpt-4o-mini-tts — Nova",
    description: "Féminine, claire, professionnelle",
    pricePer1kChars: 0.0055,
    voiceParam: "nova",
    model: "gpt-4o-mini-tts",
  },
  {
    id: "oa-shimmer",
    provider: "openai",
    label: "OpenAI gpt-4o-mini-tts — Shimmer",
    description: "Féminine, douce et chaleureuse",
    pricePer1kChars: 0.0055,
    voiceParam: "shimmer",
    model: "gpt-4o-mini-tts",
  },
  {
    id: "oa-onyx",
    provider: "openai",
    label: "OpenAI gpt-4o-mini-tts — Onyx",
    description: "Masculine, posée, autoritaire",
    pricePer1kChars: 0.0055,
    voiceParam: "onyx",
    model: "gpt-4o-mini-tts",
  },
  {
    id: "gem-kore",
    provider: "gemini",
    label: "Gemini TTS — Kore",
    description: "Féminine, posée, professionnelle",
    pricePer1kChars: 0.014,
    voiceParam: "Kore",
  },
  {
    id: "gem-charon",
    provider: "gemini",
    label: "Gemini TTS — Charon",
    description: "Masculine, calme, informative",
    pricePer1kChars: 0.014,
    voiceParam: "Charon",
  },
  {
    id: "gem-aoede",
    provider: "gemini",
    label: "Gemini TTS — Aoede",
    description: "Féminine, fluide, légère",
    pricePer1kChars: 0.014,
    voiceParam: "Aoede",
  },
];

interface AudioResult {
  candidateId: string;
  url: string | null;
  latencyMs: number | null;
  error: string | null;
  loading: boolean;
}

const DEFAULT_TEXT =
  "Bonjour, et merci d'avoir accepté cet entretien. Pour commencer, pourriez-vous vous présenter en quelques phrases et m'expliquer ce qui vous a attiré dans cette opportunité ?";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function AdminTtsCompare() {
  const { toast } = useToast();
  const [text, setText] = useState(DEFAULT_TEXT);
  const [results, setResults] = useState<Record<string, AudioResult>>({});
  const [order, setOrder] = useState<string[]>(() => shuffle(CANDIDATES.map((c) => c.id)));
  const [revealed, setRevealed] = useState(false);
  const [vote, setVote] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const candidatesById = useMemo(
    () => Object.fromEntries(CANDIDATES.map((c) => [c.id, c])),
    [],
  );

  const fetchAudio = async (cand: VoiceCandidate): Promise<AudioResult> => {
    const t0 = performance.now();
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Vous devez être connecté.");

      const fnName =
        cand.provider === "elevenlabs"
          ? "tts-elevenlabs"
          : cand.provider === "openai"
            ? "tts-openai"
            : "tts-gemini-direct";
      const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectRef}.supabase.co/functions/v1/${fnName}`;

      const body =
        cand.provider === "elevenlabs"
          ? { text, preview: true, voiceId: cand.voiceParam }
          : cand.provider === "openai"
            ? { text, voiceName: cand.voiceParam, model: cand.model }
            : { text, voiceName: cand.voiceParam };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      const contentType = res.headers.get("Content-Type") ?? "";
      if (!res.ok || !contentType.startsWith("audio/")) {
        const errBody = await res.text().catch(() => "");
        throw new Error(`Erreur ${res.status} : ${errBody.slice(0, 200) || "réponse non audio"}`);
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const latencyMs = Math.round(performance.now() - t0);
      return { candidateId: cand.id, url: objectUrl, latencyMs, error: null, loading: false };
    } catch (e) {
      return {
        candidateId: cand.id,
        url: null,
        latencyMs: null,
        error: e instanceof Error ? e.message : "Erreur inconnue",
        loading: false,
      };
    }
  };

  const generateAll = async () => {
    if (!text.trim()) {
      toast({ title: "Texte vide", description: "Saisissez un texte à synthétiser.", variant: "destructive" });
      return;
    }
    setGenerating(true);
    setRevealed(false);
    setVote(null);
    setOrder(shuffle(CANDIDATES.map((c) => c.id)));

    // Libère les anciens object URLs
    Object.values(results).forEach((r) => {
      if (r.url) URL.revokeObjectURL(r.url);
    });

    setResults(
      Object.fromEntries(
        CANDIDATES.map((c) => [
          c.id,
          { candidateId: c.id, url: null, latencyMs: null, error: null, loading: true } as AudioResult,
        ]),
      ),
    );

    const settled = await Promise.all(CANDIDATES.map(fetchAudio));
    setResults(Object.fromEntries(settled.map((r) => [r.candidateId, r])));
    setGenerating(false);

    const failures = settled.filter((r) => r.error);
    if (failures.length === 0) {
      toast({ title: "Génération terminée", description: "Écoutez les 4 voix et votez votre préférée." });
    } else if (failures.length < settled.length) {
      toast({
        title: "Génération partielle",
        description: `${failures.length} voix sur ${settled.length} ont échoué.`,
        variant: "destructive",
      });
    } else {
      toast({ title: "Échec", description: "Toutes les générations ont échoué.", variant: "destructive" });
    }
  };

  const togglePlay = (id: string) => {
    const audio = audioRefs.current[id];
    if (!audio) return;
    if (playingId === id) {
      audio.pause();
      setPlayingId(null);
      return;
    }
    // Stop tous les autres
    Object.entries(audioRefs.current).forEach(([k, a]) => {
      if (k !== id && a) {
        a.pause();
        a.currentTime = 0;
      }
    });
    audio.play().then(() => setPlayingId(id)).catch(() => setPlayingId(null));
  };

  const charCount = text.length;

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Comparaison de voix TTS</h1>
        <p className="text-muted-foreground">
          Test à l'aveugle — écoutez les voix sans connaître le fournisseur, votez votre préférée, puis révélez les résultats.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Texte à synthétiser</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Tapez le texte que la voix doit lire…"
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{charCount} caractères</span>
            <Button onClick={generateAll} disabled={generating || !text.trim()}>
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Génération…
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" /> Générer les 4 voix
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {order.length > 0 && Object.keys(results).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Écoute à l'aveugle</h2>
            {!revealed ? (
              <Button variant="outline" onClick={() => setRevealed(true)} disabled={!vote}>
                <Eye className="mr-2 h-4 w-4" /> Révéler les voix
              </Button>
            ) : (
              <Badge variant="secondary">Résultats révélés</Badge>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {order.map((id, idx) => {
              const cand = candidatesById[id];
              const r = results[id];
              const blindLabel = `Voix ${String.fromCharCode(65 + idx)}`;
              const isVoted = vote === id;
              const isWinnerReveal = revealed && isVoted;
              const costEuros = (charCount / 1000) * cand.pricePer1kChars;

              return (
                <Card
                  key={id}
                  className={`transition-all ${isVoted ? "ring-2 ring-primary" : ""} ${
                    isWinnerReveal ? "border-primary" : ""
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {isWinnerReveal && <Trophy className="h-5 w-5 text-primary" />}
                        {revealed ? cand.label : blindLabel}
                      </CardTitle>
                      {revealed && (
                        <Badge variant={cand.provider === "elevenlabs" ? "default" : "secondary"}>
                          {cand.provider === "elevenlabs" ? "ElevenLabs" : "OpenAI TTS"}
                        </Badge>
                      )}
                    </div>
                    {revealed && (
                      <p className="text-sm text-muted-foreground">{cand.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {r?.loading && (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Génération en cours…
                      </div>
                    )}

                    {r?.error && (
                      <p className="text-sm text-destructive">{r.error}</p>
                    )}

                    {r?.url && (
                      <>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => togglePlay(id)}>
                            {playingId === id ? (
                              <>
                                <Pause className="mr-2 h-4 w-4" /> Pause
                              </>
                            ) : (
                              <>
                                <Play className="mr-2 h-4 w-4" /> Écouter
                              </>
                            )}
                          </Button>
                          <audio
                            ref={(el) => { audioRefs.current[id] = el; }}
                            src={r.url}
                            onEnded={() => setPlayingId(null)}
                            controls
                            className="flex-1 h-9"
                          />
                        </div>

                        {revealed && (
                          <div className="flex flex-wrap gap-2 text-xs">
                            <Badge variant="outline">
                              Latence : {r.latencyMs} ms
                            </Badge>
                            <Badge variant="outline">
                              Coût : {costEuros.toFixed(4)} €
                            </Badge>
                            <Badge variant="outline">
                              {cand.pricePer1kChars.toFixed(3)} € / 1000 car.
                            </Badge>
                          </div>
                        )}

                        <Button
                          size="sm"
                          variant={isVoted ? "default" : "secondary"}
                          className="w-full"
                          onClick={() => setVote(id)}
                          disabled={revealed}
                        >
                          {isVoted ? "Votre choix" : "Je préfère celle-ci"}
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {revealed && vote && (
            <Card className="border-primary">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-2">Verdict</h3>
                <p className="text-sm text-muted-foreground">
                  Vous avez préféré <strong>{candidatesById[vote].label}</strong>.{" "}
                  {candidatesById[vote].provider === "openai" ? (
                    <>
                      Bonne nouvelle : OpenAI TTS coûte environ{" "}
                      <strong>
                        {(candidatesById["el-charlotte"].pricePer1kChars / candidatesById[vote].pricePer1kChars).toFixed(0)}× moins cher
                      </strong>{" "}
                      qu'ElevenLabs. Vous pouvez basculer sereinement.
                    </>
                  ) : (
                    <>
                      ElevenLabs reste votre référence. Vous gardez la qualité maximale au prix actuel.
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
