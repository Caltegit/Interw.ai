import { MODEL_FAST, MODEL_SCORING, MODEL_FALLBACK, buildChatBody } from "../_shared/ai-models.ts";

Deno.serve(async () => {
  const key = Deno.env.get("LOVABLE_API_KEY")!;
  const base = {
    messages: [{ role: "user", content: "Note ce candidat sur la clarté." }],
    tools: [{ type: "function", function: { name: "score", description: "note", parameters: { type: "object", properties: { score: { type: "number" } }, required: ["score"], additionalProperties: false } } }],
    tool_choice: { type: "function", function: { name: "score" } },
    max_tokens: 512,
  };
  const out: Record<string, unknown> = {};
  for (const m of [...new Set([MODEL_FAST, MODEL_SCORING, MODEL_FALLBACK])]) {
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(buildChatBody(m, base)),
    });
    const t = await r.text();
    out[m] = { status: r.status, body: t.slice(0, 300) };
  }
  return Response.json(out);
});
