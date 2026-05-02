import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_VOICES = new Set([
  "Kore", "Charon", "Aoede", "Puck", "Leda", "Orus", "Fenrir", "Zephyr",
  "Achernar", "Algenib", "Algieba", "Alnilam", "Autonoe", "Callirrhoe",
  "Despina", "Enceladus", "Erinome", "Gacrux", "Iapetus", "Laomedeia",
  "Pulcherrima", "Rasalgethi", "Sadachbia", "Sadaltager", "Schedar",
  "Sulafat", "Umbriel", "Vindemiatrix", "Zubenelgenubi",
]);
const DEFAULT_VOICE = "Kore";
const MODEL = "gemini-2.5-flash-preview-tts";

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pcmToWav(pcm: Uint8Array, sampleRate = 24000): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcm.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  const out = new Uint8Array(buffer);
  out.set(pcm, 44);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const voiceName = ALLOWED_VOICES.has(requestedVoice) ? requestedVoice : DEFAULT_VOICE;

    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "empty_text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (text.length > 5000) {
      return new Response(JSON.stringify({ error: "text_too_long" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      console.error("[tts-gemini-direct] GEMINI_API_KEY missing");
      return new Response(JSON.stringify({ error: "no_api_key", hint: "Add GEMINI_API_KEY in Cloud secrets" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const promptedText = `Lis ce texte en français avec un ton professionnel, posé et bienveillant, comme un recruteur RH expérimenté : ${text}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptedText }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => "");
      console.error("[tts-gemini-direct] Google API error", geminiRes.status, errText.slice(0, 500));
      return new Response(
        JSON.stringify({ error: "google_api_error", status: geminiRes.status, detail: errText.slice(0, 300) }),
        {
          status: geminiRes.status === 429 ? 429 : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const json = await geminiRes.json();
    const audioB64: string | undefined =
      json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    const mimeType: string =
      json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType ?? "audio/L16;rate=24000";

    if (!audioB64 || typeof audioB64 !== "string") {
      console.error("[tts-gemini-direct] no audio in response", JSON.stringify(json).slice(0, 500));
      return new Response(JSON.stringify({ error: "no_audio_in_response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rateMatch = mimeType.match(/rate=(\d+)/);
    const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
    const pcm = base64ToBytes(audioB64);
    const wav = pcmToWav(pcm, sampleRate);

    return new Response(wav, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/wav",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[tts-gemini-direct] uncaught", err);
    return new Response(
      JSON.stringify({ error: "exception", message: err instanceof Error ? err.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
