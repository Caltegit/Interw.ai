import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FIRECRAWL_API = "https://api.firecrawl.dev/v2";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Authentification requise." }, 401);
    }
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Session invalide." }, 401);

    const body = await req.json();
    const url: string = body?.url ?? "";
    const questionsCount = clamp(Number(body?.questionsCount ?? 10), 1, 15);
    const criteriaCount = clamp(Number(body?.criteriaCount ?? 3), 1, 6);

    if (!/^https?:\/\/.+/i.test(url)) {
      return json({ error: "URL invalide." }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY manquant." }, 500);
    if (!FIRECRAWL_API_KEY) {
      return json({ error: "Connecteur Firecrawl non configuré." }, 500);
    }

    // 1. Scrape via Firecrawl (API directe)
    const scrapeRes = await fetch(`${FIRECRAWL_API}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: true,
      }),
    });

    if (!scrapeRes.ok) {
      const txt = await scrapeRes.text();
      console.error("Firecrawl error:", scrapeRes.status, txt);
      return json(
        { error: "Impossible de lire la page de l'offre. Vérifiez le lien." },
        502,
      );
    }
    const scrapeData = await scrapeRes.json();
    const markdown: string =
      scrapeData?.data?.markdown ?? scrapeData?.markdown ?? "";

    if (!markdown || markdown.trim().length < 100) {
      return json(
        { error: "Le contenu de la page n'a pas pu être extrait." },
        422,
      );
    }

    // Tronquer pour rester dans les limites de contexte
    const offerContent = markdown.slice(0, 12000);

    // 2. Génération via Lovable AI (tool calling)
    const systemPrompt = `Tu es un expert en recrutement et en conduite d'entretiens en français.
À partir d'une offre d'emploi réelle, tu génères un entretien de pré-sélection sur-mesure.

Règles strictes :
- TOUTES les questions sont des questions ouvertes, comportementales ou de mise en situation.
- Les questions sont SPÉCIFIQUES à l'offre fournie : missions citées, compétences demandées, secteur, environnement de travail.
- Pas de questions génériques type "parlez-moi de vous" ou "quelles sont vos qualités".
- Les critères d'évaluation sont calibrés sur les compétences clés de l'offre.
- Somme des poids des critères = exactement 100.
- Tout en français.`;

    const userPrompt = `Voici une offre d'emploi extraite d'une page web :

---
${offerContent}
---

Génère :
- un titre court pour le projet d'entretien (intitulé de poste + entreprise si trouvée)
- exactement ${questionsCount} questions personnalisées
- exactement ${criteriaCount} critères d'évaluation pondérés (somme = 100)`;

    const aiRes = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "build_interview_draft",
                description: "Construit le brouillon de session d'entretien.",
                parameters: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    questions: {
                      type: "array",
                      minItems: questionsCount,
                      maxItems: questionsCount,
                      items: {
                        type: "object",
                        properties: {
                          title: { type: "string", description: "Titre court (3-5 mots)" },
                          content: { type: "string", description: "La question complète" },
                        },
                        required: ["title", "content"],
                        additionalProperties: false,
                      },
                    },
                    criteria: {
                      type: "array",
                      minItems: criteriaCount,
                      maxItems: criteriaCount,
                      items: {
                        type: "object",
                        properties: {
                          label: { type: "string" },
                          description: { type: "string" },
                          weight: { type: "number" },
                        },
                        required: ["label", "description", "weight"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["title", "questions", "criteria"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: {
            type: "function",
            function: { name: "build_interview_draft" },
          },
        }),
      },
    );

    if (aiRes.status === 429) {
      return json(
        { error: "Trop de requêtes. Réessayez dans un instant." },
        429,
      );
    }
    if (aiRes.status === 402) {
      return json(
        { error: "Crédits IA épuisés. Ajoutez du crédit dans les paramètres." },
        402,
      );
    }
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      console.error("AI error:", aiRes.status, txt);
      return json({ error: "Erreur de génération IA." }, 502);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return json({ error: "Réponse IA invalide." }, 502);
    }

    let draft: { title: string; questions: any[]; criteria: any[] };
    try {
      draft = JSON.parse(toolCall.function.arguments);
    } catch {
      return json({ error: "Format IA invalide." }, 502);
    }

    // Normalisation des poids (sécurité : somme = 100)
    const totalWeight = draft.criteria.reduce(
      (s, c) => s + (Number(c.weight) || 0),
      0,
    );
    if (totalWeight > 0 && Math.abs(totalWeight - 100) > 1) {
      draft.criteria = draft.criteria.map((c) => ({
        ...c,
        weight: Math.round((Number(c.weight) / totalWeight) * 100),
      }));
    }

    return json(draft, 200);
  } catch (err: any) {
    console.error("import-job-offer error:", err);
    return json({ error: err?.message ?? "Erreur inconnue." }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.min(max, Math.max(min, n));
}
