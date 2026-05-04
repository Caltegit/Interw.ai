import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
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
      return new Response(JSON.stringify({ error: "Token invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Clé ElevenLabs manquante" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const incoming = await req.formData();
    const audio = incoming.get("audio");
    const name = String(incoming.get("name") || "").trim();
    const consent = String(incoming.get("consent") || "") === "true";

    if (!(audio instanceof File)) {
      return new Response(JSON.stringify({ error: "Audio manquant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!name || name.length > 80) {
      return new Response(JSON.stringify({ error: "Nom invalide" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!consent) {
      return new Response(JSON.stringify({ error: "Consentement requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (audio.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Fichier trop volumineux (max 10 Mo)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Si l'utilisateur a déjà une voix, la supprimer d'abord chez ElevenLabs
    const { data: profile } = await admin
      .from("profiles")
      .select("cloned_voice_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.cloned_voice_id) {
      await fetch(`https://api.elevenlabs.io/v1/voices/${profile.cloned_voice_id}`, {
        method: "DELETE",
        headers: { "xi-api-key": apiKey },
      }).catch(() => {});
    }

    const elForm = new FormData();
    elForm.append("name", name);
    elForm.append("files", audio, audio.name || "sample.webm");
    elForm.append(
      "description",
      `Voix clonée par ${user.email ?? user.id} via Interw.ai`,
    );

    const elRes = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: { "xi-api-key": apiKey },
      body: elForm,
    });

    if (!elRes.ok) {
      const errText = await elRes.text().catch(() => "");
      console.error("[clone-voice] ElevenLabs error", elRes.status, errText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "Échec du clonage", detail: errText.slice(0, 300) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const elJson = await elRes.json();
    const voiceId: string | undefined = elJson?.voice_id;
    if (!voiceId) {
      return new Response(JSON.stringify({ error: "Réponse ElevenLabs invalide" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();
    const { error: updErr } = await admin
      .from("profiles")
      .update({
        cloned_voice_id: voiceId,
        cloned_voice_name: name,
        cloned_voice_created_at: now,
        cloned_voice_consent_at: now,
      })
      .eq("user_id", user.id);

    if (updErr) {
      console.error("[clone-voice] update profile error", updErr.message);
      return new Response(JSON.stringify({ error: "Échec de l'enregistrement" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ voice_id: voiceId, name }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[clone-voice] uncaught", err);
    return new Response(JSON.stringify({ error: "Erreur serveur" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
