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

    const questionsList = Array.isArray(projectContext.questions) ? projectContext.questions : [];
    const currentIdx = Math.max(
      0,
      Math.min((projectContext.currentQuestionNumber ?? 1) - 1, questionsList.length - 1),
    );
    const currentQ = questionsList[currentIdx] ?? {};
    const rawLevel = currentQ.relanceLevel;
    const relanceLevel: "light" | "medium" | "deep" =
      rawLevel === "light" || rawLevel === "deep" ? rawLevel : "medium";

    const relanceRules: Record<typeof relanceLevel, string> = {
      light:
        "- NIVEAU DE RELANCE (question actuelle) : LÉGER. Ne pose AUCUNE relance. Enchaîne directement la question suivante après un bref acquiescement.\n- Pas de reformulation.",
      medium:
        "- NIVEAU DE RELANCE (question actuelle) : MOYEN. Si la réponse du candidat est floue, vague ou très courte (moins de 2 phrases), pose UNE seule relance ciblée pour clarifier ou obtenir un exemple concret (ex : « Pouvez-vous donner un exemple concret ? »). Sinon, n'insiste pas.\n- Avant la question suivante, fais une COURTE reformulation de ce que le candidat vient de dire (1 phrase, ex : « Si je comprends bien, vous avez… »).",
      deep:
        "- NIVEAU DE RELANCE (question actuelle) : APPROFONDI. Tu peux poser jusqu'à 2 relances par question pour creuser un mot-clé important mentionné par le candidat ou obtenir des détails concrets (chiffres, exemples, contexte). Reste pertinente, ne creuse pas dans le vide.\n- Avant la question suivante, fais une COURTE reformulation (1 phrase) de la réponse du candidat.\n- Tu peux référencer un point évoqué plus tôt dans l'entretien si c'est pertinent (« Tout à l'heure vous parliez de X… »).",
    };

    const systemPrompt = `Tu es ${projectContext.aiPersonaName}, recruteuse IA pour le poste "${projectContext.jobTitle}".

Questions prévues (chacune a son propre niveau de relance) :
${questionsList.map((q: any, i: number) => {
  const lvl = q.relanceLevel === "light" || q.relanceLevel === "deep" ? q.relanceLevel : "medium";
  const lvlLabel = lvl === "light" ? "léger" : lvl === "deep" ? "approfondi" : "moyen";
  const mt = q.mediaType === "video" ? "VIDÉO" : q.mediaType === "audio" ? "AUDIO" : "TEXTE";
  return `${i + 1}. [${mt}] (relance ${lvlLabel}) ${q.content}`;
}).join("\n")}

Règles de comportement pour LA QUESTION ACTUELLE :
${relanceRules[relanceLevel]}
- Varie tes acquiescements de façon naturelle : « Intéressant », « Ok je vois », « Merci pour cet exemple », « D'accord », plutôt que de toujours dire « Merci ».
- Si la réponse du candidat fait moins de 5 mots ou semble hésitante, propose-lui doucement : « Prenez votre temps, voulez-vous que je reformule la question ? ».
- Pose les questions une par une dans l'ordre prévu. Une seule à la fois.
- **IMPORTANT** : Si la question suivante est de type AUDIO ou VIDÉO, NE RÉPÈTE PAS son contenu. Dis seulement une courte transition comme « Écoutez la question suivante » ou « Regardez la question suivante ». Le média sera joué automatiquement.
- Si la question suivante est de type TEXTE, pose-la normalement dans ta réponse.
- Quand tu passes à la question suivante, adapte ton comportement de relance au niveau indiqué pour CETTE nouvelle question.
- Reste professionnelle, chaleureuse, jamais bavarde. Maximum 2-3 phrases courtes par tour.
- Réponds toujours en français.
- Quand toutes les questions sont posées, remercie brièvement le candidat et indique que l'entretien est terminé.
- N'invente JAMAIS de questions hors de la liste fournie.
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
