import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Action = "follow_up" | "next" | "end";

function fallbackParse(text: string): { action: Action; message: string } {
  // Try to extract a JSON object from the text
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      const obj = JSON.parse(match[0]);
      if (obj && typeof obj.message === "string") {
        const action: Action =
          obj.action === "follow_up" || obj.action === "end" ? obj.action : "next";
        return { action, message: obj.message };
      }
    } catch {}
  }
  return { action: "next", message: text.trim() || "Merci. Passons à la suite." };
}

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

    const followUpsAsked: number = Number(projectContext.followUpsAsked ?? 0);
    const baseMaxFollowUps: number = Math.max(
      0,
      Number(currentQ.maxFollowUps ?? (relanceLevel === "deep" ? 2 : relanceLevel === "medium" ? 1 : 0)),
    );
    // forceMaxFollowUps : override envoyé par le client en cas de réseau dégradé.
    // Si défini, plafonne maxFollowUps. Si === 0, force action = "next".
    const rawForce = projectContext.forceMaxFollowUps;
    const forceMaxFollowUps: number | null =
      typeof rawForce === "number" && Number.isFinite(rawForce) && rawForce >= 0
        ? Math.floor(rawForce)
        : null;
    const maxFollowUps: number =
      forceMaxFollowUps != null ? Math.min(baseMaxFollowUps, forceMaxFollowUps) : baseMaxFollowUps;
    const networkDisablesFollowUps = forceMaxFollowUps === 0;
    const isLastQuestion = currentIdx >= questionsList.length - 1;
    const canFollowUp =
      relanceLevel !== "light" &&
      !networkDisablesFollowUps &&
      followUpsAsked < maxFollowUps;

    // Last candidate message (for word-count heuristic, used in prompt context)
    const lastCandidate = [...messages].reverse().find((m: any) => m.role === "user");
    const lastCandidateText: string = (lastCandidate?.content ?? "").toString();
    const wordCount = lastCandidateText.trim().split(/\s+/).filter(Boolean).length;

    const nextQ = !isLastQuestion ? questionsList[currentIdx + 1] : null;
    const nextMt = nextQ?.mediaType === "video" ? "VIDÉO" : nextQ?.mediaType === "audio" ? "AUDIO" : nextQ ? "TEXTE" : null;

    const systemPrompt = `Tu es ${projectContext.aiPersonaName}, recruteuse IA pour le poste "${projectContext.jobTitle}".

CONTEXTE :
- Question actuelle : ${currentIdx + 1}/${questionsList.length}
- Niveau de relance : ${relanceLevel}
- Relances déjà posées sur cette question : ${followUpsAsked} / ${maxFollowUps} max
- Dernière réponse du candidat : ${wordCount} mots
- Dernière question posée : « ${currentQ.content ?? ""} »
${isLastQuestion ? "- C'est la DERNIÈRE question." : `- Question suivante : [${nextMt}] « ${nextQ?.content ?? ""} »`}

TA TÂCHE : décider si tu poses une RELANCE sur la question actuelle, ou si tu PASSES à la suite.

RÈGLES STRICTES :
1. Tu dois répondre UNIQUEMENT en JSON valide, format exact :
   {"action":"follow_up"|"next"|"end","message":"texte court à dire au candidat"}
2. Si niveau = "light" → action = "next" obligatoirement.
3. Si relances déjà posées >= max (${maxFollowUps}) → action = "next" obligatoirement.
4. Si la réponse fait moins de 15 mots OU contient des hésitations vagues (« je sais pas trop », « euh », « peut-être ») ET que tu peux encore relancer → action = "follow_up" recommandé.
5. Si la réponse est claire, complète et pertinente → action = "next".
6. Si c'est la DERNIÈRE question et que tu ne relances pas → action = "end".
7. Le "message" :
   - Pour "follow_up" : UNE seule question courte de relance (max 2 phrases) qui creuse un point précis de sa réponse. Pas de "Merci".
   - Pour "next" : courte transition (max 2 phrases). Si la question suivante est AUDIO ou VIDÉO, dis seulement « Écoutez la question suivante » ou « Regardez la question suivante ». Si elle est en TEXTE, pose-la directement.
   - Pour "end" : remerciement bref (1 phrase) indiquant la fin de l'session.
8. Toujours en français, professionnel et chaleureux.
9. N'invente JAMAIS de question hors de la liste fournie.

Réponds UNIQUEMENT avec le JSON, sans texte avant ni après, sans bloc \`\`\`.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        response_format: { type: "json_object" },
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
    const raw = data.choices?.[0]?.message?.content || "";
    let parsed = fallbackParse(raw);

    // Enforce server-side rules
    if (parsed.action === "follow_up" && !canFollowUp) {
      parsed = { action: isLastQuestion ? "end" : "next", message: parsed.message };
    }
    if (parsed.action === "next" && isLastQuestion) {
      parsed = { action: "end", message: parsed.message };
    }
    if (parsed.action === "end" && !isLastQuestion) {
      parsed = { action: "next", message: parsed.message };
    }

    return new Response(
      JSON.stringify({
        action: parsed.action,
        message: parsed.message,
        // Backward compat with older client code
        message_legacy: parsed.message,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("ai-conversation-turn error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
