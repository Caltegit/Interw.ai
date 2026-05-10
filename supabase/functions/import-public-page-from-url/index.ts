const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";
const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `Tu es un assistant qui transforme une annonce d'emploi extraite d'une page web en un document JSON Tiptap propre et structuré, en français.

Règles strictes :
- Réponds UNIQUEMENT avec un objet JSON Tiptap valide, sans texte autour, sans bloc markdown.
- Format : { "type": "doc", "content": [...] }
- Utilise des nœuds : "heading" (level 2 ou 3), "paragraph", "bulletList" / "listItem".
- Structure recommandée (omets une section si l'info n'existe pas) :
  1. Heading 2 "À propos de l'entreprise" + paragraphe
  2. Heading 2 "Le poste" + paragraphe
  3. Heading 2 "Missions" + bulletList
  4. Heading 2 "Profil recherché" + bulletList
  5. Heading 2 "Ce que nous offrons" + bulletList
- Reformule de façon claire et professionnelle. Pas de mention de la source. Pas d'emoji. Pas de lien.
- Le texte est en français même si la source est dans une autre langue.`;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!FIRECRAWL_API_KEY) return jsonResponse({ error: "FIRECRAWL_API_KEY non configurée" }, 500);
    if (!LOVABLE_API_KEY) return jsonResponse({ error: "LOVABLE_API_KEY non configurée" }, 500);

    const body = await req.json().catch(() => null);
    const url = body?.url;
    if (typeof url !== "string" || url.length > 2000) {
      return jsonResponse({ error: "URL invalide" }, 400);
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return jsonResponse({ error: "URL invalide" }, 400);
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return jsonResponse({ error: "URL invalide" }, 400);
    }

    // 1. Scrape via Firecrawl
    const scrapeRes = await fetch(FIRECRAWL_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    const scrapeData = await scrapeRes.json().catch(() => ({}));
    if (!scrapeRes.ok) {
      if (scrapeRes.status === 402) {
        return jsonResponse({ error: "Crédits Firecrawl épuisés" }, 402);
      }
      return jsonResponse(
        { error: `Lecture de la page impossible (${scrapeRes.status})`, details: scrapeData?.error },
        502,
      );
    }
    const markdown: string =
      scrapeData?.data?.markdown || scrapeData?.markdown || "";
    if (!markdown.trim()) {
      return jsonResponse({ error: "Aucun contenu lisible trouvé sur cette page" }, 422);
    }
    const truncated = markdown.slice(0, 15000);

    // 2. Reformat via Lovable AI Gateway
    const aiRes = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Voici le contenu brut de l'annonce :\n\n${truncated}` },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const aiData = await aiRes.json().catch(() => ({}));
    if (!aiRes.ok) {
      if (aiRes.status === 429) return jsonResponse({ error: "Trop de requêtes, réessayez plus tard" }, 429);
      if (aiRes.status === 402) return jsonResponse({ error: "Crédits IA épuisés" }, 402);
      return jsonResponse({ error: `Échec IA (${aiRes.status})` }, 502);
    }
    const raw = aiData?.choices?.[0]?.message?.content;
    if (!raw) return jsonResponse({ error: "Réponse IA vide" }, 502);

    let tiptap: unknown;
    try {
      tiptap = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return jsonResponse({ error: "Réponse IA non analysable" }, 502);
    }

    if (
      !tiptap ||
      typeof tiptap !== "object" ||
      (tiptap as { type?: string }).type !== "doc" ||
      !Array.isArray((tiptap as { content?: unknown }).content)
    ) {
      return jsonResponse({ error: "Document généré invalide" }, 502);
    }

    return jsonResponse({ tiptap });
  } catch (e) {
    console.error("import-public-page-from-url error:", e);
    return jsonResponse({ error: e instanceof Error ? e.message : "Erreur inconnue" }, 500);
  }
});
