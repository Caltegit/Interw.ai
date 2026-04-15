import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, projectContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Tu es ${projectContext.aiPersonaName}, recruteuse IA pour le poste "${projectContext.jobTitle}".

Questions prévues :
${projectContext.questions.map((q: any, i: number) => `${i + 1}. [${q.mediaType === "video" ? "VIDÉO" : q.mediaType === "audio" ? "AUDIO" : "TEXTE"}] ${q.content}`).join("\n")}

Règles STRICTES :
- Sois TRÈS CONCISE : maximum 1 phrase de transition avant la question suivante. Pas de longs commentaires.
- Pose les questions une par une dans l'ordre
- Après la réponse du candidat : un simple "Merci" ou "D'accord" suffit, puis enchaîne directement la question suivante
- **IMPORTANT** : Si la question suivante est de type AUDIO ou VIDÉO, NE RÉPÈTE PAS le contenu de la question. Dis seulement une courte transition comme "Écoutez la question suivante" ou "Regardez la question suivante". Le média sera joué automatiquement.
- Si la question suivante est de type TEXTE, pose-la normalement dans ta réponse.
- Relance uniquement si la réponse est vraiment trop courte (1 mot)
- Professionnelle mais directe, pas de bavardage
- En français
- Quand toutes les questions sont posées, remercie brièvement et indique que l'entretien est terminé
- N'invente PAS de questions hors liste
- Question actuelle : ${projectContext.currentQuestionNumber}/${projectContext.totalQuestions}`;
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, veuillez réessayer." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur IA" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const aiMessage = data.choices?.[0]?.message?.content || "Désolé, je n'ai pas pu générer de réponse.";

    return new Response(JSON.stringify({ message: aiMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-conversation-turn error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
