import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Voix OpenAI TTS — sélection adaptée au français professionnel
const ALLOWED_VOICES = new Set([
  "alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse",
]);
const DEFAULT_VOICE = "nova";

// Modèles disponibles : tts-1 (rapide), tts-1-hd (qualité), gpt-4o-mini-tts (le moins cher, qualité proche)
const DEFAULT_MODEL = "gpt-4o-mini-tts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth obligatoire (super-admin uniquement)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "unauthenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.slice(7);
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: { user }, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "invalid_token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "super_admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const text: string = (body?.text ?? "").toString();
    const requestedVoice: string = (body?.voiceName ?? DEFAULT_VOICE).toString();
    const voice = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : DEFAULT_VOICE;
    const model: string = (body?.model ?? DEFAULT_MODEL).toString();

    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "empty_text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > 4096) {
      return new Response(JSON.stringify({ error: "text_too_long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      console.error("[tts-openai] OPENAI_API_KEY missing");
      return new Response(JSON.stringify({ error: "no_api_key" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pour gpt-4o-mini-tts on peut donner des instructions de ton
    const requestBody: Record<string, unknown> = {
      model,
      voice,
      input: text,
      response_format: "mp3",
    };
    if (model === "gpt-4o-mini-tts") {
      requestBody.instructions =
        "Parle en français avec un ton professionnel, posé et bienveillant, comme un recruteur RH expérimenté. Articule clairement.";
    }

    const oaRes = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!oaRes.ok) {
      const errText = await oaRes.text().catch(() => "");
      console.error("[tts-openai] OpenAI error", oaRes.status, errText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "openai_error", status: oaRes.status, detail: errText.slice(0, 300) }),
        {
          status: oaRes.status === 429 ? 429 : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(oaRes.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[tts-openai] uncaught", err);
    return new Response(
      JSON.stringify({ error: "exception", message: err instanceof Error ? err.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
