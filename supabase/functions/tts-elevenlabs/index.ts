import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_VOICE_ID = "XB0fDUnXU5powFXDhCwa"; // Charlotte FR

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { text, projectId, voiceId: rawVoiceId, preview } = body ?? {};

    if (!text || typeof text !== "string" || !text.trim()) {
      return new Response(JSON.stringify({ skip: true, reason: "empty_text" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let voiceId: string = DEFAULT_VOICE_ID;

    if (preview === true) {
      // Preview mode: requires authenticated user, uses voiceId from body, bypasses project check
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ skip: true, reason: "preview_unauthenticated" }), {
          status: 200,
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
        return new Response(JSON.stringify({ skip: true, reason: "preview_invalid_token" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (rawVoiceId && typeof rawVoiceId === "string") {
        voiceId = rawVoiceId;
      }
    } else {
      // Normal mode: read project config
      if (!projectId || typeof projectId !== "string") {
        return new Response(JSON.stringify({ skip: true, reason: "missing_project" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { data: project, error: projErr } = await supabase
        .from("projects")
        .select("tts_provider, tts_voice_id")
        .eq("id", projectId)
        .maybeSingle();

      if (projErr || !project) {
        console.warn("[tts-elevenlabs] project not found", projectId, projErr?.message);
        return new Response(JSON.stringify({ skip: true, reason: "project_not_found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (project.tts_provider !== "elevenlabs") {
        return new Response(JSON.stringify({ skip: true, reason: "not_enabled" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      voiceId = project.tts_voice_id || DEFAULT_VOICE_ID;
    }

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      console.error("[tts-elevenlabs] ELEVENLABS_API_KEY missing");
      return new Response(JSON.stringify({ skip: true, reason: "no_api_key" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const elRes = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
            speed: 1.0,
          },
        }),
      },
    );

    if (!elRes.ok || !elRes.body) {
      const errText = await elRes.text().catch(() => "");
      console.error("[tts-elevenlabs] ElevenLabs error", elRes.status, errText.slice(0, 300));
      return new Response(JSON.stringify({ skip: true, reason: "api_error", status: elRes.status }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(elRes.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[tts-elevenlabs] uncaught", err);
    return new Response(JSON.stringify({ skip: true, reason: "exception" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
